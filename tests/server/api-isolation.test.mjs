import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { setup, register, address, cart, product } from './test-helpers.mjs';

test('sessions, user records, authorization and default addresses remain isolated', async t => {
  const api = await setup(t);
  const alice = api.client(), bob = api.client(), anonymous = api.client();
  const registration = await register(alice, 'alice@example.test');
  assert.equal(registration.status, 200);
  assert.match(registration.headers.get('set-cookie'), /HttpOnly/);
  assert.equal(registration.data.user.role, 'customer');
  assert.equal(registration.data.user.passwordHash, undefined);
  await register(bob, 'bob@example.test');
  assert.equal((await anonymous('/api/cart', 'POST', cart(1))).status, 401);
  assert.equal((await bob('/api/admin')).status, 403);
  assert.equal((await alice('/api/addresses', 'POST', address)).status, 200);
  await alice('/api/addresses', 'POST', { ...address, line1: 'Địa chỉ thứ hai' });
  await alice('/api/cart', 'POST', cart(1));
  const own = (await alice('/api/bootstrap')).data;
  assert.equal(own.addresses.length, 2);
  assert.equal(own.addresses.filter(item => item.isDefault).length, 1);
  assert.equal((await bob(`/api/cart/${own.cart[0].id}`, 'DELETE')).status, 404);
  assert.equal((await bob(`/api/addresses/${own.addresses[0].id}`, 'PATCH', { recipient: 'Other' })).status, 404);
  const other = (await bob('/api/bootstrap')).data;
  assert.deepEqual(other.cart, []);
  assert.deepEqual(other.addresses, []);
  await alice(`/api/addresses/${own.addresses.find(item => item.isDefault).id}`, 'DELETE');
  assert.equal((await alice('/api/bootstrap')).data.addresses.filter(item => item.isDefault).length, 1);
  assert.equal((await alice('/api/account', 'PATCH', { name: 'Tên mới', role: 'admin' })).status, 200);
  assert.equal((await alice('/api/admin')).status, 403);
  assert.equal((await alice('/api/auth/logout', 'POST')).status, 200);
  assert.equal((await alice('/api/bootstrap')).data.user, null);
});

test('local reset tokens are one-use, expire sessions and persist password across restart', async t => {
  const api = await setup(t);
  const alice = api.client();
  await register(alice, 'alice@example.test');
  const reset = (await alice('/api/auth/request-reset', 'POST', { email: 'alice@example.test' })).data;
  assert.equal(reset.ok, true);
  const token = new URL(reset.resetUrl, 'http://local').searchParams.get('token');
  assert.equal((await alice('/api/auth/reset-password', 'POST', { token, password: 'Changed@2026!' })).status, 200);
  assert.equal((await alice('/api/bootstrap')).data.user, null);
  assert.equal((await alice('/api/auth/reset-password', 'POST', { token, password: 'Another@2026!' })).status, 400);
  await api.restart();
  assert.equal((await alice('/api/auth/login', 'POST', { email: 'alice@example.test', password: 'Customer@2026!' })).status, 401);
  assert.equal((await alice('/api/auth/login', 'POST', { email: 'alice@example.test', password: 'Changed@2026!' })).status, 200);
  const unknown = (await alice('/api/auth/request-reset', 'POST', { email: 'absent@example.test' })).data;
  assert.deepEqual(unknown, { ok: true });
});

test('catalog can arrive after startup and is seeded once without overwriting local changes', async t => {
  const api = await setup(t, { noCatalog: true });
  const request = api.client();
  assert.deepEqual((await request('/api/bootstrap')).data.products, []);
  await writeFile(api.catalogPath, JSON.stringify([product]));
  assert.equal((await request('/api/bootstrap')).data.products.length, 1);
  await writeFile(api.catalogPath, JSON.stringify([{ ...product, name: 'Changed external seed' }]));
  await api.restart();
  assert.equal((await request('/api/bootstrap')).data.products[0].name, product.name);
  assert.equal((await request('/api/health', 'GET', undefined, { Origin: 'https://evil.example' })).status, 403);
});
