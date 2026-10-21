import { AsyncLocalStorage } from 'node:async_hooks';
import { openStore } from './database.mjs';

export function openSqliteStore(options) {
  const raw = openStore(options);
  const context = new AsyncLocalStorage();
  let queue = Promise.resolve();
  function run(fn) {
    if (context.getStore()) return Promise.resolve().then(fn);
    const next = queue.then(fn); queue = next.catch(() => {}); return next;
  }
  const store = { engine: 'sqlite', path: raw.path };
  for (const key of ['get', 'list', 'put', 'remove', 'audit', 'ensureCatalog']) store[key] = (...args) => run(() => raw[key](...args));
  store.transaction = fn => {
    if (context.getStore()) return fn();
    return run(async () => {
      raw.db.exec('BEGIN IMMEDIATE');
      try { const result = await context.run(true, fn); raw.db.exec('COMMIT'); return result; }
      catch (error) { raw.db.exec('ROLLBACK'); throw error; }
    });
  };
  store.findIdentity = email => run(() => raw.db.prepare('SELECT user_id FROM identities WHERE email=?').get(email));
  store.addIdentity = (email, userId) => run(() => raw.db.prepare('INSERT INTO identities VALUES(?,?)').run(email, userId));
  store.getIdempotency = (owner, key) => run(() => raw.db.prepare('SELECT * FROM idempotency WHERE owner=? AND key=?').get(owner, key));
  store.putIdempotency = (owner, key, fingerprint, orderId) => run(() => raw.db.prepare('INSERT INTO idempotency VALUES(?,?,?,?)').run(owner, key, fingerprint, orderId));
  store.listDesignMetadata = (owner, limit, offset) => run(() => raw.db.prepare(`SELECT id,
    json_extract(data,'$.userId') AS userId, json_extract(data,'$.createdAt') AS createdAt,
    json_extract(data,'$.project.name') AS name, json_extract(data,'$.project.productId') AS productId,
    json_extract(data,'$.project.color') AS color, json_extract(data,'$.project.size') AS size
    FROM records WHERE kind='design' AND owner=? ORDER BY rowid DESC LIMIT ? OFFSET ?`).all(owner, limit, offset));
  store.close = () => run(() => raw.db.close());
  return store;
}
