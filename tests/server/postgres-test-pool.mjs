import { PGlite } from '@electric-sql/pglite';

// PGlite runs the actual PostgreSQL engine, with one connection. This lease adapter
// exposes the same query/connect interface used by pg.Pool without mocking SQL.
export async function embeddedPostgres(directory) {
  const db = new PGlite(directory);
  await db.waitReady;
  let queue = Promise.resolve();
  let closed = false;
  const execute = (sql, args) => args === undefined ? db.exec(sql).then(results => results.at(-1)) : db.query(sql, args);
  async function connect() {
    let release;
    const prior = queue;
    queue = new Promise(resolve => { release = resolve; });
    await prior;
    return { query: execute, release };
  }
  return {
    connect,
    async query(sql, args) { const client = await connect(); try { return await client.query(sql, args); } finally { client.release(); } },
    async end() { if (!closed) { closed = true; await queue; await db.close(); } },
  };
}
