import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openSqliteStore } from '../../server/sqlite-store.mjs';
import { checkoutPromotionsRoute } from '../../server/checkout-promotions.mjs';
import { checkoutQuote } from '../../server/checkout-quote.mjs';
import { promotionRoute, quoteCoupon } from '../../server/promotions.mjs';
import { orderRoute } from '../../server/orders.mjs';
import { product, address } from './test-helpers.mjs';

const buyer = { id: 'alice', role: 'customer', name: 'Test buyer', email: 'buyer@example.test' };
const admin = { id: 'admin', role: 'admin' };
const fields = ['code', 'label', 'type', 'value', 'minSubtotal', 'maxDiscount', 'minQuantity', 'firstOrderOnly', 'startsAt', 'endsAt', 'usageLimit', 'perUserLimit', 'eligible', 'discount', 'reasonCode', 'reason'].sort();
const errorCode = code => error => error.code === code;
async function fixture(t, price = 250_000, quantity = 2) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-discovery-'));
  const dbPath = join(directory, 'test.sqlite');
  const store = openSqliteStore({ dbPath, catalogPath: join(directory, 'missing.json') });
  t.after(async () => { await store.close(); await rm(directory, { recursive: true, force: true }); });
  await store.put('product', { ...product, price });
  await store.put('cart', { id: 'cart', productId: product.id, size: 'M', color: 'Trắng', quantity }, buyer.id);
  const create = values => promotionRoute({ store, path: '/api/admin/promotions', method: 'POST', user: admin, body: { code: 'PUBLIC', label: 'Ưu đãi', type: 'percent', value: 10, showAtCheckout: true, ...values } });
  const discover = (extra = {}) => checkoutPromotionsRoute({ store, user: buyer, path: '/api/checkout/promotions', method: 'GET', ...extra });
  const snapshot = () => {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try { return ['records', 'identities', 'idempotency'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()); }
    finally { db.close(); }
  };
  return { store, create, discover, snapshot };
}

test('discovery authenticates, hides private/legacy/inactive/expired codes and projects only customer fields without writes', async t => {
  const { store, create, discover, snapshot } = await fixture(t);
  await assert.rejects(discover({ user: null }), errorCode('UNAUTHORIZED'));
  assert.equal(await discover({ method: 'POST' }), undefined);
  const publicCode = await create({ code: 'PUBLIC' });
  const legacy = await create({ code: 'LEGACY' }); delete legacy.showAtCheckout;
  await store.put('promotion', { ...legacy, internalSecret: 'must-not-leak', usedCount: 999 });
  await create({ code: 'PRIVATE', showAtCheckout: false });
  await create({ code: 'INACTIVE', isActive: false });
  await create({ code: 'EXPIRED', endsAt: '2020-01-01T00:00:00Z' });
  const before = snapshot();
  const result = await discover({ body: { showAtCheckout: true, includePrivate: true, subtotal: 99_999_999, quantity: 100 } });
  assert.deepEqual(snapshot(), before);
  assert.deepEqual([result.subtotal, result.quantity, result.bestCode], [500_000, 2, 'PUBLIC']);
  assert.deepEqual(result.promotions.map(value => value.code), ['PUBLIC']);
  assert.deepEqual(Object.keys(result.promotions[0]).sort(), fields);
  assert.deepEqual([result.promotions[0].eligible, result.promotions[0].discount, result.promotions[0].reasonCode, result.promotions[0].reason], [true, 50_000, null, null]);
  assert.equal((await quoteCoupon(store, legacy.code, buyer.id, 500_000)).discount, 50_000);
  assert.equal((await quoteCoupon(store, 'PRIVATE', buyer.id, 500_000)).discount, 50_000);
  assert.equal((await store.get('promotion', publicCode.id)).version, 1);
  assert.deepEqual(await store.list('coupon-use'), []);
});

test('best code uses actual capped discounts, floor, subtotal limit and deterministic expiry/code tie breaks', async t => {
  const { store, create, discover } = await fixture(t);
  await create({ code: 'PERCENT90', value: 90, maxDiscount: 20_000 });
  await create({ code: 'FIXED', type: 'fixed', value: 30_000 });
  assert.equal((await discover()).bestCode, 'FIXED');
  await create({ code: 'ZZZ-EXPIRY', type: 'fixed', value: 30_000, endsAt: '2099-01-02T00:00:00Z' });
  await create({ code: 'BBB-EXPIRY', type: 'fixed', value: 30_000, endsAt: '2099-01-01T00:00:00Z' });
  await create({ code: 'AAA-EXPIRY', type: 'fixed', value: 30_000, endsAt: '2099-01-01T00:00:00Z' });
  assert.deepEqual((await discover()).promotions.map(value => value.code), ['AAA-EXPIRY', 'BBB-EXPIRY', 'ZZZ-EXPIRY', 'FIXED', 'PERCENT90']);
  await create({ code: 'FULL', type: 'fixed', value: 999_999 });
  assert.deepEqual([(await discover()).bestCode, (await discover()).promotions[0].discount], ['FULL', 500_000]);
  await store.put('product', { ...product, price: 999 });
  const result = await discover();
  assert.equal(result.subtotal, 1998);
  assert.equal(result.promotions.find(value => value.code === 'PERCENT90').discount, 1798);
});

test('discovery reasons reuse all quote conditions, live quotas and pending-first-order history; cancelled/released restores eligibility', async t => {
  const { store, create, discover } = await fixture(t);
  const restricted = [
    ['SUBTOTAL', { minSubtotal: 500_001 }, 'COUPON_MIN_SUBTOTAL'],
    ['QUANTITY', { minQuantity: 3 }, 'COUPON_MIN_QUANTITY'],
    ['FIRST', { firstOrderOnly: true }, 'COUPON_FIRST_ORDER_ONLY'],
    ['GLOBAL', { usageLimit: 1 }, 'COUPON_USAGE_LIMIT'],
    ['USER', { perUserLimit: 1 }, 'COUPON_USER_LIMIT'],
    ['FUTURE', { startsAt: '2099-01-01T00:00:00Z' }, 'COUPON_NOT_STARTED'],
  ];
  for (const [code, values] of restricted) {
    const promotion = await create({ code, ...values });
    if (code === 'GLOBAL' || code === 'USER') await store.put('coupon-use', { id: code, promotionId: promotion.id, userId: code === 'GLOBAL' ? 'other' : buyer.id, releasedAt: null });
  }
  await store.put('order', { id: 'pending', status: 'pending', paymentStatus: 'unpaid' }, buyer.id);
  const result = await discover();
  assert.equal(result.bestCode, null);
  assert.deepEqual(result.promotions.map(value => value.code), restricted.map(value => value[0]).sort());
  for (const [code, , reason] of restricted) {
    const entry = result.promotions.find(value => value.code === code);
    assert.deepEqual([entry.eligible, entry.discount, entry.reasonCode], [false, 0, reason]);
    assert.ok(entry.reason.length > 0);
    await assert.rejects(quoteCoupon(store, code, buyer.id, result.subtotal, Date.now(), result.quantity), error => error.code === reason && error.message === entry.reason);
  }
  await store.put('order', { id: 'pending', status: 'cancelled' }, buyer.id);
  for (const id of ['GLOBAL', 'USER']) await store.put('coupon-use', { ...await store.get('coupon-use', id), releasedAt: new Date().toISOString() });
  const restored = await discover();
  for (const code of ['FIRST', 'GLOBAL', 'USER']) assert.equal(restored.promotions.find(value => value.code === code).eligible, true);
});

test('discovery uses current custom fees and after-sale prices, summing all regular/custom units', async t => {
  const { store, create, discover } = await fixture(t);
  await store.put('product', { ...product, salePrice: 200_000 });
  await store.put('product', { ...product, id: 'blank', isCustomBase: true, salePrice: 180_000 });
  await store.put('design', { id: 'design', userId: buyer.id, project: { productId: 'blank', name: 'Áo riêng', size: 'M', color: 'Trắng', faces: { front: { area: 'medium', layers: [{ kind: 'text' }] }, back: { area: 'small', layers: [] } } } }, buyer.id);
  await store.put('cart', { id: 'custom-cart', productId: 'blank', size: 'M', color: 'Trắng', quantity: 1, custom: { designId: 'design', unitPrice: 1 } }, buyer.id);
  await create({ minQuantity: 3 });
  const first = await discover();
  assert.deepEqual([first.subtotal, first.quantity, first.promotions[0].discount, first.promotions[0].eligible], [640_000, 3, 64_000, true]);
  await store.put('custom-pricing', { id: 'custom', version: 2, text: 40_000, shape: 55_000, image: 65_000, areas: { small: 0, medium: 30_000, large: 45_000 }, extraLayer: 8_000 });
  assert.equal((await discover()).subtotal, 650_000);
});

test('zero-discount eligible offers have no best code and stale discovered offers cannot place an order', async t => {
  const { store, create, discover, snapshot } = await fixture(t, 1, 1);
  const promotion = await create({ value: 1 });
  const zero = await discover();
  assert.deepEqual([zero.promotions[0].eligible, zero.promotions[0].discount, zero.bestCode], [true, 0, null]);
  const preview = (await checkoutQuote(store, buyer, promotion.code)).quote;
  await promotionRoute({ store, path: `/api/admin/promotions/${promotion.id}`, method: 'PATCH', user: admin, body: { expectedVersion: 1, isActive: false } });
  const before = snapshot();
  await assert.rejects(orderRoute({ store, user: buyer, path: '/api/orders', method: 'POST', body: { couponCode: promotion.code, expectedQuote: preview, address, idempotencyKey: 'stale-discovery', paymentMethod: 'cod' } }), errorCode('COUPON_INACTIVE'));
  assert.deepEqual(snapshot(), before);
  assert.deepEqual((await discover()).promotions, []);
});

test('discovery loads eligibility tables once and uses one store transaction regardless of offer count', async t => {
  const { store, create, discover } = await fixture(t);
  for (let index = 0; index < 12; index++) await create({ code: `PUBLIC-${index}` });
  const counts = new Map(); let transactions = 0;
  const instrumented = { ...store, list: (kind, ...args) => { counts.set(kind, (counts.get(kind) ?? 0) + 1); return store.list(kind, ...args); }, transaction: fn => { transactions++; return store.transaction(fn); } };
  assert.equal((await discover({ store: instrumented })).promotions.length, 12);
  assert.equal(transactions, 1);
  for (const kind of ['promotion', 'coupon-use', 'order']) assert.equal(counts.get(kind), 1);
});
