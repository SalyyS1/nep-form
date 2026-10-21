import test from 'node:test';
import assert from 'node:assert/strict';
import { openSqliteStore } from '../../server/sqlite-store.mjs';
import { emailService, startEmailWorker } from '../../server/email-service.mjs';
import { resendTransport } from '../../server/email-transport.mjs';
import { orderEmail } from '../../server/email-templates.mjs';
import { authRoute } from '../../server/auth.mjs';
import { orderRoute } from '../../server/orders.mjs';
import { adminRoute } from '../../server/admin.mjs';
import { digest, publicUser } from '../../server/common.mjs';

const env = { MAIL_ENABLED: 'true', RESEND_API_KEY: 'test-only-no-provider-credential', MAIL_QUEUE_KEY: 'test-only-separate-stable-queue-key-not-a-real-secret', MAIL_FROM: 'NẾP FORM <hello@example.test>' };
const config = { production: true, appOrigin: 'https://shop.example.test' };
async function fixture(t, options = {}) {
  const store = openSqliteStore({ dbPath: ':memory:', catalogPath: 'missing-test-only-catalog.json' });
  t.after(() => store.close());
  let time = Date.now(); const deliveries = [];
  const mail = emailService({ store, config, env, transport: async (payload, key) => { deliveries.push({ payload, key }); }, now: () => time, ...options });
  const ctx = { store, config, mail, response: { setHeader() {} }, request: { headers: {} }, method: 'POST' };
  const auth = (path, body = {}, user) => authRoute({ ...ctx, path: `/api/auth/${path}`, body, user });
  const registered = await auth('register', { name: '<Khách>', email: 'customer@example.test', password: 'Customer@2026!', confirmPassword: 'Customer@2026!' });
  const user = await store.get('user', registered.user.id);
  return { store, mail, ctx, auth, user, registered, deliveries, advance: value => { time += value; } };
}
const messageToken = payload => new URL(payload.text.match(/https:\/\/\S+\?token=[a-f0-9]+/)[0]).searchParams.get('token');

test('verification is hashed, email-bound, expiring, one-use and safe under simultaneous replay', async t => {
  const f = await fixture(t);
  assert.equal(f.registered.queued, true);
  assert.equal(f.user.emailVerified, false);
  assert.equal(f.registered.verificationUrl, undefined);
  await f.mail.runOnce();
  const raw = messageToken(f.deliveries[0].payload);
  const record = (await f.store.list('email-verification'))[0];
  assert.equal(record.id, digest(raw));
  assert.ok(!JSON.stringify(await f.store.list('email-job')).includes(raw));
  assert.ok(!JSON.stringify(await f.store.list('email-verification')).includes(raw));
  assert.match(f.deliveries[0].payload.html, /&lt;Khách&gt;/);
  const replay = await Promise.allSettled([f.mail.verify(raw), f.mail.verify(raw)]);
  assert.equal(replay.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await f.store.get('user', f.user.id)).emailVerified, true);
  assert.equal(publicUser({ ...f.user, role: 'admin' }).emailVerified, true);
  await f.store.put('user', f.user);
  f.advance(60001); await f.auth('resend-verification', {}, f.user); await f.mail.runOnce();
  const expired = messageToken(f.deliveries[1].payload);
  f.advance(24 * 3600000);
  await assert.rejects(f.mail.verify(expired), { code: 'EMAIL_VERIFICATION_INVALID' });
  await f.auth('resend-verification', {}, f.user); await f.mail.runOnce();
  const changed = messageToken(f.deliveries[2].payload);
  await f.store.put('user', { ...f.user, email: 'other@example.test' });
  await assert.rejects(f.mail.verify(changed), { code: 'EMAIL_VERIFICATION_INVALID' });
});

test('resend requires authentication, imposes persisted cooldown and invalidates older pending links', async t => {
  const f = await fixture(t);
  await assert.rejects(f.auth('resend-verification'), { code: 'UNAUTHORIZED' });
  await assert.rejects(f.auth('resend-verification', {}, f.user), { code: 'EMAIL_COOLDOWN' });
  f.advance(60001);
  assert.deepEqual(await f.auth('resend-verification', {}, f.user), { queued: true });
  await f.mail.runOnce();
  assert.equal((await f.store.list('email-job')).filter(job => job.status === 'cancelled').length, 1);
  assert.equal(f.deliveries.length, 1);
  assert.equal((await f.store.list('email-verification', f.user.id)).length, 1);
  await assert.rejects(f.auth('register', { name: 'Tên', email: 'new@example.test', password: 'Customer@2026!', confirmPassword: 'wrong' }), { code: 'PASSWORD_CONFIRMATION_MISMATCH' });
});

test('configured password reset never returns token links and binds reset to the account email', async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.auth('request-reset', { email: 'absent@example.test' }), { ok: true });
  assert.deepEqual(await f.auth('request-reset', { email: f.user.email }), { ok: true });
  await f.mail.runOnce(); await f.mail.runOnce();
  const raw = messageToken(f.deliveries.find(item => item.payload.subject.includes('mật khẩu')).payload);
  await assert.rejects(f.auth('reset-password', { token: raw, password: 'Changed@2026!', confirmPassword: 'wrong' }), { code: 'PASSWORD_CONFIRMATION_MISMATCH' });
  await f.store.put('user', { ...f.user, email: 'changed@example.test' });
  await assert.rejects(f.auth('reset-password', { token: raw, password: 'Changed@2026!' }), { code: 'RESET_INVALID' });
});

test('unconfigured hosted mail preserves registration but exposes unavailable mail and local links remain explicit', async t => {
  const f = await fixture(t, { env: {} });
  assert.equal(f.mail.configured, false);
  assert.equal(f.registered.verificationUrl, undefined);
  await assert.rejects(f.auth('resend-verification', {}, f.user), { code: 'EMAIL_NOT_CONFIGURED' });
  await assert.rejects(f.auth('request-reset', { email: f.user.email }), { code: 'EMAIL_NOT_CONFIGURED' });
  const local = emailService({ store: f.store, config: { production: false }, env: {} });
  const result = await f.store.transaction(() => local.enqueueVerification(f.user));
  assert.equal(result.localOnly, true); assert.equal(result.queued, false);
  assert.match(result.verificationUrl, /^\/xac-minh-email\?token=/);
});

test('outbox survives provider failure, retries with the same key, sanitizes errors and respects the dedupe horizon', async t => {
  let attempts = 0; const keys = [];
  const f = await fixture(t, { transport: async (_, key) => { keys.push(key); if (++attempts === 1) throw new Error('secret and recipient must never be persisted'); } });
  await f.mail.runOnce();
  assert.equal((await f.store.list('email-job'))[0].status, 'retry');
  assert.ok(!JSON.stringify(await f.store.list('email-job')).includes('recipient must'));
  assert.equal(await f.mail.runOnce(), false);
  f.advance(30001); await f.mail.runOnce();
  assert.equal(keys[0], keys[1]); assert.equal((await f.mail.status()).sent, 1);
  f.advance(60001); await f.auth('resend-verification', {}, f.user);
  const job = (await f.store.list('email-job')).find(value => value.status === 'pending');
  await f.store.put('email-job', { ...job, status: 'sending', firstAttemptAt: Date.now() - 24 * 3600000, leaseUntil: 0 }, f.user.id);
  await f.mail.runOnce();
  assert.equal((await f.store.get('email-job', job.id)).failureCode, 'RETRY_WINDOW_EXPIRED');
  assert.equal(keys.length, 2);
});

test('order + outbox commit together, idempotent checkout and cancellation enqueue once, payment updates reflect reality', async t => {
  const f = await fixture(t);
  await f.store.put('product', { id: 'shirt', name: 'Áo <test>', price: 100000, isActive: true, images: [], stock: 2, version: 1, variants: [{ size: 'M', color: 'Trắng', stock: 2 }] });
  await f.store.put('cart', { id: 'cart', productId: 'shirt', size: 'M', color: 'Trắng', quantity: 1 }, f.user.id);
  const body = { idempotencyKey: 'one', paymentMethod: 'bank', address: { recipient: 'Tên', phone: '0901234567', province: 'HCM', ward: 'Phường', line1: '12 Đường' }, expectedQuote: { subtotal: 100000, shipping: 30000, total: 130000, items: [{ productId: 'shirt', size: 'M', color: 'Trắng', quantity: 1, unitPrice: 100000 }] } };
  const order = (user, path = '/api/orders', payload = body) => orderRoute({ ...f.ctx, path, user, body: payload });
  await assert.rejects(order(f.user), { code: 'EMAIL_VERIFICATION_REQUIRED' });
  const user = { ...f.user, emailVerified: true }; await f.store.put('user', user);
  const created = (await order(user)).order;
  assert.equal((await order(user)).order.id, created.id);
  assert.equal((await f.store.list('email-job')).length, 2);
  await f.mail.runOnce(); await f.mail.runOnce();
  const receipt = f.deliveries.find(item => item.payload.subject.includes('Đã nhận đơn')).payload;
  assert.match(receipt.text, /Chờ xác nhận chuyển khoản/); assert.ok(!receipt.text.includes('Đã thu tiền'));
  assert.match(receipt.html, /Áo &lt;test&gt;/);
  assert.match(receipt.text, new RegExp(`/don-hang/${created.id}`));
  const admin = { ...user, role: 'admin' };
  await adminRoute({ ...f.ctx, method: 'PATCH', path: `/api/admin/orders/${created.id}`, user: admin, body: { carrier: 'Giao nhanh', trackingCode: 'TRACK', paymentStatus: 'pending' } });
  assert.equal((await f.store.list('email-job')).length, 3);
  await order(user, `/api/orders/${created.id}/cancel`, {}); await order(user, `/api/orders/${created.id}/cancel`, {});
  assert.equal((await f.store.list('email-job')).length, 4);
  const adminStatus = await adminRoute({ ...f.ctx, method: 'GET', path: '/api/admin/email-status', user: admin, body: {} });
  assert.deepEqual(Object.keys(adminStatus).sort(), ['configured', 'failed', 'pending', 'sent']);
  assert.equal((await f.store.get('product', 'shirt')).stock, 2);
  await assert.rejects(f.store.transaction(async () => { await f.mail.enqueueOrder({ ...created, version: 50 }); throw new Error('rollback'); }));
  assert.equal((await f.store.list('email-job')).length, 4);
  const failing = emailService({ store: f.store, config, env, transport: async () => { throw new Error('provider down'); } });
  await failing.runOnce();
  assert.equal((await f.store.get('order', created.id)).status, 'cancelled');
  assert.equal((await f.store.get('product', 'shirt')).stock, 2);
  assert.equal((await f.store.list('email-job')).filter(job => job.status === 'retry').length, 1);
});

test('concurrent workers lease a job once and expired crash leases recover without unbounded retries', async t => {
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; });
  const sending = new Promise(resolve => { started = resolve; });
  const f = await fixture(t, { transport: async () => { started(); await waiting; } });
  const first = f.mail.runOnce(); await sending;
  assert.equal(await f.mail.runOnce(), false);
  release(); await first;
  f.advance(60001); await f.auth('resend-verification', {}, f.user);
  const job = (await f.store.list('email-job')).find(value => value.status === 'pending');
  await f.store.put('email-job', { ...job, status: 'sending', attempts: 8, leaseUntil: 0 }, f.user.id);
  assert.equal(await f.mail.runOnce(), false);
  assert.equal((await f.store.get('email-job', job.id)).failureCode, 'ATTEMPTS_EXHAUSTED');
});

test('native Resend transport fixes endpoint, blocks redirects and keeps error payloads out of failures', async () => {
  const requests = [];
  const send = resendTransport('fixture-key', async (url, options) => { requests.push({ url, options }); return new Response('private address or key', { status: 429 }); });
  await assert.rejects(send({ subject: 'safe' }, 'same-event'), error => error.mailCode === 'HTTP_429' && !error.message.includes('private'));
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.headers['Idempotency-Key'], 'same-event');
  const content = orderEmail({ id: 'order', code: 'CODE\r\nBcc: injected', customerName: '<script>', status: 'pending', paymentStatus: 'unpaid', items: [], subtotal: 0, shipping: 0, total: 0 }, 'receipt', 'https://shop.example.test');
  assert.ok(!/[\r\n]/.test(content.subject));
  assert.match(content.html, /&lt;script&gt;/);
  const f = { configured: false, runOnce: () => assert.fail('disabled worker sent mail') };
  const worker = startEmailWorker(f); worker.stop(); await worker.finished;
});

test('provider key rotation preserves queued mail when the independent queue key stays stable', async t => {
  const f = await fixture(t); const delivered = [];
  const rotated = emailService({ store: f.store, config, env: { ...env, RESEND_API_KEY: 'rotated-provider-test-credential' }, transport: async (payload, key) => delivered.push({ payload, key }) });
  assert.equal(await rotated.runOnce(), true);
  assert.equal(delivered.length, 1); assert.match(delivered[0].payload.subject, /Xác minh/);
  assert.equal((await f.store.list('email-job'))[0].status, 'sent');
  for (const queueKey of [undefined, 'too-short', env.RESEND_API_KEY]) {
    assert.throws(() => emailService({ store: f.store, config, env: { ...env, MAIL_QUEUE_KEY: queueKey } }), /MAIL_QUEUE_KEY must be a separate private key/);
  }
});

test('wrong queue key marks encrypted jobs unreadable immediately without provider calls or retries', async t => {
  const f = await fixture(t);
  const wrong = emailService({ store: f.store, config, env: { ...env, MAIL_QUEUE_KEY: 'different-private-test-queue-key-at-least-32-chars' }, transport: () => assert.fail('unreadable jobs must never reach provider') });
  assert.equal(await wrong.runOnce(), true);
  const job = (await f.store.list('email-job'))[0];
  assert.equal(job.status, 'failed'); assert.equal(job.failureCode, 'PAYLOAD_UNREADABLE');
  assert.equal(job.attempts, 1); assert.equal(job.nextAttemptAt, undefined);
  assert.equal(await wrong.runOnce(), false);
  assert.ok(!JSON.stringify(job).includes(env.MAIL_QUEUE_KEY));
  assert.ok(!JSON.stringify(job).includes(f.user.email));
});
