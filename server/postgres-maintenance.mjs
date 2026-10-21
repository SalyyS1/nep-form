import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { migrationSql } from './postgres-store.mjs';
import { email, hashPassword, id, password, string } from './common.mjs';

export async function snapshotPostgres(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const records = (await client.query('SELECT kind,id,owner,sequence::text AS sequence,data FROM nep_store.records ORDER BY sequence')).rows;
    const identities = (await client.query('SELECT email,user_id FROM nep_store.identities ORDER BY email')).rows;
    const idempotency = (await client.query('SELECT owner,key,fingerprint,order_id FROM nep_store.idempotency ORDER BY owner,key')).rows;
    await client.query('COMMIT');
    return { format: 'nep-postgres-v1', createdAt: new Date().toISOString(), records, identities, idempotency };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function backupPostgres(pool, directory = 'work/backups') {
  const snapshot = await snapshotPostgres(pool);
  const file = resolve(directory, `postgres-${Date.now()}-${id().slice(0,8)}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot), { flag: 'wx', mode: 0o600 });
  return file;
}
export async function initializePostgres(pool, { catalogPath, contactEmail = 'hello@nepform.local', backupDirectory } = {}) {
  const exists = (await pool.query("SELECT to_regclass('nep_store.records') AS name")).rows[0].name;
  if (exists) {
    const version = (await pool.query('SELECT max(version) AS version FROM nep_store.migrations')).rows[0].version;
    if (version !== 1) throw new Error('Unsupported schema version. No migration was applied.');
    // Already initialized startup is read-only: no repeating DDL, seed or backup writes.
    if ((await pool.query("SELECT id FROM nep_store.records WHERE kind='meta' AND id='postgres-initialized'")).rows.length) return { initialized: false };
    await backupPostgres(pool, backupDirectory);
  }
  const products = catalogPath ? JSON.parse((await readFile(catalogPath, 'utf8')).replace(/^\uFEFF/, '')) : [];
  if (!Array.isArray(products)) throw new Error('Invalid catalog.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await migrationSql());
    await client.query('SELECT id FROM nep_store.write_lock WHERE id=1 FOR UPDATE');
    const put = (kind, value) => client.query('INSERT INTO nep_store.records(kind,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,id) DO NOTHING', [kind, value.id, JSON.stringify(value)]);
    await put('settings', { id: 'store', shopName: 'NẾP FORM', shippingFee: 30000, contactEmail: email(contactEmail), checkoutEnabled: true, bankEnabled: false });
    for (const product of products) {
      if (!product.id || !Array.isArray(product.variants)) throw new Error('Invalid catalog product.');
      await put('product', { ...product, version: 1, stock: product.variants.reduce((sum, v) => sum + v.stock, 0) });
    }
    await put('meta', { id: 'postgres-initialized' });
    await client.query('COMMIT'); return { initialized: true };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function createAdministrator(store, input) {
  const address = email(input.email);
  const name = string(input.name || 'Chủ cửa hàng', 'Tên', 100);
  const secret = password(input.password);
  if (secret.length < 12) throw new Error('Admin password must have at least12 characters.');
  return store.transaction(async () => {
    if ((await store.list('user')).some(user => user.role === 'admin')) return { created: false };
    if (await store.findIdentity(address)) throw new Error('Admin email already belongs to a customer. Use a separate email.');
    const user = { id: id(), name, email: address, role: 'admin', passwordHash: hashPassword(secret) };
    await store.put('user', user);
    await store.addIdentity(address, user.id);
    return { created: true };
  });
}
export async function restorePostgres(pool, snapshot) {
  if (snapshot?.format !== 'nep-postgres-v1' || ![snapshot.records, snapshot.identities, snapshot.idempotency].every(Array.isArray)) throw new Error('Invalid backup format.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await migrationSql());
    await client.query('SELECT id FROM nep_store.write_lock WHERE id=1 FOR UPDATE');
    if (Number((await client.query('SELECT count(*) AS count FROM nep_store.records')).rows[0].count)) throw new Error('Restore requires an empty target database. No records were overwritten.');
    for (const row of snapshot.records) await client.query('INSERT INTO nep_store.records(kind,id,owner,sequence,data) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5::jsonb)', [row.kind, row.id, row.owner, row.sequence, JSON.stringify(row.data)]);
    for (const row of snapshot.identities) await client.query('INSERT INTO nep_store.identities(email,user_id) VALUES($1,$2)', [row.email, row.user_id]);
    for (const row of snapshot.idempotency) await client.query('INSERT INTO nep_store.idempotency(owner,key,fingerprint,order_id) VALUES($1,$2,$3,$4)', [row.owner, row.key, row.fingerprint, row.order_id]);
    await client.query("SELECT setval(pg_get_serial_sequence('nep_store.records','sequence'),GREATEST(COALESCE(MAX(sequence),0),1),COUNT(*)>0) FROM nep_store.records");
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
