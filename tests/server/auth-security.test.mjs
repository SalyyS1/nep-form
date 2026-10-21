import test from 'node:test';
import assert from 'node:assert/strict';
import { openSqliteStore } from '../../server/sqlite-store.mjs';
import { authRoute, currentUser } from '../../server/auth.mjs';
import { emailService } from '../../server/email-service.mjs';
import { digest } from '../../server/common.mjs';

async function fixture(t) {
  const store = openSqliteStore({ dbPath: ':memory:', catalogPath: 'missing-security-fixture.json' });
  t.after(() => store.close());
  const config = { production: true, appOrigin: 'https://shop.example.test' };
  const deliveries = [];
  const mail = emailService({ store, config, env: {
    MAIL_ENABLED: 'true', RESEND_API_KEY: 'security-fixture-no-provider-credential',
    MAIL_QUEUE_KEY: 'security-fixture-independent-encryption-key', MAIL_FROM: 'hello@example.test',
  }, transport: async payload => { deliveries.push(payload); } });
  async function auth(path, body = {}, cookie = '') {
    const headers = {};
    const request = { headers: { cookie } };
    const user = await currentUser(store, request);
    const data = await authRoute({ store, config, mail, request, user,
      response: { setHeader: (key, value) => { headers[key] = value; } },
      method: 'POST', path: `/api/auth/${path}`, body });
    return { data, cookie: headers['Set-Cookie']?.split(';')[0] };
  }
  const registered = await auth('register', {
    email: 'security-customer@example.test', name: 'Customer', password: 'Original@2026!',
    role: 'admin', emailVerified: true, passwordHash: 'attacker-controlled',
  });
  async function resetToken() {
    const requested = await auth('request-reset', { email: registered.data.user.email });
    assert.deepEqual(requested.data, { ok: true });
    while (await mail.runOnce()) {}
    const resetMail = deliveries.find(payload => payload.subject.includes('mật khẩu'));
    assert.deepEqual(resetMail.to, [registered.data.user.email]);
    return new URL(resetMail.text.match(/https:\/\/\S+\?token=[a-f0-9]+/)[0]).searchParams.get('token');
  }
  return { store, auth, registered, resetToken, user: cookie => currentUser(store, { headers: { cookie } }) };
}

test('registration ignores supplied authority and password resets revoke every existing session', async t => {
  const f = await fixture(t);
  assert.equal(f.registered.data.user.role, 'customer');
  assert.equal(f.registered.data.user.emailVerified, false);
  assert.equal(f.registered.data.user.passwordHash, undefined);
  const account = await f.store.get('user', f.registered.data.user.id);
  assert.notEqual(account.passwordHash, 'attacker-controlled');
  const login = await f.auth('login', { email: account.email, password: 'Original@2026!' });
  assert.notEqual(login.cookie, f.registered.cookie);
  assert.equal((await f.store.list('session', account.id)).length, 2);
  const raw = await f.resetToken();
  await assert.rejects(f.auth('reset-password', { token: raw, password: 'Changed@2026!', confirmPassword: 'different' }), { code: 'PASSWORD_CONFIRMATION_MISMATCH' });
  assert.ok(await f.user(login.cookie));
  const reset = await f.auth('reset-password', { token: raw, password: 'Changed@2026!' });
  assert.deepEqual(reset.data, { ok: true });
  assert.equal(reset.cookie, undefined);
  assert.equal(await f.user(login.cookie), null);
  assert.equal(await f.user(f.registered.cookie), null);
  assert.deepEqual(await f.store.list('session', account.id), []);
  await assert.rejects(f.auth('reset-password', { token: raw, password: 'Another@2026!' }), { code: 'RESET_INVALID' });
  await assert.rejects(f.auth('login', { email: account.email, password: 'Original@2026!' }), { code: 'UNAUTHORIZED' });
  assert.equal((await f.auth('login', { email: account.email, password: 'Changed@2026!' })).data.user.role, 'customer');
});

test('simultaneous reset replay commits one password and expired tokens change neither credentials nor sessions', async t => {
  const f = await fixture(t);
  const raw = await f.resetToken();
  const passwords = ['Changed-first@2026!', 'Changed-second@2026!'];
  const results = await Promise.allSettled(passwords.map(password => f.auth('reset-password', { token: raw, password })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'RESET_INVALID');
  const accepted = passwords[results.findIndex(result => result.status === 'fulfilled')];
  const login = await f.auth('login', { email: f.registered.data.user.email, password: accepted });
  // Install an expired token only in the isolated in-memory store; no wall-clock wait.
  await f.store.put('reset', { id: digest('expired-fixture-token'), userId: f.registered.data.user.id,
    email: f.registered.data.user.email, expiresAt: Date.now() - 1 }, f.registered.data.user.id);
  await assert.rejects(f.auth('reset-password', { token: 'expired-fixture-token', password: 'Unwanted@2026!' }), { code: 'RESET_INVALID' });
  assert.equal((await f.user(login.cookie)).id, f.registered.data.user.id);
  await assert.rejects(f.auth('login', { email: f.registered.data.user.email, password: 'Unwanted@2026!' }), { code: 'UNAUTHORIZED' });
  assert.equal((await f.auth('login', { email: f.registered.data.user.email, password: accepted })).data.user.id, f.registered.data.user.id);
});
