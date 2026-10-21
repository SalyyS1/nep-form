import test from 'node:test';
import assert from 'node:assert/strict';
import { openSqliteStore } from '../../server/sqlite-store.mjs';
import { promotionRoute, quoteCoupon, redeemCoupon, releaseCoupon } from '../../server/promotions.mjs';

const admin = { id: 'admin', role: 'admin' };
const date = '2026-10-20T12:00:00.000Z';
async function fixture(t, values = {}) {
  const store = openSqliteStore({ dbPath: ':memory:', catalogPath: 'missing-test-catalog.json' });
  t.after(() => store.close());
  const create = body => promotionRoute({ store, path: '/api/admin/promotions', method: 'POST', user: admin, body });
  const update = (promotion, body) => promotionRoute({ store, path: `/api/admin/promotions/${promotion.id}`, method: 'PATCH', user: admin, body: { expectedVersion: promotion.version, ...body } });
  const promotion = await create({ code: 'SAVE10', label: 'Giảm mười phần trăm', type: 'percent', value: 10, ...values });
  return { store, create, update, promotion };
}
const errorCode = code => error => error.status >= 400 && error.status < 500 && error.code === code;
const redeem = (store, coupon, userId, orderId) => store.transaction(() => redeemCoupon(store, coupon, userId, orderId, date));

test('promotion administration normalizes codes, ignores counts, authenticates, and prevents stale edits/collisions', async t => {
  const { store, promotion, create, update } = await fixture(t, { code: 'save10', usedCount: 200 });
  assert.equal(promotion.code, 'SAVE10');
  assert.equal(promotion.usedCount, 0);
  assert.equal((await store.get('promotion', promotion.id)).usedCount, undefined);
  await assert.rejects(promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: null }), errorCode('UNAUTHORIZED'));
  await assert.rejects(promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: { role: 'customer' } }), errorCode('FORBIDDEN'));
  await assert.rejects(create({ code: 'SaVe10', label: 'Trùng', type: 'fixed', value: 1000 }), errorCode('COUPON_CODE_EXISTS'));
  const changed = await update(promotion, { label: 'Tên mới', usageLimit: 3 });
  assert.equal(changed.version, 2);
  await assert.rejects(update(promotion, { isActive: false }), errorCode('PROMOTION_VERSION_CONFLICT'));
  assert.equal((await update(changed, { usageLimit: null })).usageLimit, null);
  const all = await promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: admin });
  assert.equal(all.promotions.length, 1);
  assert.equal(all.promotions[0].usedCount, 0);
});

test('concurrent code creation is serialized and validates numeric, calendar and nullable fields', async t => {
  const { create } = await fixture(t);
  const source = { code: 'NEW-CODE', label: 'Ưu đãi mới', type: 'fixed', value: 1000 };
  const results = await Promise.allSettled([create(source), create({ ...source, code: 'new-code' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'COUPON_CODE_EXISTS');
  for (const invalid of [
    { code: 'ÁOO' }, { code: 'AB' }, { type: 'percent', value: 101 }, { value: -1 }, { value: 1.5 },
    { usageLimit: 0 }, { perUserLimit: -1 }, { maxDiscount: 0 }, { minSubtotal: Number.MAX_SAFE_INTEGER },
    ...[null, 0, 'true', 1, {}, []].map(firstOrderOnly => ({ firstOrderOnly })),
    ...[null, 0, 'true', 1, {}, []].map(showAtCheckout => ({ showAtCheckout })),
    ...[null, 0, -1, 1.5, '3', true, 10_001].map(minQuantity => ({ minQuantity })),
    { startsAt: '2026-02-30T00:00:00Z' }, { startsAt: '2026-10-20T12:00' },
    { startsAt: date, endsAt: date }, { startsAt: '2026-10-21T00:00:00Z', endsAt: date },
  ]) await assert.rejects(create({ ...source, code: 'INVALID', ...invalid }), error => error.status === 400);
});

test('checkout publicity is explicit, defaults private for old and new codes and preserves omitted patches', async t => {
  const { store, promotion, update } = await fixture(t);
  assert.equal(promotion.showAtCheckout, false);
  const legacy = { ...promotion }; delete legacy.showAtCheckout;
  await store.put('promotion', legacy);
  const list = await promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: admin });
  assert.equal(list.promotions[0].showAtCheckout, false);
  assert.equal((await quoteCoupon(store, legacy.code, 'alice', 100, date)).discount, 10);
  const publicCode = await update(legacy, { showAtCheckout: true, firstOrderOnly: true, minQuantity: 2 });
  const renamed = await update(publicCode, { label: 'Tên mới' });
  assert.deepEqual([renamed.showAtCheckout, renamed.firstOrderOnly, renamed.minQuantity, renamed.version], [true, true, 2, 3]);
  await assert.rejects(update(publicCode, { showAtCheckout: false }), errorCode('PROMOTION_VERSION_CONFLICT'));
  assert.equal((await update(renamed, { showAtCheckout: false })).showAtCheckout, false);
});

test('eligibility fields default safely, preserve omitted patches and reject stale edits', async t => {
  const { store, promotion, update } = await fixture(t);
  assert.deepEqual([promotion.firstOrderOnly, promotion.minQuantity], [false, 1]);
  const legacy = { ...promotion }; delete legacy.firstOrderOnly; delete legacy.minQuantity;
  await store.put('promotion', legacy);
  const list = await promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: admin });
  assert.deepEqual([list.promotions[0].firstOrderOnly, list.promotions[0].minQuantity], [false, 1]);
  const oldQuote = await quoteCoupon(store, promotion.code, 'alice', 100, date);
  assert.deepEqual(oldQuote.coupon, { id: promotion.id, code: promotion.code, label: promotion.label, type: 'percent', value: 10, discount: 10 });
  const restricted = await update(promotion, { firstOrderOnly: true, minQuantity: 3 });
  const renamed = await update(restricted, { label: 'Đổi tên' });
  assert.deepEqual([renamed.firstOrderOnly, renamed.minQuantity], [true, 3]);
  await assert.rejects(update(restricted, { firstOrderOnly: false }), errorCode('PROMOTION_VERSION_CONFLICT'));
  await assert.rejects(redeem(store, oldQuote.coupon, 'alice', 'old-quote'), errorCode('COUPON_CHANGED'));
  await assert.rejects(quoteCoupon(store, promotion.code, 'alice', 100, date), errorCode('COUPON_MIN_QUANTITY'));
  for (const quantity of [0, 2]) await assert.rejects(quoteCoupon(store, promotion.code, 'alice', 100, date, quantity), error => error.status >= 400);
  const current = await quoteCoupon(store, promotion.code, 'alice', 100, date, 3);
  assert.deepEqual([current.coupon.firstOrderOnly, current.coupon.minQuantity], [true, 3]);
  await update(renamed, { firstOrderOnly: false, minQuantity: 1 });
  await assert.rejects(redeem(store, current.coupon, 'alice', 'changed-quote'), errorCode('COUPON_CHANGED'));
});

test('first purchase counts every noncancelled order including legacy unpaid orders', async t => {
  const { store } = await fixture(t, { firstOrderOnly: true });
  for (const status of ['pending', 'confirmed', 'packing', 'shipping', 'delivered', undefined]) {
    await store.put('order', { id: 'legacy', userId: 'alice', status, paymentStatus: 'unpaid' }, 'alice');
    await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 100, date), errorCode('COUPON_FIRST_ORDER_ONLY'));
    assert.equal((await quoteCoupon(store, 'SAVE10', 'bob', 100, date)).discount, 10);
  }
  await store.put('order', { id: 'legacy', userId: 'alice', status: 'cancelled' }, 'alice');
  const { coupon } = await quoteCoupon(store, 'SAVE10', 'alice', 100, date);
  await store.put('order', { id: 'normal-first', userId: 'alice', status: 'pending' }, 'alice');
  await assert.rejects(redeem(store, coupon, 'alice', 'stale-first'), errorCode('COUPON_FIRST_ORDER_ONLY'));
  assert.equal((await store.list('coupon-use')).length, 0);
});

test('quotes use exact integer money with minimum, fixed/percent caps and no-code compatibility', async t => {
  const { store, promotion, update } = await fixture(t, { value: 99 });
  const subtotal = Number.MAX_SAFE_INTEGER;
  assert.equal((await quoteCoupon(store, 'save10', 'alice', subtotal, date)).discount, Number(BigInt(subtotal) * 99n / 100n));
  assert.deepEqual(await quoteCoupon(store, undefined, 'alice', 0), { discount: 0 });
  await assert.rejects(quoteCoupon(store, 'MISSING', 'alice', 100, date), errorCode('COUPON_NOT_FOUND'));
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 1.5, date), error => error.status === 400);
  let changed = await update(promotion, { type: 'fixed', value: 100_000, minSubtotal: 20_000, maxDiscount: 12_345 });
  assert.equal((await quoteCoupon(store, 'SAVE10', 'alice', 20_000, date)).discount, 12_345);
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 19_999, date), errorCode('COUPON_MIN_SUBTOTAL'));
  changed = await update(changed, { minSubtotal: 0, maxDiscount: null });
  assert.equal((await quoteCoupon(store, 'SAVE10', 'alice', 500, date)).discount, 500);
  await update(changed, { type: 'percent', value: 10 });
  assert.equal((await quoteCoupon(store, 'SAVE10', 'alice', 999, date)).discount, 99);
});

test('coupon windows include the start and exclude the end; inactive and quota restrictions reject', async t => {
  const { store, promotion, update } = await fixture(t, { startsAt: date, endsAt: '2026-10-21T12:00:00Z' });
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 100, '2026-10-20T11:59:59Z'), errorCode('COUPON_NOT_STARTED'));
  assert.equal((await quoteCoupon(store, 'SAVE10', 'alice', 100, date)).discount, 10);
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 100, '2026-10-21T12:00:00Z'), errorCode('COUPON_EXPIRED'));
  await update(promotion, { isActive: false });
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 100, date), errorCode('COUPON_INACTIVE'));
});

test('atomic redemption races consume one global use and retry/cancellation release it once', async t => {
  const { store, promotion } = await fixture(t, { usageLimit: 1 });
  const { coupon } = await quoteCoupon(store, 'SAVE10', 'alice', 10_000, date);
  const results = await Promise.allSettled([redeem(store, coupon, 'alice', 'order-a'), redeem(store, coupon, 'bob', 'order-b')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'COUPON_USAGE_LIMIT');
  const first = await redeem(store, coupon, 'alice', 'order-a');
  assert.equal(first.id, 'order-a');
  assert.equal((await store.list('coupon-use')).length, 1);
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'bob', 10_000, date), errorCode('COUPON_USAGE_LIMIT'));
  const order = { id: 'order-a', userId: 'alice', coupon };
  assert.equal(await store.transaction(() => releaseCoupon(store, order)), true);
  assert.equal(await store.transaction(() => releaseCoupon(store, order)), false);
  assert.equal((await store.get('promotion', promotion.id)).version, 1);
  await redeem(store, coupon, 'alice', 'order-a');
  assert.ok((await store.get('coupon-use', 'order-a')).releasedAt);
  assert.equal((await quoteCoupon(store, 'SAVE10', 'bob', 10_000, date)).discount, 1000);
  const list = await promotionRoute({ store, path: '/api/admin/promotions', method: 'GET', user: admin });
  assert.equal(list.promotions[0].usedCount, 0);
});

test('per-user limits, transaction rollback, historical IDs and order snapshots survive later edits', async t => {
  const { store, promotion, update } = await fixture(t, { perUserLimit: 1 });
  const { coupon } = await quoteCoupon(store, 'SAVE10', 'alice', 20_000, date);
  const order = { id: 'snapshot-order', userId: 'alice', coupon, subtotal: 20_000, discount: 2000, shipping: 30_000, total: 48_000 };
  await assert.rejects(store.transaction(async () => { await redeemCoupon(store, coupon, 'alice', order.id, date); throw new Error('rollback'); }), /rollback/);
  assert.equal(await store.get('coupon-use', order.id), null);
  await store.transaction(async () => { await redeemCoupon(store, coupon, 'alice', order.id, date); await store.put('order', order, 'alice'); });
  await assert.rejects(quoteCoupon(store, 'SAVE10', 'alice', 20_000, date), errorCode('COUPON_USER_LIMIT'));
  assert.equal((await quoteCoupon(store, 'SAVE10', 'bob', 20_000, date)).discount, 2000);
  await update(promotion, { code: 'RENAMED', label: 'Mới', value: 50, isActive: false });
  assert.deepEqual(await store.get('order', order.id), order);
  assert.equal(await store.transaction(() => releaseCoupon(store, order)), true);
  assert.equal((await store.list('coupon-use'))[0].promotionId, promotion.id);
});

test('redemption rechecks current policy and cannot assign the same order to another customer', async t => {
  const { store, promotion, update } = await fixture(t);
  const { coupon } = await quoteCoupon(store, 'SAVE10', 'alice', 20_000, date);
  const changed = await update(promotion, { isActive: false });
  await assert.rejects(redeem(store, coupon, 'alice', 'order-a'), errorCode('COUPON_INACTIVE'));
  await update(changed, { isActive: true, value: 20 });
  await assert.rejects(redeem(store, coupon, 'alice', 'order-a'), errorCode('COUPON_CHANGED'));
  const current = (await quoteCoupon(store, 'SAVE10', 'alice', 20_000, date)).coupon;
  await redeem(store, current, 'alice', 'order-a');
  await assert.rejects(redeem(store, current, 'bob', 'order-a'), errorCode('COUPON_ORDER_CONFLICT'));
});
