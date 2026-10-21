import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { id, hashPassword } from './common.mjs';

const defaults = { shopName: 'NẾP FORM', shippingFee: 30000, contactEmail: 'hello@nepform.local', checkoutEnabled: true, bankEnabled: true };
function parseRecord(kind, data) {
  const record = JSON.parse(data);
  return kind === 'product' ? { ...record, version: record.version ?? 1 } : record;
}

export function openStore({ dbPath, catalogPath }) {
  const path = dbPath === ':memory:' ? dbPath : resolve(dbPath);
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const existed = path !== ':memory:' && existsSync(path);
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (existed && version !== 1) {
    db.close();
    copyFileSync(path, `${path}.backup-${Date.now()}`);
    throw new Error('Existing database schema is unsupported. A backup was made; no migration or overwrite performed.');
  }
  if (!existed) {
    db.exec(`
      CREATE TABLE records (kind TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', data TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE INDEX records_owner ON records(kind,owner);
      CREATE TABLE identities (email TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL);
      CREATE TABLE idempotency (owner TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, order_id TEXT NOT NULL, PRIMARY KEY(owner,key));
      PRAGMA user_version=1;
    `);
  }
  const getStmt = db.prepare('SELECT data FROM records WHERE kind=? AND id=?');
  const listStmt = db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid');
  const ownStmt = db.prepare('SELECT data FROM records WHERE kind=? AND owner=? ORDER BY rowid');
  const putStmt = db.prepare('INSERT INTO records(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,data=excluded.data');
  const store = {
    db, path, get: (kind, recordId) => { const row = getStmt.get(kind, recordId); return row ? parseRecord(kind, row.data) : null; },
    list: (kind, owner) => (owner === undefined ? listStmt.all(kind) : ownStmt.all(kind, owner)).map(row => parseRecord(kind, row.data)),
    put: (kind, record, owner = '') => putStmt.run(kind, record.id, owner, JSON.stringify(record)),
    remove: (kind, recordId) => db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, recordId),
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try { const value = fn(); db.exec('COMMIT'); return value; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    audit(actor, action, target) { const record = { id: id(), actorId: actor.id, action, target, createdAt: new Date().toISOString() }; store.put('audit', record); },
    ensureCatalog() {
      if (!existsSync(catalogPath)) return;
      const initialSeed = !store.get('meta', 'catalog-seeded');
      const customSeed = !store.get('meta', 'custom-catalog-seeded');
      if (!initialSeed && !customSeed) return;
      const products = JSON.parse(readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
      if (!Array.isArray(products) || !products.length) return;
      if (path !== ':memory:') copyFileSync(path, `${path}.backup-before-catalog-${Date.now()}`);
      store.transaction(() => {
        for (const product of products) {
          if (!initialSeed && !product.isCustomBase) continue;
          if (!product.id || !Array.isArray(product.variants)) throw new Error('Invalid catalog seed.');
          if (store.get('product', product.id)) continue;
          store.put('product', { ...product, version: 1, stock: product.variants.reduce((sum, item) => sum + item.stock, 0) });
        }
        store.put('meta', { id: 'catalog-seeded' });
        store.put('meta', { id: 'custom-catalog-seeded' });
      });
    },
  };
  if (!existed) store.transaction(() => {
    store.put('settings', { id: 'store', ...defaults });
    for (const [name, email, role] of [['Chủ shop', 'admin@nepform.local', 'admin'], ['Khách demo', 'khach@nepform.local', 'customer']]) {
      const user = { id: id(), name, email, role, passwordHash: hashPassword('Nepform@2026!') };
      store.put('user', user);
      db.prepare('INSERT INTO identities VALUES(?,?)').run(email, user.id);
    }
  });
  try { store.ensureCatalog(); } catch (error) { db.close(); throw error; }
  return store;
}

export async function settings(store) {
  const { id: _, ...value } = await store.get('settings', 'store');
  return value;
}
