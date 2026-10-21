import test from 'node:test';
import assert from 'node:assert/strict';
import { authRateLimiter, authClientAddress } from '../../server/auth-rate-limit.mjs';

function request(address, forwarded) { return { socket: { remoteAddress: address }, headers: { 'x-real-ip': forwarded } }; }
function attempt(limiter, peer, forwarded, index, trusted = true) {
  return limiter({path:'/api/auth/login', body:{email:`person-${index}@example.test`},request:request(peer,forwarded),response:{setHeader(){}},config:{production:true,trustProxyLoopback:trusted}});
}
test('trusted loopback proxy clients get separate peer buckets, account limits still apply', () => {
  const limit = authRateLimiter();
  for(let i=0;i<100;i++) attempt(limit,'127.0.0.1','203.0.113.10',i);
  assert.throws(()=>attempt(limit,'127.0.0.1','203.0.113.10',101),{code:'AUTH_RATE_LIMIT'});
  assert.doesNotThrow(()=>attempt(limit,'127.0.0.1','203.0.113.11',102));
  const accountLimit = authRateLimiter();
  for(let i=0;i<10;i++) attempt(accountLimit,'127.0.0.1',`203.0.113.${i+1}`,0);
  assert.throws(()=>attempt(accountLimit,'127.0.0.1','203.0.113.99',0),{code:'AUTH_RATE_LIMIT'});
});
test('untrusted peers cannot spoof their limiter identity and invalid/multiple forwarded values are ignored', () => {
  const limit = authRateLimiter();
  for(let i=0;i<100;i++) attempt(limit,'198.51.100.20',`203.0.113.${i}`,i);
  assert.throws(()=>attempt(limit,'198.51.100.20','192.0.2.55',101),{code:'AUTH_RATE_LIMIT'});
  assert.equal(authClientAddress(request('127.0.0.1','1.1.1.1'),{}),'127.0.0.1');
  for(const header of ['1.1.1.1, 8.8.8.8',['1.1.1.1'],'not-an-ip']) assert.equal(authClientAddress(request('::1',header),{trustProxyLoopback:true}),'::1');
});
