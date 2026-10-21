import test from 'node:test';
import assert from 'node:assert/strict';
import { embeddedPostgres } from './postgres-test-pool.mjs';
import { initializePostgres, snapshotPostgres } from '../../server/postgres-maintenance.mjs';
import { openPostgresStore } from '../../server/postgres-store.mjs';
import { checkoutPromotionsRoute } from '../../server/checkout-promotions.mjs';
import { promotionRoute } from '../../server/promotions.mjs';
import { checkoutQuote } from '../../server/checkout-quote.mjs';
import { product } from './test-helpers.mjs';

test('PostgreSQL discovery shares quote amounts and leaves records, identities and idempotency untouched', async t => {
  const pool = await embeddedPostgres();
  t.after(() => pool.end());
  await initializePostgres(pool);
  const store = await openPostgresStore({ pool });
  const user = { id: 'pg-buyer', role: 'customer' };
  await store.put('product', { ...product, salePrice: 200_000 });
  await store.put('cart', { id: 'cart', productId: product.id, color: 'Trắng', size: 'M', quantity: 2 }, user.id);
  for (const values of [{ code: 'PUBLIC', showAtCheckout: true }, { code: 'PRIVATE', showAtCheckout: false }]) await promotionRoute({ store, user: { id: 'admin', role: 'admin' }, path: '/api/admin/promotions', method: 'POST', body: { label: 'Ưu đãi', type: 'percent', value: 10, ...values } });
  const before = await snapshotPostgres(pool);
  const result = await checkoutPromotionsRoute({ store, user, path: '/api/checkout/promotions', method: 'GET' });
  const quote = (await checkoutQuote(store, user, result.bestCode)).quote;
  assert.deepEqual([result.bestCode, result.subtotal, result.quantity, result.promotions.length, result.promotions[0].discount], ['PUBLIC', 400_000, 2, 1, quote.discount]);
  const after = await snapshotPostgres(pool);
  for (const key of ['records', 'identities', 'idempotency']) assert.deepEqual(after[key], before[key]);
});
