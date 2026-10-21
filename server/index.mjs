import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { settings } from './database.mjs';
import { openDatabase } from './storage.mjs';
import { currentUser, authRoute } from './auth.mjs';
import { publicUser, fail } from './common.mjs';
import { customerRoute } from './cart-and-addresses.mjs';
import { orderRoute } from './orders.mjs';
import { adminRoute } from './admin.mjs';
import { supportRoute } from './support.mjs';
import { customRoute } from './custom.mjs';
import { customPricing, serializeCart } from './custom-summary.mjs';
import { runtimeConfig, allowedOrigin } from './runtime-config.mjs';
import { serveStatic } from './static-files.mjs';
import { authRateLimiter } from './auth-rate-limit.mjs';
import { emailService, startEmailWorker } from './email-service.mjs';
import { mediaRoute, MEDIA_BODY_LIMIT } from './product-media.mjs';
import { promotionRoute } from './promotions.mjs';
import { checkoutQuoteRoute } from './checkout-quote.mjs';
import { checkoutPromotionsRoute } from './checkout-promotions.mjs';
import { securityHeaders } from './security-headers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function readBody(request) {
  if (!['POST', 'PATCH', 'PUT'].includes(request.method)) return {};
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    const limit = /^\/api\/admin\/media(?:\?|$)/.test(request.url) ? MEDIA_BODY_LIMIT : /^\/api\/custom\/(designs|cart)(?:\?|$)/.test(request.url) ? 5_000_000 : 1_048_576;
    if (bytes > limit) fail(413, 'Dữ liệu gửi lên quá lớn.', 'PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!bytes) return {};
  if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'Yêu cầu dữ liệu JSON.', 'CONTENT_TYPE');
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(400, 'Dữ liệu JSON không hợp lệ.');
    return parsed;
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'Dữ liệu JSON không hợp lệ.');
  }
}
async function bootstrap(store, user, mode, mail) {
  const products = (await store.list('product')).filter(product => product.isActive);
  const categories = [...new Map(products.map(product => [product.category, { id: product.category, label: product.categoryLabel }])).values()];
  return {
    user: user ? publicUser(user) : null, products, categories, settings: await settings(store),
    customPricing: await customPricing(store),
    cart: user ? await serializeCart(store, user.id) : [], addresses: user ? await store.list('address', user.id) : [],
    orders: user ? (await store.list('order', user.id)).reverse() : [], mode,
    email: { configured: mail.configured, verificationRequired: mail.configured },
  };
}
export async function createApiServer(options = {}) {
  const config = runtimeConfig(options);
  const limitAuth = authRateLimiter();
  const store = await openDatabase({ ...options, production: config.production, databaseUrl: options.databaseUrl ?? (options.dbPath ? undefined : process.env.DATABASE_URL), dbPath: options.dbPath ?? (process.env.NEP_DB_PATH || resolve(root, 'work/local-data/store.sqlite')), catalogPath: options.catalogPath ?? resolve(root, 'data/catalog.json') });
  const mail = emailService({ store, config, env: options.mailEnv ?? process.env, transport: options.mailTransport });
  const worker = startEmailWorker(mail);
  const server = createServer(async (request, response) => {
    securityHeaders(response, config);
    try {
      if (!allowedOrigin(request, config)) fail(403, 'Nguồn yêu cầu không được phép.', 'FORBIDDEN');
      const path = new URL(request.url, 'http://127.0.0.1').pathname.replace(/\/$/, '');
      if (['/xac-minh-email', '/dat-lai-mat-khau'].includes(path)) response.setHeader('Referrer-Policy', 'no-referrer');
      if (config.production && !/^\/api(?:\/|$)/.test(path)) {
        if (await serveStatic(request, response, options.staticRoot ?? resolve(root, 'dist'))) return;
        fail(405, 'Phương thức không được hỗ trợ.');
      }
      const body = await readBody(request);
      await store.ensureCatalog();
      const user = await currentUser(store, request);
      const ctx = { path, method: request.method, body, store, user, request, response, config, mail };
      if (request.method === 'POST') limitAuth(ctx);
      let result;
      if (request.method === 'GET' && path === '/api/health') { await store.get('settings', 'store'); result = { ok: true, mode: config.mode }; }
      else if (request.method === 'GET' && path === '/api/bootstrap') result = await bootstrap(store, user, config.mode, mail);
      else for (const route of [authRoute, mediaRoute, promotionRoute, checkoutPromotionsRoute, checkoutQuoteRoute, customRoute, customerRoute, orderRoute, supportRoute, adminRoute]) {
        result = await route(ctx);
        if (result !== undefined) break;
      }
      if (result === undefined) fail(404, 'Không tìm thấy API.', 'NOT_FOUND');
      if (response.writableEnded) return;
      response.end(JSON.stringify(result));
    } catch (error) {
      response.statusCode = error.status ?? 500;
      if (error.status === 429 && Number.isSafeInteger(error.retryAfter) && error.retryAfter > 0) response.setHeader('Retry-After', error.retryAfter);
      if (!error.status) options.onError?.(error);
      response.end(JSON.stringify({ error: error.status ? error.message : 'Có lỗi máy chủ. Vui lòng thử lại.', code: error.status ? error.code ?? 'INVALID_INPUT' : 'INTERNAL_ERROR' }));
    }
  });
  server.store = store;
  server.config = config;
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.once('close', () => { worker.stop(); server.closed = worker.finished.then(() => store.close()); });
  return server;
}
export async function startServer(options = {}) {
  const server = await createApiServer(options);
  try {
    await new Promise((accept, reject) => {
      server.once('error', reject);
      server.listen(server.config.port, server.config.host, () => { server.removeListener('error', reject); accept(); });
    });
  } catch (error) {
    server.close();
    throw error;
  }
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const server = await startServer({ onError: () => console.error('API request failed. Check database availability.') });
    console.log(`NẾP FORM ${server.config.mode}: listening on port ${server.address().port}`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  } catch {
    console.error('Startup failed. Check NODE_ENV, APP_ORIGIN, DATABASE_URL, database initialization and port availability.');
    process.exitCode = 1;
  }
}
