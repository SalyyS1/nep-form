// The built SPA loads scripts/fonts locally; uploaded art needs data/blob images and inline styles.
const contentSecurityPolicy = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:", "font-src 'self' data: blob:", "connect-src 'self'",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(response, { production }) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (production) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    response.setHeader('Content-Security-Policy', contentSecurityPolicy);
  }
}
