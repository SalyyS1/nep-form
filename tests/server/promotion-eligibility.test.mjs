import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from '../../server/index.mjs';
import { product, cart, address, register, adminLogin } from './test-helpers.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-eligibility-'));
  const dbPath = join(directory, 'test.sqlite'), catalogPath = join(directory, 'catalog.json');
  await writeFile(catalogPath, JSON.stringify([product, { ...product, id: 'blank', slug: 'blank', isCustomBase: true }]));
  let server;
  const start = async () => { server = await startServer({ dbPath, catalogPath, host: '127.0.0.1', port: 0, mailEnv: {} }); };
  const stop = async () => { server.close(); await once(server, 'close'); await server.closed; };
  await start();
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  const client = () => {
    let cookie = '';
    return async (path, method = 'GET', body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return { status: response.status, data: await response.json() };
    };
  };
  const admin = client(), buyer = client();
  assert.equal((await adminLogin(admin)).status, 200);
  assert.equal((await register(buyer, 'eligibility@example.test')).status, 200);
  return {
    admin, buyer, store: () => server.store,
    restart: async () => { await stop(); await start(); },
    snapshot: () => {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      try { return { records: db.prepare('SELECT * FROM records ORDER BY kind,id').all(), idempotency: db.prepare('SELECT * FROM idempotency ORDER BY owner,key').all() }; }
      finally { db.close(); }
    },
  };
}
async function coupon(admin, values = {}) {
  const result = await admin('/api/admin/promotions', 'POST', { code: 'FIRST3', label: 'Đơn đầu ba áo', type: 'percent', value: 10, firstOrderOnly: true, minQuantity: 3, ...values });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data;
}
async function quote(buyer, code) {
  const result = await buyer('/api/checkout/quote', 'POST', { couponCode: code });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data.quote;
}
const orderBody = (code, expectedQuote, key) => ({ couponCode: code, expectedQuote, idempotencyKey: key, address, paymentMethod: 'cod' });
const used = async (admin, id) => (await admin('/api/admin/promotions')).data.promotions.find(value => value.id === id).usedCount;

test('SQLite quantity uses server cart units, ignores forged eligibility and rolls stale checkout back', async t => {
  const app = await fixture(t), { buyer, admin } = app;
  const promotion = await coupon(admin, { usageLimit: 1 });
  for (const fields of [{ firstOrderOnly: 'true' }, { minQuantity: '3' }, { minQuantity: 0 }, { minQuantity: 10_001 }]) {
    assert.equal((await admin(`/api/admin/promotions/${promotion.id}`, 'PATCH', { expectedVersion: 1, ...fields })).status, 400);
  }
  await buyer('/api/cart', 'POST', cart(2));
  const forged = await buyer('/api/checkout/quote', 'POST', { couponCode: promotion.code, quantity: 3, minQuantity: 1, firstOrderOnly: false });
  assert.deepEqual([forged.status, forged.data.code], [409, 'COUPON_MIN_QUANTITY']);
  const itemId = (await buyer('/api/bootstrap')).data.cart[0].id;
  await buyer(`/api/cart/${itemId}`, 'PATCH', { quantity: 3 });
  const displayed = await quote(buyer, promotion.code);
  assert.equal(displayed.items.length, 1);
  assert.equal(displayed.items[0].quantity, 3);
  assert.deepEqual([displayed.coupon.firstOrderOnly, displayed.coupon.minQuantity], [true, 3]);
  await quote(buyer, promotion.code);
  assert.equal(await used(admin, promotion.id), 0);
  await buyer(`/api/cart/${itemId}`, 'PATCH', { quantity: 2 });
  const before = app.snapshot();
  const rejected = await buyer('/api/orders', 'POST', { ...orderBody(promotion.code, displayed, 'stale-quantity'), quantity: 3, minQuantity: 1, firstOrderOnly: false });
  assert.deepEqual([rejected.status, rejected.data.code], [409, 'COUPON_MIN_QUANTITY']);
  assert.deepEqual(app.snapshot(), before);
  await buyer(`/api/cart/${itemId}`, 'PATCH', { quantity: 3 });
  const payload = orderBody(promotion.code, displayed, 'three-shirts');
  const accepted = await buyer('/api/orders', 'POST', payload);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.deepEqual(accepted.data.order.coupon, displayed.coupon);
  assert.equal((await buyer('/api/orders', 'POST', payload)).data.order.id, accepted.data.order.id);
  assert.equal(await used(admin, promotion.id), 1);
});

test('SQLite normal unpaid first order invalidates first-only preview; cancellation restores it once', async t => {
  const app = await fixture(t), { buyer, admin } = app;
  const promotion = await coupon(admin, { minQuantity: 1, usageLimit: 1 });
  await buyer('/api/cart', 'POST', cart(1));
  const preview = await quote(buyer, promotion.code);
  const regular = await buyer('/api/orders', 'POST', orderBody(undefined, await quote(buyer), 'normal-first'));
  assert.equal(regular.status, 200);
  assert.deepEqual([regular.data.order.status, regular.data.order.paymentStatus], ['pending', 'unpaid']);
  await buyer('/api/cart', 'POST', cart(1));
  const before = app.snapshot();
  const blocked = await buyer('/api/orders', 'POST', { ...orderBody(promotion.code, preview, 'first-after-normal'), firstOrderOnly: false });
  assert.deepEqual([blocked.status, blocked.data.code], [409, 'COUPON_FIRST_ORDER_ONLY']);
  assert.deepEqual(app.snapshot(), before);
  await buyer(`/api/orders/${regular.data.order.id}/cancel`, 'POST', {});
  const accepted = await buyer('/api/orders', 'POST', orderBody(promotion.code, await quote(buyer, promotion.code), 'first-after-cancel'));
  assert.equal(accepted.status, 200);
  const snapshot = accepted.data.order;
  const renamed = await admin(`/api/admin/promotions/${promotion.id}`, 'PATCH', { expectedVersion: 1, code: 'RENAMED', label: 'Tên mới', firstOrderOnly: false, minQuantity: 2 });
  assert.equal(renamed.status, 200);
  await app.restart();
  assert.deepEqual((await buyer(`/api/orders/${snapshot.id}`)).data.order, snapshot);
  const persisted = (await admin('/api/admin/promotions')).data.promotions[0];
  assert.deepEqual([persisted.firstOrderOnly, persisted.minQuantity], [false, 2]);
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await buyer(`/api/orders/${snapshot.id}/cancel`, 'POST', {})).status, 200);
  assert.equal(await used(admin, promotion.id), 0);
  assert.equal((await app.store().get('product', product.id)).stock, 3);
});

test('SQLite custom units count toward quantity, and first-only different-code requests cannot both commit', async t => {
  const app = await fixture(t), { buyer, admin } = app;
  const promotion = await coupon(admin), other = await coupon(admin, { code: 'OTHER-FIRST' });
  const project = {
    version: 1, name: 'Áo đầu tiên', productId: 'blank', color: 'Trắng', size: 'M',
    faces: { front: { area: 'medium', layers: [{ id: 'text', kind: 'text', x: 40, y: 50, width: 220, height: 60, rotation: 0, opacity: 1, fill: '#20201e', text: 'Nếp', fontFamily: 'Be Vietnam Pro', fontWeight: 600 }] }, back: { area: 'small', layers: [] } },
  };
  assert.equal((await buyer('/api/custom/cart', 'POST', { project, quantity: 2 })).status, 200);
  await buyer('/api/cart', 'POST', cart(1));
  const previews = await Promise.all([quote(buyer, promotion.code), quote(buyer, other.code)]);
  assert.deepEqual(previews[0].items.map(item => item.quantity).sort(), [1, 2]);
  const results = await Promise.all([promotion, other].map((value, index) => buyer('/api/orders', 'POST', orderBody(value.code, previews[index], `race-first-${index}`))));
  assert.deepEqual(results.map(value => value.status).sort(), [200, 409]);
  assert.equal((await app.store().list('order')).length, 1);
  assert.equal((await app.store().list('coupon-use')).length, 1);
  await buyer('/api/cart', 'POST', cart(1));
  const invalid = await buyer('/api/checkout/quote', 'POST', { couponCode: other.code, firstOrderOnly: false, quantity: 3 });
  // The real cart is checked even when the client claims three units.
  assert.deepEqual([invalid.status, invalid.data.code], [409, 'COUPON_MIN_QUANTITY']);
});
