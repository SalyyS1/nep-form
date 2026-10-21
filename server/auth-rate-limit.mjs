import { digest, fail } from './common.mjs';
import { isIP } from 'node:net';

export function authClientAddress(request, config) {
  const peer = request.socket.remoteAddress ?? 'unknown';
  const forwarded = request.headers?.['x-real-ip'];
  // Nginx overwrites this header. Never trust client-supplied proxy headers on a public socket.
  if (config.trustProxyLoopback && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) && typeof forwarded === 'string' && isIP(forwarded)) return forwarded.toLowerCase().replace(/^::ffff:(?=\d+\.)/, '');
  return peer;
}

// Best-effort single-instance limiter for hosted auth; the database still owns sessions.
export function authRateLimiter() {
  const buckets = new Map();
  return ({ path, body, request, response, config }) => {
    if (!config.production || !/^\/api\/auth\/(login|register|request-reset|reset-password|verify-email|resend-verification)$/.test(path)) return;
    const now = Date.now(); const window = 10 * 60000;
    if (buckets.size >= 1000) for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
    const account = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const keys = [[digest(`peer:${authClientAddress(request, config)}`), 100]];
    if (account) keys.push([digest(`account:${account}`), 10]);
    for (const [key, max] of keys) {
      const bucket = buckets.get(key);
      if (bucket && bucket.until > now && bucket.count >= max) { response.setHeader('Retry-After', Math.ceil((bucket.until - now) / 1000)); fail(429, 'Bạn đã thử nhiều lần. Vui lòng chờ vài phút rồi thử lại.', 'AUTH_RATE_LIMIT'); }
    }
    if (buckets.size >= 10000) fail(429, 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 'AUTH_RATE_LIMIT');
    for (const [key] of keys) {
      const current = buckets.get(key);
      buckets.set(key, current?.until > now ? { ...current, count: current.count + 1 } : { count: 1, until: now + window });
    }
  };
}
