import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { embeddedPostgres } from './postgres-test-pool.mjs';
import { initializePostgres, createAdministrator, snapshotPostgres } from '../../server/postgres-maintenance.mjs';
import { openPostgresStore } from '../../server/postgres-store.mjs';
import { startServer } from '../../server/index.mjs';
import { quoteCoupon, redeemCoupon, releaseCoupon } from '../../server/promotions.mjs';
import { product, cart, address, register } from './test-helpers.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-pg-eligibility-'));
  const databasePath = join(directory, 'database'), catalogPath = join(directory, 'catalog.json');
  await writeFile(catalogPath, JSON.stringify([{ ...product, stock: 20, variants: product.variants.map(value => ({ ...value, stock: 20 })) }]));
  let pool = await embeddedPostgres(databasePath), server;
  const start = async () => { server = await startServer({ pool, host: '127.0.0.1', port: 0, mailEnv: {} }); };
  const stop = async () => { if (server?.listening) { server.close(); await once(server, 'close'); await server.closed; } else await pool.end(); };
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  await initializePostgres(pool, { catalogPath });
  await createAdministrator(await openPostgresStore({ pool }), { email: 'owner@eligibility.test', password: 'OwnerEligibility@2026!' });
  await start();
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
  assert.equal((await admin('/api/auth/login', 'POST', { email: 'owner@eligibility.test', password: 'OwnerEligibility@2026!' })).status, 200);
  assert.equal((await register(buyer, 'pg-eligibility@example.test')).status, 200);
  return { admin, buyer, pool: () => pool, store: () => server.store, restart: async () => { await stop(); pool = await embeddedPostgres(databasePath); await start(); } };
}
async function coupon(admin, values = {}) {
  const result = await admin('/api/admin/promotions', 'POST', { code: 'PG-FIRST', label: 'Đơn đầu ba áo', type: 'percent', value: 10, firstOrderOnly: true, minQuantity: 3, ...values });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data;
}
async function quote(buyer, code) {
  const result = await buyer('/api/checkout/quote', 'POST', { couponCode: code });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data.quote;
}
const body = (code, expectedQuote, key) => ({ couponCode: code, expectedQuote, idempotencyKey: key, address, paymentMethod: 'cod' });

test('PostgreSQL first-purchase combo snapshots, stale rollback, restart and cancellation preserve eligibility', async t => {
  const app = await fixture(t), { buyer, admin } = app;
  const promotion = await coupon(admin, { usageLimit: 1 });
  await buyer('/api/cart', 'POST', cart(3));
  const preview = await quote(buyer, promotion.code);
  assert.deepEqual([preview.coupon.firstOrderOnly, preview.coupon.minQuantity, preview.items[0].quantity], [true, 3, 3]);
  const itemId = (await buyer('/api/bootstrap')).data.cart[0].id;
  await buyer(`/api/cart/${itemId}`, 'PATCH', { quantity: 2 });
  const before = await snapshotPostgres(app.pool());
  const rejected = await buyer('/api/orders', 'POST', { ...body(promotion.code, preview, 'stale-pg-quantity'), quantity: 3, firstOrderOnly: false });
  assert.deepEqual([rejected.status, rejected.data.code], [409, 'COUPON_MIN_QUANTITY']);
  const after = await snapshotPostgres(app.pool());
  assert.deepEqual(after.records, before.records); assert.deepEqual(after.idempotency, before.idempotency);
  await buyer(`/api/cart/${itemId}`, 'PATCH', { quantity: 3 });
  const payload = body(promotion.code, preview, 'pg-combo-first');
  const accepted = await buyer('/api/orders', 'POST', payload);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const order = accepted.data.order;
  assert.deepEqual(order.coupon, preview.coupon);
  assert.equal((await buyer('/api/orders', 'POST', payload)).data.order.id, order.id);
  assert.equal((await admin(`/api/admin/promotions/${promotion.id}`, 'PATCH', { expectedVersion: 1, code: 'PG-RENAMED', firstOrderOnly: false, minQuantity: 1 })).status, 200);
  await app.restart();
  assert.deepEqual((await buyer(`/api/orders/${order.id}`)).data.order, order);
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await admin(`/api/admin/orders/${order.id}`, 'PATCH', { status: 'cancelled', expectedVersion: attempt + 1 })).status, 200);
  assert.equal((await app.store().get('product', product.id)).stock, 20);
  assert.equal((await app.store().list('coupon-use')).filter(value => !value.releasedAt).length, 0);
  const restricted = await coupon(admin, { code: 'PG-NEW-FIRST', minQuantity: 1 });
  await buyer('/api/cart', 'POST', cart(1));
  const fresh = await quote(buyer, restricted.code);
  const regular = await buyer('/api/orders', 'POST', body(undefined, await quote(buyer), 'pg-normal-first'));
  assert.equal(regular.status, 200);
  await buyer('/api/cart', 'POST', cart(1));
  const invalidated = await buyer('/api/orders', 'POST', body(restricted.code, fresh, 'pg-first-after-normal'));
  assert.deepEqual([invalidated.status, invalidated.data.code], [409, 'COUPON_FIRST_ORDER_ONLY']);
});

test('PostgreSQL write lock serializes different first-only codes and ordinary first orders for one customer', async t => {
  const app = await fixture(t), { buyer, admin } = app, store = app.store();
  const first = await coupon(admin), other = await coupon(admin, { code: 'PG-OTHER-FIRST' });
  const userId = (await buyer('/api/bootstrap')).data.user.id;
  const attempt = (promotion, orderId) => store.transaction(async () => {
    const { coupon: snapshot } = await quoteCoupon(store, promotion.code, userId, 750_000, new Date(), 3);
    await redeemCoupon(store, snapshot, userId, orderId);
    const order = { id: orderId, userId, status: 'pending', paymentStatus: 'unpaid', coupon: snapshot };
    await store.put('order', order, userId);
    return order;
  });
  // Separate order records keep this test independent of the HTTP cart clear.
  const results = await Promise.allSettled([attempt(first, 'first-one'), attempt(other, 'first-two')]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  assert.equal(results.find(value => value.status === 'rejected').reason.code, 'COUPON_FIRST_ORDER_ONLY');
  assert.equal((await store.list('order', userId)).length, 1);
  assert.equal((await store.list('coupon-use', userId)).length, 1);
  const winner = results.find(value => value.status === 'fulfilled').value;
  await store.transaction(async () => { await releaseCoupon(store, winner); await store.put('order', { ...winner, status: 'cancelled' }, userId); });
  const normalFirst = store.transaction(() => store.put('order', { id: 'normal-first', userId, status: 'pending', paymentStatus: 'unpaid' }, userId));
  const race = await Promise.allSettled([normalFirst, attempt(other, 'after-normal')]);
  assert.equal(race[0].status, 'fulfilled');
  assert.equal(race[1].reason.code, 'COUPON_FIRST_ORDER_ONLY');
  assert.equal(await store.get('order', 'after-normal'), null);
  assert.equal(await store.get('coupon-use', 'after-normal'), null);
});
