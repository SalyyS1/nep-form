import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, adminLogin, register, address, cart, product, expectedQuote } from './test-helpers.mjs';

test('admin creates, edits and archives products with derived variant inventory', async t => {
  const api = await setup(t);
  const admin = api.client(), customer = api.client();
  await adminLogin(admin);
  await register(customer, 'customer@example.test');
  const created = await admin('/api/admin/products', 'POST', { ...product, id: 'client-owned-id', slug: 'new-shirt', name: 'Áo mới', stock: 999, variants: [{ size: 'M', color: 'Trắng', stock: 7 }] });
  assert.equal(created.status, 200);
  assert.notEqual(created.data.id, 'client-owned-id');
  assert.equal(created.data.stock, 7);
  assert.equal(created.data.version, 1);
  const productId = created.data.id;
  assert.equal((await admin(`/api/admin/products/${productId}`, 'PATCH', { price: -1, expectedVersion: 1 })).status, 400);
  assert.equal((await admin(`/api/admin/products/${productId}`, 'PATCH', { price: 390000, name: 'Áo đã sửa', images: ['/images/new.webp'], variants: [{ size: 'M', color: 'Trắng', stock: 12 }], expectedVersion: 1 })).status, 200);
  const edited = (await customer('/api/bootstrap')).data.products.find(item => item.id === productId);
  assert.equal(edited.name, 'Áo đã sửa');
  assert.equal(edited.price, 390000);
  assert.equal(edited.stock, 12);
  assert.equal(edited.version, 2);
  assert.equal(edited.variants[0].stock, 12);
  assert.equal(edited.images[0], '/images/new.webp');
  assert.equal((await admin('/api/admin/products', 'POST', { ...product, slug: 'new-shirt' })).status, 409);
  await admin(`/api/admin/products/${productId}`, 'PATCH', { isActive: false, expectedVersion: 2 });
  assert.ok(!(await customer('/api/bootstrap')).data.products.some(item => item.id === productId));
  assert.ok((await admin('/api/admin')).data.products.some(item => item.id === productId && !item.isActive));
  assert.equal((await customer('/api/cart', 'POST', { productId, size: 'M', color: 'Trắng', quantity: 1 })).status, 409);
  await api.restart();
  assert.equal((await admin('/api/admin')).data.products.find(item => item.id === productId).stock, 12);
});

test('admin cannot remove an ordered variant before its stock can be restored', async t => {
  const api = await setup(t);
  const admin = api.client(), customer = api.client();
  await adminLogin(admin);
  await register(customer, 'customer@example.test');
  await customer('/api/cart', 'POST', cart(1));
  const { data: { order } } = await customer('/api/orders', 'POST', { address, paymentMethod: 'cod', idempotencyKey: 'variant-in-use', expectedQuote: await expectedQuote(customer) });
  const removeVariant = { sizes: ['L'], variants: [{ size: 'L', color: 'Trắng', stock: 3 }] };
  assert.equal((await admin('/api/admin/products/shirt', 'PATCH', { ...removeVariant, expectedVersion: 2 })).status, 409);
  await admin('/api/admin/products/shirt', 'PATCH', { isActive: false, expectedVersion: 2 });
  assert.equal((await customer(`/api/orders/${order.id}/cancel`, 'POST')).status, 200);
  const after = (await admin('/api/admin')).data.products.find(item => item.id === 'shirt');
  assert.equal(after.stock, 3);
  assert.equal(after.version, 4);
  assert.equal((await admin('/api/admin/products/shirt', 'PATCH', { ...removeVariant, expectedVersion: after.version })).status, 200);
});
