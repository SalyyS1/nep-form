import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { embeddedPostgres } from './postgres-test-pool.mjs';
import { initializePostgres, createAdministrator, snapshotPostgres, restorePostgres } from '../../server/postgres-maintenance.mjs';
import { openPostgresStore } from '../../server/postgres-store.mjs';
import { startServer } from '../../server/index.mjs';
import { product, cart, address } from './test-helpers.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-pg-discount-'));
  const databasePath = join(directory, 'database');
  const catalogPath = join(directory, 'catalog.json');
  await writeFile(catalogPath, JSON.stringify([{ ...product, salePrice: 200_000, stock: 20, variants: product.variants.map(variant => ({ ...variant, stock: 20 })) }]));
  let pool = await embeddedPostgres(databasePath), server;
  async function stop() {
    if (server?.listening) { server.close(); await once(server, 'close'); await server.closed; }
    else await pool.end();
  }
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  await initializePostgres(pool, { catalogPath });
  const initialStore = await openPostgresStore({ pool });
  await createAdministrator(initialStore, { email: 'owner@discount.test', password: 'OwnerDiscount@2026!' });
  const start = async () => { server = await startServer({ pool, host: '127.0.0.1', port: 0, mailEnv: {} }); };
  await start();
  function client() {
    let cookie = '';
    return async (path, method = 'GET', body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return { status: response.status, data: await response.json() };
    };
  }
  const admin = client(), alice = client(), bob = client();
  assert.equal((await admin('/api/auth/login', 'POST', { email: 'owner@discount.test', password: 'OwnerDiscount@2026!' })).status, 200);
  for (const [request, name] of [[alice, 'alice'], [bob, 'bob']]) assert.equal((await request('/api/auth/register', 'POST', { name, email: `${name}@discount.test`, password: 'CustomerDiscount@2026!' })).status, 200);
  return {
    admin, alice, bob, store: () => server.store, pool: () => pool,
    restart: async () => { await stop(); pool = await embeddedPostgres(databasePath); await start(); },
  };
}
async function createCoupon(admin, body) {
  const result = await admin('/api/admin/promotions', 'POST', { label: 'Ưu đãi PostgreSQL', type: 'percent', value: 10, ...body });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data;
}
async function quote(request, couponCode) {
  const result = await request('/api/checkout/quote', 'POST', { couponCode });
  assert.equal(result.status, 200, JSON.stringify(result.data)); return result.data.quote;
}
const orderBody = (couponCode, expectedQuote, idempotencyKey) => ({ couponCode, expectedQuote, idempotencyKey, address, paymentMethod: 'cod' });
async function used(admin, promotionId) {
  return (await admin('/api/admin/promotions')).data.promotions.find(promotion => promotion.id === promotionId).usedCount;
}

test('PostgreSQL discount snapshots, retries, cancellation, stale rollback, restart and backup restoration', async t => {
  const app = await fixture(t), { alice, admin } = app;
  const percent = await createCoupon(admin, { code: 'PG-PERCENT', maxDiscount: 25_000 });
  await alice('/api/cart', 'POST', cart(2));
  const firstQuote = await quote(alice, percent.code);
  assert.deepEqual([firstQuote.items[0].unitPrice, firstQuote.subtotal, firstQuote.discount, firstQuote.shipping, firstQuote.total], [200_000, 400_000, 25_000, 30_000, 405_000]);
  const firstBody = orderBody(percent.code, firstQuote, 'pg-percent-first');
  const first = await alice('/api/orders', 'POST', firstBody);
  assert.equal(first.status, 200);
  assert.deepEqual(first.data.order.coupon, firstQuote.coupon);
  assert.equal((await alice('/api/orders', 'POST', firstBody)).data.order.id, first.data.order.id);
  assert.equal(await used(admin, percent.id), 1);
  for (let index = 0; index < 2; index++) assert.equal((await alice(`/api/orders/${first.data.order.id}/cancel`, 'POST', {})).status, 200);
  assert.equal(await used(admin, percent.id), 0);
  assert.equal((await app.store().get('product', product.id)).stock, 20);

  const fixed = await createCoupon(admin, { code: 'PG-FIXED', type: 'fixed', value: 999_999 });
  await alice('/api/cart', 'POST', cart(1));
  const fixedQuote = await quote(alice, fixed.code);
  assert.deepEqual([fixedQuote.subtotal, fixedQuote.discount, fixedQuote.total], [200_000, 200_000, 30_000]);
  const second = await alice('/api/orders', 'POST', orderBody(fixed.code, fixedQuote, 'pg-fixed'));
  assert.equal(second.status, 200);
  assert.equal(await used(admin, fixed.id), 1);
  for (const expectedVersion of [1, 2]) assert.equal((await admin(`/api/admin/orders/${second.data.order.id}`, 'PATCH', { status: 'cancelled', expectedVersion })).status, 200);
  assert.equal(await used(admin, fixed.id), 0);
  assert.equal((await app.store().get('product', product.id)).stock, 20);

  await alice('/api/cart', 'POST', cart(1));
  const staleQuote = await quote(alice, percent.code);
  const currentProduct = (await admin('/api/admin')).data.products.find(item => item.id === product.id);
  assert.equal((await admin(`/api/admin/products/${product.id}`, 'PATCH', { salePrice: 180_000, expectedVersion: currentProduct.version })).status, 200);
  const before = await snapshotPostgres(app.pool());
  const stale = await alice('/api/orders', 'POST', orderBody(percent.code, staleQuote, 'pg-stale'));
  assert.deepEqual([stale.status, stale.data.code], [409, 'CART_CHANGED']);
  const after = await snapshotPostgres(app.pool());
  assert.deepEqual(after.records, before.records);
  assert.deepEqual(after.idempotency, before.idempotency);
  const freshQuote = await quote(alice, percent.code);
  const third = await alice('/api/orders', 'POST', orderBody(percent.code, freshQuote, 'pg-persist'));
  assert.equal(third.status, 200);
  assert.equal(third.data.order.total, 192_000);
  await admin(`/api/admin/promotions/${percent.id}`, 'PATCH', { expectedVersion: percent.version, code: 'PG-RENAMED', value: 50, label: 'Đã thay đổi' });
  const legacy = { ...third.data.order, id: 'legacy-before-discounts', code: 'NEP-LEGACY', status: 'delivered', subtotal: 250_000, total: 280_000, items: third.data.order.items.map(item => ({ ...item, unitPrice: 250_000 })) };
  delete legacy.coupon; delete legacy.discount;
  await app.store().transaction(() => app.store().put('order', legacy, legacy.userId));
  await app.restart();
  assert.deepEqual((await alice(`/api/orders/${third.data.order.id}`)).data.order, third.data.order);
  assert.deepEqual((await alice(`/api/orders/${legacy.id}`)).data.order, legacy);
  assert.equal(await used(admin, percent.id), 1);
  const backup = await snapshotPostgres(app.pool()), restoredPool = await embeddedPostgres();
  try {
    await restorePostgres(restoredPool, backup);
    const restored = await openPostgresStore({ pool: restoredPool });
    assert.deepEqual(await restored.get('order', third.data.order.id), third.data.order);
    assert.deepEqual(await restored.get('order', legacy.id), legacy);
    assert.equal((await restored.list('coupon-use')).filter(use => !use.releasedAt).length, 1);
    assert.deepEqual((await snapshotPostgres(restoredPool)).idempotency, backup.idempotency);
  } finally { await restoredPool.end(); }
});

test('PostgreSQL concurrent requests serialize last global and per-customer coupon uses', async t => {
  const app = await fixture(t), { alice, bob, admin } = app;
  const global = await createCoupon(admin, { code: 'PG-LAST', usageLimit: 1 });
  for (const request of [alice, bob]) await request('/api/cart', 'POST', cart(1));
  const quotes = await Promise.all([quote(alice, global.code), quote(bob, global.code)]);
  const requests = [alice, bob];
  const results = await Promise.all(requests.map((request, index) => request('/api/orders', 'POST', orderBody(global.code, quotes[index], `pg-race-${index}`))));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(results.find(result => result.status === 409).data.code, 'COUPON_USAGE_LIMIT');
  assert.equal(await used(admin, global.id), 1);
  assert.equal((await app.store().get('product', product.id)).stock, 19);
  const winningIndex = results.findIndex(result => result.status === 200), winningOrder = results[winningIndex].data.order;
  assert.equal((await requests[winningIndex]('/api/bootstrap')).data.cart.length, 0);
  assert.equal((await requests[1 - winningIndex]('/api/bootstrap')).data.cart.length, 1);
  await requests[winningIndex](`/api/orders/${winningOrder.id}/cancel`, 'POST', {});
  assert.equal(await used(admin, global.id), 0);
  const perUser = await createCoupon(admin, { code: 'PG-PER-USER', usageLimit: 3, perUserLimit: 1 });
  if (!(await alice('/api/bootstrap')).data.cart.length) await alice('/api/cart', 'POST', cart(1));
  const perUserQuote = await quote(alice, perUser.code);
  const simultaneous = await Promise.all(['one', 'two'].map(key => alice('/api/orders', 'POST', orderBody(perUser.code, perUserQuote, `pg-per-user-${key}`))));
  assert.deepEqual(simultaneous.map(result => result.status).sort(), [200, 409]);
  assert.equal(await used(admin, perUser.id), 1);
  await alice('/api/cart', 'POST', cart(1));
  const exhausted = await alice('/api/checkout/quote', 'POST', { couponCode: perUser.code });
  assert.deepEqual([exhausted.status, exhausted.data.code], [409, 'COUPON_USER_LIMIT']);
  if (!(await bob('/api/bootstrap')).data.cart.length) await bob('/api/cart', 'POST', cart(1));
  assert.equal((await quote(bob, perUser.code)).discount, 20_000);
  const aliceOrder = simultaneous.find(result => result.status === 200).data.order;
  await admin(`/api/admin/orders/${aliceOrder.id}`, 'PATCH', { status: 'cancelled', expectedVersion: 1 });
  assert.equal(await used(admin, perUser.id), 0);
  assert.equal((await quote(alice, perUser.code)).discount, 20_000);
});
