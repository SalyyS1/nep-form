import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../../server/index.mjs';
import { consumeStudioWrite, STUDIO_DAILY_BYTE_LIMIT } from '../../server/customer-resource-limits.mjs';
import { address, product } from './test-helpers.mjs';

const project = () => ({ version: 1, name: 'Giới hạn an toàn', productId: 'blank', color: 'Trắng', size: 'M', faces: {
  front: { area: 'small', layers: [{ id: 'text', kind: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1, fill: '#000000', text: 'Nếp', fontFamily: 'Be Vietnam Pro', fontWeight: 400, hidden: false, locked: false }] },
  back: { area: 'small', layers: [] },
} });
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-resource-limits-'));
  const options = { dbPath: join(directory, 'test.sqlite'), catalogPath: join(directory, 'catalog.json'), port: 0 };
  await writeFile(options.catalogPath, '[]');
  let server = await startServer(options);
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await server.closed; await rm(directory, { recursive: true, force: true }); });
  await server.store.put('product', { ...product, version: 1 });
  await server.store.put('product', { ...product, id: 'blank', slug: 'blank', isCustomBase: true, variants: [{ ...product.variants[0], stock: 100 }], version: 1 });
  const user = (await server.store.list('user')).find(value => value.role === 'customer');
  let cookie = '';
  const request = async (path, method = 'GET', body, anonymous = false) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(anonymous ? {} : { Cookie: cookie }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!anonymous && response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  assert.equal((await request('/api/auth/login', 'POST', { email: 'khach@nepform.local', password: 'Nepform@2026!' })).status, 200);
  return { user, request, get store() { return server.store; }, async restart() {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await server.closed; server = await startServer(options);
  } };
}
const budget = (userId, overrides = {}) => ({ id: userId, hourStartedAt: Date.now(), hourWrites: 0, dayStartedAt: Date.now(), dayBytes: 0, ...overrides });

test('only successful authenticated Studio writes consume the shared persistent allowance', async t => {
  const api = await fixture(t);
  assert.equal((await api.request('/api/custom/designs', 'POST', { project: project() }, true)).status, 401);
  assert.equal((await api.request('/api/custom/designs', 'POST', { project: { ...project(), version: 2 } })).status, 400);
  assert.equal(await api.store.get('studio-write-budget', api.user.id), null);
  assert.equal((await api.request('/api/custom/cart', 'POST', { project: project(), quantity: 99 })).status, 200);
  const before = await api.store.get('studio-write-budget', api.user.id);
  assert.equal(before.hourWrites, 1);
  assert.equal(before.dayBytes, Buffer.byteLength(JSON.stringify(project())));
  assert.equal((await api.request('/api/custom/cart', 'POST', { project: project(), quantity: 2 })).status, 409);
  assert.deepEqual(await api.store.get('studio-write-budget', api.user.id), before);
  assert.equal((await api.request('/api/custom/designs', 'POST', { project: project(), hourWrites: -999, userId: 'other' })).status, 200);
  assert.equal((await api.store.get('studio-write-budget', api.user.id)).hourWrites, 2);
  assert.equal((await api.store.list('design', api.user.id)).length, 2);
});

test('concurrent saves enforce the hourly cap atomically and retain it after restart', async t => {
  const api = await fixture(t);
  const seeded = budget(api.user.id, { hourWrites: 29 });
  await api.store.put('studio-write-budget', seeded, api.user.id);
  const results = await Promise.all([0, 1].map(() => api.request('/api/custom/designs', 'POST', { project: project() })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 429]);
  const rejected = results.find(result => result.status === 429);
  assert.equal(rejected.data.code, 'STUDIO_WRITE_LIMIT');
  assert.ok(Number(rejected.headers.get('retry-after')) > 0);
  assert.equal((await api.store.get('studio-write-budget', api.user.id)).hourWrites, 30);
  assert.equal((await api.store.list('design', api.user.id)).length, 1);
  await api.restart();
  assert.equal((await api.request('/api/custom/cart', 'POST', { project: project(), quantity: 1 })).status, 429);
  assert.equal((await api.store.list('cart', api.user.id)).length, 0);
  assert.equal((await api.store.list('design', api.user.id)).length, 1);
});

test('serialized byte limit shares both Studio routes and resets each window independently', async t => {
  const api = await fixture(t);
  const bytes = Buffer.byteLength(JSON.stringify(project()));
  const seeded = budget(api.user.id, { dayBytes: STUDIO_DAILY_BYTE_LIMIT - bytes });
  await api.store.put('studio-write-budget', seeded, api.user.id);
  assert.equal((await api.request('/api/custom/designs', 'POST', { project: project() })).status, 200);
  const used = await api.store.get('studio-write-budget', api.user.id);
  assert.equal(used.dayBytes, STUDIO_DAILY_BYTE_LIMIT);
  assert.equal((await api.request('/api/custom/cart', 'POST', { project: project(), quantity: 1 })).status, 429);
  assert.deepEqual(await api.store.get('studio-write-budget', api.user.id), used);
  const laterHour = used.hourStartedAt + 3_600_000;
  await assert.rejects(api.store.transaction(() => consumeStudioWrite(api.store, api.user.id, project(), laterHour)), error => error.status === 429 && error.retryAfter > 0);
  await api.store.transaction(() => consumeStudioWrite(api.store, api.user.id, project(), used.dayStartedAt + 86_400_000));
  const reset = await api.store.get('studio-write-budget', api.user.id);
  assert.equal(reset.hourWrites, 1); assert.equal(reset.dayBytes, bytes);
  await assert.rejects(api.store.transaction(async () => { await consumeStudioWrite(api.store, api.user.id, project()); throw new Error('Persistence failure'); }));
  assert.deepEqual(await api.store.get('studio-write-budget', api.user.id), reset);
});

test('full cart blocks new regular and custom lines while existing lines remain editable and removable', async t => {
  const api = await fixture(t);
  await api.store.transaction(async () => {
    for (let index = 0; index < 50; index++) {
      const productId = index ? `old-${index}` : 'shirt';
      if (index) await api.store.put('product', { ...product, id: productId, slug: productId, version: 1 });
      await api.store.put('cart', { id: `line-${index}`, productId, size: 'M', color: 'Trắng', quantity: 1 }, api.user.id);
    }
  });
  const cartInput = { productId: 'shirt', size: 'M', color: 'Trắng', quantity: 1 };
  assert.equal((await api.request('/api/cart', 'POST', cartInput)).status, 200);
  assert.equal((await api.request('/api/cart/line-0', 'PATCH', { quantity: 1 })).status, 200);
  assert.equal((await api.request('/api/custom/cart', 'POST', { project: project(), quantity: 1 })).data.code, 'CART_LINE_LIMIT');
  assert.equal(await api.store.get('studio-write-budget', api.user.id), null);
  await api.store.put('product', { ...product, id: 'second', slug: 'second', version: 1 });
  assert.equal((await api.request('/api/cart', 'POST', { ...cartInput, productId: 'second' })).data.code, 'CART_LINE_LIMIT');
  assert.equal((await api.request('/api/cart/line-1', 'DELETE')).status, 200);
  const lastLine = await Promise.all([
    api.request('/api/cart', 'POST', { ...cartInput, productId: 'second' }),
    api.request('/api/custom/cart', 'POST', { project: project(), quantity: 1 }),
  ]);
  assert.deepEqual(lastLine.map(result => result.status).sort(), [200, 409]);
  assert.equal((await api.store.list('cart', api.user.id)).length, 50);
});

test('address limit permits edits/deletion and a failed checkout rolls back stock and budget-independent state', async t => {
  const api = await fixture(t);
  for (let index = 0; index < 20; index++) await api.store.put('address', { ...address, id: `address-${index}`, isDefault: index === 0 }, api.user.id);
  assert.equal((await api.request('/api/addresses', 'POST', address)).data.code, 'ADDRESS_LIMIT');
  assert.equal((await api.request('/api/addresses/address-1', 'PATCH', { recipient: 'Tên mới', isDefault: true })).status, 200);
  assert.equal((await api.store.list('address', api.user.id)).filter(item => item.isDefault).length, 1);
  await api.request('/api/cart', 'POST', { productId: 'shirt', size: 'M', color: 'Trắng', quantity: 1 });
  const expectedQuote = (await api.request('/api/checkout/quote', 'POST', {})).data.quote;
  const failed = await api.request('/api/orders', 'POST', { address, saveAddress: true, paymentMethod: 'cod', idempotencyKey: 'address-full', expectedQuote });
  assert.equal(failed.data.code, 'ADDRESS_LIMIT');
  assert.equal((await api.store.get('product', 'shirt')).stock, 3);
  assert.equal((await api.store.list('cart', api.user.id)).length, 1);
  assert.equal((await api.store.list('order', api.user.id)).length, 0);
  assert.equal((await api.request('/api/addresses/address-19', 'DELETE')).status, 200);
  const lastAddress = await Promise.all([0, 1].map(() => api.request('/api/addresses', 'POST', address)));
  assert.deepEqual(lastAddress.map(result => result.status).sort(), [200, 409]);
  assert.equal((await api.store.list('address', api.user.id)).length, 20);
});
