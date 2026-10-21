import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { openSqliteStore } from './sqlite-store.mjs';
import { openPostgresStore } from './postgres-store.mjs';

export function postgresPool(connectionString, env = process.env) {
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  // Keep certificate verification enabled, including when a provider URL includes sslmode=require.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const ssl = local && env.PG_TLS !== 'true' ? false : { rejectUnauthorized: true, ...(env.PG_CA_FILE ? { ca: readFileSync(env.PG_CA_FILE, 'utf8') } : {}) };
  const pool = new Pool({ connectionString: url.toString(), ssl, max: 4, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000 });
  pool.on('error', () => console.error('Idle database connection failed.'));
  return pool;
}
export async function openDatabase(options) {
  if (options.pool || options.databaseUrl) {
    const pool = options.pool ?? postgresPool(options.databaseUrl);
    try { return await openPostgresStore({ pool, catalogPath: options.catalogPath }); }
    catch (error) { if (!options.pool) await pool.end(); throw error; }
  }
  if (options.production) throw new Error('Hosted mode requires DATABASE_URL; SQLite is local only.');
  return openSqliteStore(options);
}
