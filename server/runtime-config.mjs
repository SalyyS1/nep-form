export function runtimeConfig(options = {}, env = process.env) {
  const production = options.production ?? env.NODE_ENV === 'production';
  let appOrigin = options.appOrigin ?? env.APP_ORIGIN;
  if (production) {
    if (!appOrigin) throw new Error('APP_ORIGIN is required in hosted mode.');
    const origin = new URL(appOrigin);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_ORIGIN must be the exact HTTPS website origin.');
    appOrigin = origin.origin;
  }
  const port = Number(options.port ?? (production ? env.PORT || 3001 : 3001));
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT is invalid.');
  return { production, appOrigin, port, host: options.host ?? env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'), trustProxyLoopback: options.trustProxyLoopback ?? env.TRUST_PROXY_LOOPBACK === 'true', mode: production ? 'production' : 'local' };
}
export function allowedOrigin(request, config) {
  const origin = request.headers.origin;
  if (request.headers['sec-fetch-site'] === 'cross-site' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return false;
  if (!origin) return true; // Non-browser clients and same-origin GET navigations.
  return config.production ? origin === config.appOrigin : /^http:\/\/(127\.0\.0\.1|localhost):(5173|3001)$/.test(origin);
}
