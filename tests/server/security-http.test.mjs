import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startServer } from '../../server/index.mjs';
import { securityHeaders } from '../../server/security-headers.mjs';

test('production policy rejects framing, external/inline scripts and unused device access while allowing Studio assets', () => {
  const headers = new Map();
  securityHeaders({ setHeader: (name, value) => headers.set(name, value) }, { production: true });
  const policy = headers.get('Content-Security-Policy');
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /script-src 'self';/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'none'/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /img-src 'self' https: data: blob:/);
  assert.match(policy, /font-src 'self' data: blob:/);
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.equal(headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
});

test('HTTP errors never disclose driver codes and still carry security headers', async t => {
  const server = await startServer({ dbPath: ':memory:', port: 0, mailEnv: {} });
  t.after(async () => { server.close(); await once(server, 'close'); await server.closed; });
  const original = server.store.ensureCatalog;
  server.store.ensureCatalog = async () => { throw Object.assign(new Error('private database details'), { code: 'PRIVATE_DRIVER_CODE' }); };
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.deepEqual(await response.json(), { error: 'Có lỗi máy chủ. Vui lòng thử lại.', code: 'INTERNAL_ERROR' });
  server.store.ensureCatalog = original;
  const invalid = await fetch(`http://127.0.0.1:${server.address().port}/api/bootstrap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_INPUT');
});
