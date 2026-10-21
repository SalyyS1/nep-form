import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { startServer } from '../../server/index.mjs';
import { product, address } from './test-helpers.mjs';
import { createTemplateLayers } from '../../shared/design-template-catalog.mjs';
import { normalizedTextEffects } from '../../shared/text-effects.mjs';

const textLayer = () => ({ id: 'text-1', kind: 'text', x: 40, y: 50, width: 220, height: 60, rotation: 0, opacity: 1, fill: '#20201e', text: 'Nếp của tôi', fontFamily: 'Be Vietnam Pro', fontWeight: 600 });
const project = () => ({ version: 1, name: 'Áo của tôi', productId: 'blank', color: 'Trắng', size: 'M', faces: { front: { area: 'medium', layers: [textLayer()] }, back: { area: 'small', layers: [] } } });
const png = `data:image/png;base64,${(await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer()).toString('base64')}`;
const customFont = { id: 'lora-demo', name: 'Lora của tôi', dataUrl: `data:font/ttf;base64,${(await readFile(new URL('../../public/fonts/lora-italic-400.ttf', import.meta.url))).toString('base64')}` };
async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'nep-custom-'));
  const catalogPath = join(directory, 'catalog.json'), dbPath = join(directory, 'test.sqlite');
  await writeFile(catalogPath, JSON.stringify([product, { ...product, id: 'blank', slug: 'blank', isCustomBase: true }]));
  let server = await startServer({ catalogPath, dbPath, port: 0, onError: error => console.error(error) });
  t.after(async () => { server.close(); await once(server, 'close'); await rm(directory, { recursive: true, force: true }); });
  const client = () => {
    let cookie = '';
    return async (path, method = 'GET', body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = response.headers.get('content-type').includes('application/json') ? await response.json() : await response.text();
      return { status: response.status, data, headers: response.headers };
    };
  };
  const alice = client(), bob = client(), admin = client(), guest = client();
  await alice('/api/auth/register', 'POST', { email: 'alice@example.test', password: 'Customer@2026!', name: 'Alice' });
  await bob('/api/auth/register', 'POST', { email: 'bob@example.test', password: 'Customer@2026!', name: 'Bob' });
  await admin('/api/auth/login', 'POST', { email: 'admin@nepform.local', password: 'Nepform@2026!' });
  return { alice, bob, admin, guest, restart: async () => { server.close(); await once(server, 'close'); server = await startServer({ catalogPath, dbPath, port: 0 }); } };
}
async function quote(request) {
  const { data } = await request('/api/bootstrap');
  const items = data.cart.map(item => ({ productId: item.productId, size: item.size, color: item.color, quantity: item.quantity, unitPrice: item.custom?.unitPrice ?? data.products.find(p => p.id === item.productId).price, ...(item.custom ? { designId: item.custom.designId } : {}) }));
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return { items, subtotal, shipping: data.settings.shippingFee, total: subtotal + data.settings.shippingFee };
}
async function order(request, key, expectedQuote) {
  return request('/api/orders', 'POST', { address, paymentMethod: 'cod', idempotencyKey: key, expectedQuote: expectedQuote ?? await quote(request) });
}

test('text effects persist with an ordered design and render identically in private artwork after restart', async t => {
  const { alice,bob,admin,restart } = await setup(t);
  const input = project(); const effects = normalizedTextEffects({curve:75,outlineWidth:3,outlineColor:'#f7f5f0',shadow:{enabled:true,color:'#9a482e',offsetX:-4,offsetY:6,blur:2,opacity:.8}});
  input.faces.front.layers[0] = {...textLayer(),fontFamily:'builtin:pacifico',textEffects:effects};
  input.faces.back.layers = [{...textLayer(),text:'Cong xuống',textEffects:{...effects,curve:-65}}];
  assert.equal((await alice('/api/custom/cart','POST',{project:input,quantity:1})).status,200);
  const placed = await order(alice,'text-effects-order'); assert.equal(placed.status,200);
  const designId = placed.data.order.items[0].custom.designId;
  const artwork = (await alice(`/api/custom/designs/${designId}/artwork/front`)).data;
  assert.match(artwork,/<textPath/); assert.match(artwork,/<feDropShadow/); assert.match(artwork,/stroke-width="6"/);
  await restart();
  const saved = (await alice(`/api/custom/designs/${designId}`)).data.design.project;
  assert.deepEqual(saved.faces.front.layers[0].textEffects,effects); assert.equal(saved.faces.back.layers[0].textEffects.curve,-65);
  assert.equal((await admin(`/api/custom/designs/${designId}/artwork/front`)).data,artwork);
  assert.match((await admin(`/api/custom/designs/${designId}/preview/back`)).data,/<textPath/);
  assert.equal((await bob(`/api/custom/designs/${designId}/artwork/front`)).status,404);
  for (const textEffects of [{curve:1000},{outlineColor:'url(https://evil.test)'},{shadow:{offsetX:21}}]) {
    input.faces.front.layers[0].textEffects = textEffects;
    assert.equal((await alice('/api/custom/designs','POST',{project:input})).data.code,'INVALID_TEXT_EFFECTS');
  }
  input.faces.front.layers[0] = {...textLayer(),kind:'shape',shape:'heart',textEffects:effects};
  assert.equal((await alice('/api/custom/designs','POST',{project:input})).data.code,'INVALID_TEXT_EFFECTS');
});

test('new template stickers stay editable in private saved designs and ordered artwork after restart', async t => {
  const { alice, bob, admin, restart } = await setup(t);
  const input = project(); input.faces.front.layers = createTemplateLayers('cat-day'); input.faces.front.layers[0].text = 'Mèo của riêng tôi';
  input.faces.back.layers = createTemplateLayers('mountain-trip');
  assert.equal((await alice('/api/custom/cart','POST',{project:input,quantity:1})).status,200);
  const placed = await order(alice,'template-sticker-order'); assert.equal(placed.status,200);
  const designId = placed.data.order.items[0].custom.designId;
  await restart();
  const saved = (await alice(`/api/custom/designs/${designId}`)).data.design.project;
  assert.equal(saved.faces.front.layers[0].text,'Mèo của riêng tôi');
  assert.equal(saved.faces.front.layers[1].shape,'cat');
  assert.equal(saved.faces.back.layers[0].shape,'compass');
  const artwork = await admin(`/api/custom/designs/${designId}/artwork/front`);
  assert.match(artwork.data,/Mèo của riêng tôi/); assert.match(artwork.data,/nep-builtin-patrickhand/);
  assert.equal((await bob(`/api/custom/designs/${designId}/preview/front`)).status,404);
});

test('custom font follows saved designs and ordered artwork across restarts with private access', async t => {
  const { alice, bob, admin, restart } = await setup(t);
  const input = project(); input.fonts = [customFont]; input.faces.front.layers[0].fontFamily = 'custom:lora-demo';
  const result = await alice('/api/custom/cart', 'POST', { project: input, quantity: 1 });
  assert.equal(result.status, 200);
  const placed = await order(alice, 'font-order'); assert.equal(placed.status, 200);
  const designId = placed.data.order.items[0].custom.designId;
  await restart();
  assert.deepEqual((await alice(`/api/custom/designs/${designId}`)).data.design.project.fonts, [customFont]);
  for (const suffix of ['preview/front', 'artwork/front']) {
    const response = await admin(`/api/custom/designs/${designId}/${suffix}`);
    assert.equal(response.status, 200);
    assert.ok(response.data.includes(customFont.dataUrl));
    assert.match(response.data, /font-family="nep-custom-lora-demo"/);
    assert.equal((await bob(`/api/custom/designs/${designId}/${suffix}`)).status, 404);
  }
  const broken = project(); broken.faces.front.layers[0].fontFamily = 'custom:missing';
  assert.equal((await alice('/api/custom/designs', 'POST', { project: broken })).status, 400);
  assert.ok(!JSON.stringify((await alice('/api/custom/designs')).data).includes('data:font/'));
});

test('bundled Vietnamese fonts persist by allowlisted ID and embed only the face fonts in SVG', async t => {
  const { alice, admin, restart } = await setup(t);
  const input = project(); input.faces.front.layers[0].fontFamily = 'builtin:pacifico';
  input.faces.back.layers = [{ ...textLayer(), fontFamily: 'builtin:bangers' }];
  const added = await alice('/api/custom/cart', 'POST', { project: input, quantity: 1 });
  assert.equal(added.status, 200);
  const placed = await order(alice, 'bundled-font-order'); assert.equal(placed.status, 200);
  const designId = placed.data.order.items[0].custom.designId;
  await restart();
  const saved = (await alice(`/api/custom/designs/${designId}`)).data.design.project;
  assert.equal(saved.faces.front.layers[0].fontFamily, 'builtin:pacifico');
  assert.equal(saved.fonts, undefined, 'Built-in fonts do not consume the customer upload quota');
  const front = (await admin(`/api/custom/designs/${designId}/artwork/front`)).data;
  assert.match(front, /@font-face\{font-family:nep-builtin-pacifico/);
  assert.ok(!front.includes('@font-face{font-family:nep-builtin-bangers'));
  assert.match((await admin(`/api/custom/designs/${designId}/preview/back`)).data, /@font-face\{font-family:nep-builtin-bangers/);
  input.faces.front.layers[0].fontFamily = 'builtin:unknown';
  assert.equal((await alice('/api/custom/designs', 'POST', { project: input })).status, 400);
});

test('custom designs require ownership, save immutable versions and serve escaped private previews/artwork', async t => {
  const { alice, bob, admin, guest, restart } = await setup(t);
  const input = project(); input.faces.front.layers[0].text = '<script>alert("hello")</script>';
  assert.equal((await guest('/api/custom/designs', 'POST', { project: input })).status, 401);
  const first = await alice('/api/custom/designs', 'POST', { project: input });
  assert.equal(first.status, 200);
  const saved = first.data.design;
  assert.equal(saved.colorHex, '#ffffff');
  input.name = 'Phiên bản mới';
  const second = await alice('/api/custom/designs', 'POST', { project: input });
  assert.notEqual(second.data.design.id, saved.id);
  assert.equal((await alice(`/api/custom/designs/${saved.id}`)).data.design.project.name, 'Áo của tôi');
  for (const suffix of ['', '/preview/front', '/preview/back', '/artwork/front']) {
    assert.equal((await guest(`/api/custom/designs/${saved.id}${suffix}`)).status, 401);
    assert.equal((await bob(`/api/custom/designs/${saved.id}${suffix}`)).status, 404);
    assert.equal((await admin(`/api/custom/designs/${saved.id}${suffix}`)).status, 200);
  }
  const preview = await alice(`/api/custom/designs/${saved.id}/preview/front`);
  assert.match(preview.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(preview.headers.get('content-security-policy'), /sandbox/);
  assert.match(preview.headers.get('content-security-policy'), /font-src data:/);
  assert.match(preview.data, /@font-face/);
  assert.ok(!preview.data.includes('<script>'));
  assert.ok(preview.data.includes('&lt;script&gt;'));
  const artwork = await alice(`/api/custom/designs/${saved.id}/artwork/front`);
  assert.match(artwork.headers.get('content-disposition'), /attachment;/);
  const base = (await admin('/api/admin')).data.products.find(product => product.id === 'blank');
  // Saved previews retain their original shirt color even when the palette entry disappears.
  const edited = await admin('/api/admin/products/blank', 'PATCH', {
    ...base, expectedVersion: base.version, colors: [{ name: 'Kem', hex: '#112233' }],
    variants: base.variants.map(variant => ({ ...variant, color: 'Kem' })),
  });
  assert.equal(edited.status, 200);
  const retainedPreview = await alice(`/api/custom/designs/${saved.id}/preview/front`);
  assert.match(retainedPreview.data, /fill="#ffffff"/);
  assert.ok(!retainedPreview.data.includes('fill="#112233"'));
  assert.equal((await bob('/api/custom/designs')).data.designs.length, 0);
  await restart();
  assert.equal((await alice('/api/custom/designs')).data.designs.length, 2);
  assert.equal((await alice(`/api/custom/designs/${saved.id}`)).data.design.project.name, 'Áo của tôi');
  assert.match((await alice(`/api/custom/designs/${saved.id}/preview/back`)).data, /fill="#ffffff"/);
});

test('custom validation enforces raster signatures, decoded budget, layer count and safe geometry', async t => {
  const { alice } = await setup(t);
  const upload = project(); upload.faces.front.layers = [{ ...textLayer(), kind: 'image', src: png }];
  assert.equal((await alice('/api/custom/designs', 'POST', { project: upload })).status, 200);
  for (const format of ['jpeg', 'webp']) {
    const bytes = await sharp(Buffer.from(png.split(',')[1], 'base64')).toFormat(format).toBuffer();
    upload.faces.front.layers[0].src = `data:image/${format};base64,${bytes.toString('base64')}`;
    assert.equal((await alice('/api/custom/designs', 'POST', { project: upload })).status, 200);
  }
  const falseJpeg = Buffer.from([255, 216, 255, 0, 0, 0, 0, 0, 255, 217]);
  const falseWebp = Buffer.alloc(20); falseWebp.write('RIFF'); falseWebp.writeUInt32LE(12, 4); falseWebp.write('WEBPVP8 ', 8);
  for (const src of ['https://example.com/image.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,PHN2Zy8+', png.replace('image/png', 'image/jpeg'), `data:image/jpeg;base64,${falseJpeg.toString('base64')}`, `data:image/webp;base64,${falseWebp.toString('base64')}`]) {
    upload.faces.front.layers[0].src = src;
    assert.equal((await alice('/api/custom/designs', 'POST', { project: upload })).status, 400);
  }
  // Both faces share one decoded byte budget; every source also has a bounded encoded size.
  const large = await sharp(randomBytes(600 * 600 * 3), { raw: { width: 600, height: 600, channels: 3 } }).png().toBuffer();
  assert.ok(large.length > 1024 * 1024 && large.length < 2 * 1024 * 1024);
  upload.faces.front.layers[0].src = `data:image/png;base64,${large.toString('base64')}`;
  upload.faces.back.layers = [{ ...upload.faces.front.layers[0], id: 'image-back' }];
  assert.equal((await alice('/api/custom/designs', 'POST', { project: upload })).data.code, 'IMAGE_TOO_LARGE');
  upload.faces.back.layers = [];
  for (const [width, height] of [[9000, 2], [5000, 4000]]) {
    const bytes = await sharp({ create: { width, height, channels: 3, background: '#fff' } }).png().toBuffer();
    upload.faces.front.layers[0].src = `data:image/png;base64,${bytes.toString('base64')}`;
    assert.equal((await alice('/api/custom/designs', 'POST', { project: upload })).data.code, 'INVALID_IMAGE');
  }
  const invalid = [
    p => { p.faces.front.layers = Array.from({ length: 21 }, (_, index) => ({ ...textLayer(), id: String(index) })); },
    p => { p.faces.front.layers[0].x = 1e20; }, p => { p.faces.front.layers[0].opacity = 2; },
    p => { p.faces.front.layers[0].fontFamily = 'url(https://evil.test)'; },
    p => { p.faces.front.layers[0].fill = '#fff" onload="x'; },
    p => { p.faces.front.layers[0].locked = 'true'; }, p => { p.faces.front.layers.push(textLayer()); },
    p => { p.faces.front.layers[0] = { ...textLayer(), kind: 'shape', shape: 'script' }; },
    p => { p.version = 2; }, p => { p.productId = 'shirt'; },
  ];
  for (const mutate of invalid) {
    const input = project(); mutate(input);
    assert.ok([400, 409].includes((await alice('/api/custom/designs', 'POST', { project: input })).status));
  }
  assert.equal((await alice('/api/custom/designs')).data.designs.length, 3);
  const blank = project(); blank.faces.front.layers = [];
  assert.equal((await alice('/api/custom/designs', 'POST', { project: blank })).status, 200);
  assert.equal((await alice('/api/custom/cart', 'POST', { project: blank, quantity: 1 })).data.code, 'EMPTY_DESIGN');
});

test('design lists paginate lightweight owner metadata while single retrieval retains artwork', async t => {
  const { alice, bob } = await setup(t);
  const ids = [];
  for (let index = 0; index < 15; index++) {
    const input = project(); input.name = `Thiết kế ${index}`;
    if (index === 14) input.faces.front.layers = [{ ...textLayer(), kind: 'image', src: png }];
    const saved = await alice('/api/custom/designs', 'POST', { project: input });
    assert.equal(saved.status, 200); ids.push(saved.data.design.id);
  }
  const first = await alice('/api/custom/designs');
  assert.equal(first.data.designs.length, 12); assert.equal(first.data.hasMore, true); assert.equal(first.data.nextOffset, 12);
  assert.equal(first.data.designs[0].id, ids[14]);
  assert.deepEqual(Object.keys(first.data.designs[0].project).sort(), ['color', 'name', 'productId', 'size']);
  assert.ok(!JSON.stringify(first.data).includes('data:image/'));
  const next = await alice(`/api/custom/designs?offset=${first.data.nextOffset}&limit=12`);
  assert.equal(next.data.designs.length, 3); assert.equal(next.data.hasMore, false); assert.equal(next.data.nextOffset, null);
  assert.equal(new Set([...first.data.designs, ...next.data.designs].map(design => design.id)).size, 15);
  assert.equal((await alice('/api/custom/designs?offset=15&limit=12')).data.designs.length, 0);
  assert.equal((await alice('/api/custom/designs?limit=2')).data.designs.length, 2);
  assert.deepEqual((await bob('/api/custom/designs')).data, { designs: [], hasMore: false, nextOffset: null });
  for (const query of ['limit=0', 'limit=51', 'limit=no', 'offset=-1', 'offset=1.5']) assert.equal((await alice(`/api/custom/designs?${query}`)).status, 400);
  const full = await alice(`/api/custom/designs/${ids[14]}`);
  assert.equal(full.data.design.project.faces.front.layers[0].src, png);
});

test('concurrent image validation adds only cart stock that remains available at commit', async t => {
  const { alice } = await setup(t);
  const input = project(); input.faces.front.layers = [{ ...textLayer(), kind: 'image', src: png }];
  const results = await Promise.all([
    alice('/api/custom/cart', 'POST', { project: input, quantity: 2 }),
    alice('/api/custom/cart', 'POST', { project: input, quantity: 2 }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const bootstrap = (await alice('/api/bootstrap')).data;
  assert.equal(bootstrap.cart.length, 1); assert.equal(bootstrap.cart[0].quantity, 2);
  assert.equal(bootstrap.products.find(product => product.id === 'blank').stock, 3);
  assert.equal((await alice('/api/custom/designs')).data.designs.length, 1);
});

test('server prices custom carts, detects stale quotes and snapshots order price/design with idempotency', async t => {
  const { alice, admin, guest } = await setup(t);
  let pricing = (await guest('/api/custom/pricing')).data.pricing;
  assert.equal(pricing.text, 35000);
  assert.equal((await alice('/api/admin/custom-pricing')).status, 403);
  assert.equal((await guest('/api/admin/custom-pricing')).status, 401);
  assert.equal((await alice('/api/cart', 'POST', { productId: 'blank', size: 'M', color: 'Trắng', quantity: 1 })).data.code, 'CUSTOM_DESIGN_REQUIRED');
  assert.equal((await alice('/api/cart', 'POST', { productId: 'shirt', size: 'M', color: 'Trắng', quantity: 1, custom: { designId: 'fake', unitPrice: 1 } })).status, 400);
  const input = project();
  input.faces.back.layers = [{ ...textLayer(), hidden: true }];
  assert.equal((await alice('/api/custom/cart', 'POST', { project: input, quantity: 1, unitPrice: 1 })).status, 200);
  let bootstrap = (await alice('/api/bootstrap')).data;
  const custom = bootstrap.cart[0].custom;
  assert.equal(custom.unitPrice, 310000); assert.equal(custom.surcharge, 60000);
  assert.deepEqual(custom.faces, ['front']);
  const previous = await quote(alice);
  pricing = (await admin('/api/admin/custom-pricing', 'PATCH', { pricing: { ...pricing, text: 45000 }, expectedVersion: pricing.version })).data.pricing;
  assert.equal((await admin('/api/admin/custom-pricing', 'PATCH', { pricing, expectedVersion: pricing.version - 1 })).data.code, 'PRICING_VERSION_CONFLICT');
  assert.equal((await admin('/api/admin/custom-pricing', 'PATCH', { pricing: { ...pricing, image: -1 }, expectedVersion: pricing.version })).status, 400);
  assert.equal((await order(alice, 'stale', previous)).data.code, 'CART_CHANGED');
  bootstrap = (await alice('/api/bootstrap')).data;
  assert.equal(bootstrap.cart[0].custom.unitPrice, 320000);
  const expected = await quote(alice);
  const missing = structuredClone(expected); delete missing.items[0].designId;
  assert.equal((await order(alice, 'missing-design', missing)).data.code, 'CART_CHANGED');
  const wrong = structuredClone(expected); wrong.items[0].designId = 'another-design';
  assert.equal((await order(alice, 'wrong-design', wrong)).data.code, 'CART_CHANGED');
  const placed = await order(alice, 'final', expected);
  assert.equal(placed.status, 200); assert.equal(placed.data.order.items[0].unitPrice, 320000);
  assert.equal(placed.data.order.items[0].custom.designId, custom.designId);
  await admin('/api/admin/custom-pricing', 'PATCH', { pricing: { ...pricing, text: 80000 }, expectedVersion: pricing.version });
  const currentProduct = (await admin('/api/admin')).data.products.find(p => p.id === 'blank');
  await admin('/api/admin/products/blank', 'PATCH', { ...currentProduct, price: 400000, expectedVersion: currentProduct.version });
  const snapshot = (await alice(`/api/orders/${placed.data.order.id}`)).data.order;
  assert.deepEqual(snapshot.items[0].custom, placed.data.order.items[0].custom);
  assert.equal((await order(alice, 'final', expected)).data.order.id, snapshot.id);
  assert.equal((await order(alice, 'final', { ...expected, total: 1 })).data.code, 'IDEMPOTENCY_CONFLICT');
  await alice('/api/custom/cart', 'POST', { project: project(), quantity: 1 });
  assert.equal((await alice('/api/bootstrap')).data.cart[0].custom.unitPrice, 505000);
});

test('multiple designs remain distinct and share variant stock through checkout and cancellation', async t => {
  const { alice, admin } = await setup(t);
  await alice('/api/custom/cart', 'POST', { project: project(), quantity: 2 });
  const second = project(); second.name = 'Thiết kế thứ hai';
  await alice('/api/custom/cart', 'POST', { project: second, quantity: 1 });
  let bootstrap = (await alice('/api/bootstrap')).data;
  assert.equal(bootstrap.cart.length, 2);
  assert.notEqual(bootstrap.cart[0].custom.designId, bootstrap.cart[1].custom.designId);
  assert.equal((await alice('/api/custom/cart', 'POST', { project: project(), quantity: 1 })).data.code, 'OUT_OF_STOCK');
  assert.equal((await alice(`/api/cart/${bootstrap.cart[1].id}`, 'PATCH', { quantity: 2 })).data.code, 'OUT_OF_STOCK');
  assert.equal((await alice('/api/custom/designs')).data.designs.length, 2);
  let base = (await admin('/api/admin')).data.products.find(p => p.id === 'blank');
  await admin('/api/admin/products/blank', 'PATCH', { ...base, variants: base.variants.map(v => ({ ...v, stock: 2 })), expectedVersion: base.version });
  assert.equal((await order(alice, 'aggregate-too-many')).data.code, 'OUT_OF_STOCK');
  bootstrap = (await alice('/api/bootstrap')).data;
  assert.equal(bootstrap.cart.length, 2); assert.equal(bootstrap.orders.length, 0);
  assert.equal(bootstrap.products.find(p => p.id === 'blank').stock, 2);
  base = (await admin('/api/admin')).data.products.find(p => p.id === 'blank');
  await admin('/api/admin/products/blank', 'PATCH', { ...base, variants: base.variants.map(v => ({ ...v, stock: 3 })), expectedVersion: base.version });
  const placed = await order(alice, 'aggregate-valid');
  assert.equal(placed.status, 200); assert.equal(placed.data.order.items.length, 2);
  assert.equal((await alice('/api/bootstrap')).data.products.find(p => p.id === 'blank').stock, 0);
  await alice(`/api/orders/${placed.data.order.id}/cancel`, 'POST');
  await alice(`/api/orders/${placed.data.order.id}/cancel`, 'POST');
  assert.equal((await alice('/api/bootstrap')).data.products.find(p => p.id === 'blank').stock, 3);
});
