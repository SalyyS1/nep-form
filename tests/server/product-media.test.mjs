import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import { startServer } from '../../server/index.mjs';
import { openDatabase } from '../../server/storage.mjs';
import { imageDataUrl, mediaRoute, normalizeProductImage, validateProductMedia } from '../../server/product-media.mjs';
import { downloadPinterestResource, pinterestImageFromHtml, pinterestUrl, publicPinterestAddress } from '../../server/pinterest-image-import.mjs';
import { validateProduct } from '../../server/product-validation.mjs';
import { product } from './test-helpers.mjs';

const admin = { id: 'media-admin', role: 'admin' };
const asDataUrl = buffer => `data:image/png;base64,${buffer.toString('base64')}`;
const png = () => sharp({ create: { width: 12, height: 8, channels: 4, background: '#dd8822' } }).png().toBuffer();
function responseRecorder() {
  const headers = {};
  return { headers, setHeader(name, value) { headers[name] = value; }, end(data) { this.data = data; } };
}
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-product-media-'));
  const options = { dbPath: join(directory, 'media.sqlite'), catalogPath: join(directory, 'catalog.json') };
  await writeFile(options.catalogPath, '[]');
  let store = await openDatabase(options);
  t.after(async () => { await store.close(); await rm(directory, { recursive: true, force: true }); });
  return { options, get store() { return store; }, async reopen() { await store.close(); store = await openDatabase(options); } };
}

test('product media requires administrator and rejects malformed or oversized input', async t => {
  const api = await fixture(t);
  const ctx = { path: '/api/admin/media', method: 'POST', body: { dataUrl: asDataUrl(await png()) }, store: api.store };
  await assert.rejects(mediaRoute(ctx), { status: 401 });
  await assert.rejects(mediaRoute({ ...ctx, user: { role: 'customer' } }), { status: 403 });
  for (const body of [{}, { dataUrl: null }, { url: 'https://pinterest.com/pin/1', dataUrl: ctx.body.dataUrl }, { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }, { dataUrl: 'data:image/png;base64,bm90IGltYWdl' }]) await assert.rejects(mediaRoute({ ...ctx, user: admin, body }), { status: 400 });
  assert.throws(() => imageDataUrl(asDataUrl(Buffer.alloc(4_000_001))), { status: 413 });
  await assert.rejects(mediaRoute({ ...ctx, user: admin, body: { url: 'http://pinterest.com/pin/1' } }), { status: 400 });
  await assert.rejects(mediaRoute({ ...ctx, user: admin, body: { url: 'https://127.0.0.1/image.png' } }), { status: 400 });
  assert.equal((await api.store.list('media')).length, 0);
});

test('upload decodes to WebP, persists across reopen, and is publicly readable', async t => {
  const api = await fixture(t);
  const uploaded = await mediaRoute({ path: '/api/admin/media', method: 'POST', user: admin, body: { dataUrl: asDataUrl(await png()) }, store: api.store });
  assert.match(uploaded.url, /^\/api\/media\/[0-9a-f-]{36}$/);
  assert.equal(uploaded.width, 12); assert.equal(uploaded.height, 8);
  assert.equal((await api.store.list('audit'))[0].action, 'media.create');
  await api.reopen();
  const response = responseRecorder();
  await mediaRoute({ path: uploaded.url, method: 'GET', user: null, store: api.store, response });
  assert.equal(response.headers['Content-Type'], 'image/webp');
  assert.equal(response.headers['Content-Length'], response.data.length);
  assert.match(response.headers['Cache-Control'], /immutable/);
  assert.equal((await sharp(response.data).metadata()).format, 'webp');
  await validateProductMedia(api.store, [uploaded.url]);
  await assert.rejects(validateProductMedia(api.store, ['/api/media/00000000-0000-0000-0000-000000000000']), { status: 400 });
  await assert.rejects(mediaRoute({ path: '/api/media/00000000-0000-0000-0000-000000000000', method: 'GET', store: api.store }), { status: 404 });
});

test('full image decoder rejects a truncated file, SVG and oversized pixel dimensions', async () => {
  const data = await png();
  await assert.rejects(normalizeProductImage(data.subarray(0, data.length - 25)), { status: 400 });
  await assert.rejects(normalizeProductImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>')), { status: 400 });
  const large = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(normalizeProductImage(large), { status: 400 });
});

test('Pinterest import restricts every URL and rejects private, reserved or mixed DNS answers', async () => {
  for (const url of ['http://www.pinterest.com/pin/1', 'https://pinterest.com.evil.test/pin/1', 'https://pinterest.com@127.0.0.1/x', 'https://www.pinterest.com:8080/pin/1', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://example.com/image.png']) assert.throws(() => pinterestUrl(url), { status: 400 });
  assert.equal(pinterestUrl('https://pin.it/example').hostname, 'pin.it');
  assert.throws(() => pinterestUrl('https://pinterest.com/pin/1', true), { status: 400 });
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1', '198.18.0.1', '0.0.0.0', '224.0.0.1', '::1', '::ffff:127.0.0.1']) await assert.rejects(publicPinterestAddress('i.pinimg.com', async () => [{ address }]), { status: 400 });
  await assert.rejects(publicPinterestAddress('i.pinimg.com', async () => [{ address: '8.8.8.8' }, { address: '127.0.0.1' }]), { status: 400 });
  assert.equal(await publicPinterestAddress('i.pinimg.com', async () => [{ address: '8.8.8.8' }]), '8.8.8.8');
  assert.equal(pinterestImageFromHtml('<meta content="https://i.pinimg.com/originals/photo.jpg?a=1&amp;b=2" property="og:image">'), 'https://i.pinimg.com/originals/photo.jpg?a=1&b=2');
  assert.throws(() => pinterestImageFromHtml('<meta property="og:image" content="https://127.0.0.1/photo.png">'), { status: 400 });
  assert.throws(() => pinterestImageFromHtml('<html>No metadata</html>'), { status: 400 });
});

test('product image fields accept managed photos and direct HTTPS, reject page links and unsafe paths', () => {
  for (const image of ['/api/media/00000000-0000-0000-0000-000000000000', '/images/existing.webp', 'https://images.example.test/photo.jpg']) assert.equal(validateProduct({ ...product, images: [image] }).images[0], image);
  for (const image of ['http://example.test/photo.jpg', '//example.test/photo.jpg', '/images/../secret', '/images/%2e%2e/secret', '/images/a\\b', 'data:image/png;base64,x', 'https://pinterest.com/pin/1', 'https://user:pass@example.test/a.jpg']) assert.throws(() => validateProduct({ ...product, images: [image] }), { status: 400 });
  const existing = { ...product, images: ['http://old.example.test/a.jpg'] };
  assert.equal(validateProduct({ name: 'Updated name' }, existing).images[0], existing.images[0]);
});

test('Pinterest downloader pins socket DNS and revalidates redirects, response sizes and time budget', async () => {
  const seen = [];
  let responses = [];
  const requestImpl = (url, options, callback) => {
    seen.push(url.href);
    options.lookup(url.hostname, { all: true }, (error, addresses) => { assert.equal(error, null); assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]); });
    const req = new EventEmitter(); req.destroy = () => {};
    req.end = () => queueMicrotask(() => {
      const spec = responses.shift();
      if (!spec) return;
      const response = new EventEmitter(); response.destroy = () => {}; Object.assign(response, { statusCode: spec.status ?? 200, headers: spec.headers ?? { 'content-type': 'image/png' } });
      callback(response);
      for (const chunk of spec.chunks || []) response.emit('data', chunk);
      response.emit('end');
    });
    return req;
  };
  const safe = { resolver: async () => [{ address: '8.8.8.8' }], requestImpl };
  responses = [{ chunks: [Buffer.from('raster bytes')] }];
  assert.equal((await downloadPinterestResource('https://i.pinimg.com/photo.png', safe)).data.toString(), 'raster bytes');
  responses = [{ status: 302, headers: { location: 'https://127.0.0.1/private' } }];
  const before = seen.length;
  await assert.rejects(downloadPinterestResource('https://www.pinterest.com/pin/1', safe), { status: 400 });
  assert.equal(seen.length, before + 1);
  responses = [{ status: 302, headers: { location: 'https://i.pinimg.com/photo.png' } }];
  await assert.rejects(downloadPinterestResource('https://www.pinterest.com/pin/1', { ...safe, resolver: async hostname => [{ address: hostname === 'i.pinimg.com' ? '169.254.169.254' : '8.8.8.8' }] }), { status: 400 });
  responses = [{ chunks: [Buffer.alloc(4_000_001)] }];
  await assert.rejects(downloadPinterestResource('https://i.pinimg.com/photo.png', safe), { status: 413 });
  responses = [{ headers: { 'content-type': 'image/png', 'content-length': '4000001' } }];
  await assert.rejects(downloadPinterestResource('https://i.pinimg.com/photo.png', safe), { status: 400 });
  responses = [{ headers: { 'content-type': 'text/html' } }];
  await assert.rejects(downloadPinterestResource('https://i.pinimg.com/photo.png', safe), { status: 400 });
  responses = Array.from({ length: 5 }, () => ({ status: 302, headers: { location: '/again' } }));
  await assert.rejects(downloadPinterestResource('https://i.pinimg.com/photo.png', safe), { status: 400 });
  responses = [];
  await assert.rejects(downloadPinterestResource('https://i.pinimg.com/photo.png', { ...safe, deadline: Date.now() + 30 }), { status: 400 });
});

test('HTTP media route enforces admin auth, expanded body cap, public bytes and product media existence', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'nep-product-media-http-'));
  const catalogPath = join(directory, 'catalog.json'); await writeFile(catalogPath, '[]');
  const server = await startServer({ dbPath: join(directory, 'test.sqlite'), catalogPath, port: 0 });
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await server.closed; await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, cookie = '') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
  assert.equal((await post('/api/admin/media', { dataUrl: asDataUrl(await png()) })).status, 401);
  const login = await post('/api/auth/login', { email: 'admin@nepform.local', password: 'Nepform@2026!' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const largePng = await sharp(randomBytes(720 * 720 * 3), { raw: { width: 720, height: 720, channels: 3 } }).png().toBuffer();
  assert.ok(asDataUrl(largePng).length > 1_048_576);
  const upload = await post('/api/admin/media', { dataUrl: asDataUrl(largePng) }, cookie);
  assert.equal(upload.status, 200);
  const uploaded = await upload.json();
  const publicImage = await fetch(`${base}${uploaded.url}`);
  assert.equal(publicImage.status, 200); assert.equal(publicImage.headers.get('content-type'), 'image/webp');
  assert.equal((await sharp(Buffer.from(await publicImage.arrayBuffer())).metadata()).width, 720);
  assert.equal((await post('/api/admin/products', { ...product, images: [uploaded.url] }, cookie)).status, 200);
  assert.equal((await post('/api/admin/products', { ...product, slug: 'missing-media', images: ['/api/media/00000000-0000-0000-0000-000000000000'] }, cookie)).status, 400);
  assert.equal((await post('/api/admin/media', { dataUrl: 'x'.repeat(6_000_001) }, cookie)).status, 413);
});
