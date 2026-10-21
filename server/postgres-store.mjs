import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import { id } from './common.mjs';

export const migrationSql = () => readFile(new URL('../database/migrations/001-store.sql', import.meta.url), 'utf8');
const record = (kind, data) => kind === 'product' ? { ...data, version: data.version ?? 1 } : data;
export async function openPostgresStore({ pool, catalogPath }) {
  const context = new AsyncLocalStorage();
  const query = (sql, args) => (context.getStore() ?? pool).query(sql, args);
  const store = {
    engine: 'postgres',
    async get(kind, recordId) { const { rows } = await query('SELECT data FROM nep_store.records WHERE kind=$1 AND id=$2', [kind, recordId]); return rows[0] ? record(kind, rows[0].data) : null; },
    async list(kind, owner) {
      const { rows } = await query(`SELECT data FROM nep_store.records WHERE kind=$1${owner === undefined ? '' : ' AND owner=$2'} ORDER BY sequence`, owner === undefined ? [kind] : [kind, owner]);
      return rows.map(row => record(kind, row.data));
    },
    async put(kind, value, owner = '') { await query('INSERT INTO nep_store.records(kind,id,owner,data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,data=excluded.data', [kind, value.id, owner, JSON.stringify(value)]); },
    async remove(kind, recordId) { await query('DELETE FROM nep_store.records WHERE kind=$1 AND id=$2', [kind, recordId]); },
    async transaction(fn) {
      if (context.getStore()) return fn();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lock = await client.query('SELECT id FROM nep_store.write_lock WHERE id=1 FOR UPDATE');
        if (lock.rows.length !== 1) throw new Error('Database write lock is missing.');
        const result = await context.run(client, fn);
        await client.query('COMMIT'); return result;
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
      finally { client.release(); }
    },
    async audit(actor, action, target) { await store.put('audit', { id: id(), actorId: actor.id, action, target, createdAt: new Date().toISOString() }); },
    async findIdentity(email) { const { rows } = await query('SELECT user_id FROM nep_store.identities WHERE email=$1', [email]); return rows[0]; },
    async addIdentity(email, userId) { await query('INSERT INTO nep_store.identities(email,user_id) VALUES($1,$2)', [email, userId]); },
    async getIdempotency(owner, key) { const { rows } = await query('SELECT * FROM nep_store.idempotency WHERE owner=$1 AND key=$2', [owner, key]); return rows[0]; },
    async putIdempotency(owner, key, fingerprint, orderId) { await query('INSERT INTO nep_store.idempotency(owner,key,fingerprint,order_id) VALUES($1,$2,$3,$4)', [owner, key, fingerprint, orderId]); },
    async listDesignMetadata(owner, limit, offset) {
      const { rows } = await query(`SELECT id,data->>'userId' AS "userId",data->>'createdAt' AS "createdAt",
        data#>>'{project,name}' AS name,data#>>'{project,productId}' AS "productId",
        data#>>'{project,color}' AS color,data#>>'{project,size}' AS size
        FROM nep_store.records WHERE kind='design' AND owner=$1 ORDER BY sequence DESC LIMIT $2 OFFSET $3`, [owner, limit, offset]);
      return rows;
    },
    // Hosted catalog is seeded explicitly by db:init, never as a side effect of public requests.
    async ensureCatalog() {},
    async close() { await pool.end(); },
  };
  const { rows } = await query('SELECT version FROM nep_store.migrations ORDER BY version DESC LIMIT 1');
  if (rows[0]?.version !== 1 || !await store.get('settings', 'store')) throw new Error('Database is not initialized. Run npm run db:init first.');
  store.catalogPath = catalogPath;
  return store;
}
