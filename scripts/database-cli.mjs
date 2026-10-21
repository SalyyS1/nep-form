import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { postgresPool } from '../server/storage.mjs';
import { openPostgresStore } from '../server/postgres-store.mjs';
import { backupPostgres, createAdministrator, initializePostgres, restorePostgres } from '../server/postgres-maintenance.mjs';

const action = process.argv[2];
let pool;
try {
  pool = postgresPool(process.env.DATABASE_URL);
  if (action === 'init') {
    const exists = (await pool.query("SELECT to_regclass('nep_store.records') AS name")).rows[0].name;
    const hasAdmin = exists && (await pool.query("SELECT id FROM nep_store.records WHERE kind='user' AND data->>'role'='admin' LIMIT 1")).rows.length > 0;
    if (!hasAdmin && (!process.env.BOOTSTRAP_ADMIN_EMAIL || !process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 12)) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (at least12 characters) privately before initializing.');
    const result = await initializePostgres(pool, { catalogPath: resolve('data/catalog.json'), contactEmail: process.env.SHOP_CONTACT_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL });
    const store = await openPostgresStore({ pool });
    const admin = hasAdmin ? { created: false } : await createAdministrator(store, { email: process.env.BOOTSTRAP_ADMIN_EMAIL, password: process.env.BOOTSTRAP_ADMIN_PASSWORD, name: process.env.BOOTSTRAP_ADMIN_NAME });
    console.log(`Database ${result.initialized ? 'initialized' : 'already initialized'}; admin ${admin.created ? 'created' : 'already exists; password unchanged'}.`);
  } else if (action === 'backup') console.log(`Private backup written: ${await backupPostgres(pool)}`);
  else if (action === 'restore') {
    if (!process.argv[3]) throw new Error('Usage: npm run db:restore -- path-to-private-backup.json (empty target only)');
    const exists = (await pool.query("SELECT to_regclass('nep_store.records') AS name")).rows[0].name;
    if (exists) await backupPostgres(pool);
    await restorePostgres(pool, JSON.parse(await readFile(resolve(process.argv[3]), 'utf8')));
    console.log('Backup restored into empty target.');
  } else if (action === 'check') {
    const store = await openPostgresStore({ pool });
    await store.get('settings', 'store'); console.log('PostgreSQL connection and schema OK.');
  } else throw new Error('Unknown database command.');
} catch (error) {
  // Provider errors may include host/credentials; never dump the connection string or error object.
  console.error(error.status ? error.message : error.code ? `Database operation failed (${error.code}). Check private connection settings.` : error.message);
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }
