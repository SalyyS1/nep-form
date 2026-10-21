import './builtin-fonts.mjs';
import { requireUser } from './auth.mjs';
import { fail, id, integer } from './common.mjs';
import { availableVariant } from './cart-and-addresses.mjs';
import { customPricing, customSummary } from './custom-summary.mjs';
import { validatePricing, validateProject } from './custom-validation.mjs';
import { renderShirtSvg, renderArtworkSvg } from '../shared/custom-core.mjs';
import { consumeStudioWrite, requireCartCapacity } from './customer-resource-limits.mjs';

async function saveDesign(store, user, project) {
  const { product } = await availableVariant(store, project.productId, project.size, project.color);
  if (!product.isCustomBase) fail(409, 'Áo nền không còn bán trong Studio.', 'OUT_OF_STOCK');
  const colorHex = product.colors.find(color => color.name === project.color).hex;
  await consumeStudioWrite(store, user.id, project);
  const design = { id: id(), userId: user.id, project, colorHex, createdAt: new Date().toISOString() };
  await store.put('design', design, user.id);
  return design;
}
async function listDesigns(store, userId, request) {
  const query = new URL(request.url, 'http://127.0.0.1').searchParams;
  const parse = (key, fallback, max) => {
    const value = query.get(key);
    if (value !== null && !/^\d+$/.test(value)) fail(400, 'Phân trang không hợp lệ.');
    return integer(value === null ? fallback : Number(value), 'Phân trang', key === 'limit' ? 1 : 0, max);
  };
  const offset = parse('offset', 0, 1_000_000), limit = parse('limit', 12, 50);
  const rows = await store.listDesignMetadata(userId, limit + 1, offset);
  const hasMore = rows.length > limit;
  const designs = rows.slice(0, limit).map(({ id, userId, createdAt, name, productId, color, size }) => ({ id, userId, createdAt, project: { name, productId, color, size } }));
  return { designs, hasMore, nextOffset: hasMore ? offset + designs.length : null };
}
export async function customRoute(ctx) {
  const { store, user, body, path, method, response } = ctx;
  if (path === '/api/custom/pricing' && method === 'GET') return { pricing: await customPricing(store) };
  if (path === '/api/admin/custom-pricing') {
    requireUser(user, true);
    if (method === 'GET') return { pricing: await customPricing(store) };
    if (method === 'PATCH') return await store.transaction(async () => {
      const current = await customPricing(store);
      if (integer(body.expectedVersion, 'Phiên bản giá', 1) !== current.version) fail(409, 'Bảng giá vừa thay đổi. Vui lòng tải lại.', 'PRICING_VERSION_CONFLICT');
      const pricing = validatePricing(body.pricing, current.version + 1);
      await store.put('custom-pricing', { id: 'custom', ...pricing });
      await store.audit(user, 'custom-pricing.update', pricing);
      return { pricing };
    });
    return undefined;
  }
  if (!path.startsWith('/api/custom/')) return undefined;
  requireUser(user);
  if (path === '/api/custom/designs' && method === 'GET') return await listDesigns(store, user.id, ctx.request);
  if (path === '/api/custom/designs' && method === 'POST') {
    const project = await validateProject(store, body.project);
    return await store.transaction(async () => ({ design: await saveDesign(store, user, project) }));
  }
  if (path === '/api/custom/cart' && method === 'POST') {
    const quantity = integer(body.quantity, 'Số lượng', 1, 99), project = await validateProject(store, body.project);
    if (!Object.values(project.faces).some(face => face.layers.some(layer => !layer.hidden))) fail(400, 'Thêm chữ, biểu tượng hoặc ảnh trước khi thêm giỏ.', 'EMPTY_DESIGN');
    // Validation decodes asynchronously; re-read all sale/stock state inside the transaction.
    return await store.transaction(async () => {
      const { product, variant } = await availableVariant(store, project.productId, project.size, project.color);
      if (!product.isCustomBase) fail(409, 'Áo nền không còn bán trong Studio.', 'OUT_OF_STOCK');
      const cart = await store.list('cart', user.id);
      requireCartCapacity(cart);
      const reserved = cart.filter(item => item.productId === product.id && item.size === project.size && item.color === project.color).reduce((sum, item) => sum + item.quantity, 0);
      if (reserved + quantity > variant.stock) fail(409, 'Số lượng vượt quá tồn kho.', 'OUT_OF_STOCK');
      const design = await saveDesign(store, user, project);
      await store.put('cart', { id: id(), productId: product.id, size: project.size, color: project.color, quantity, custom: await customSummary(store, design.id, user.id, product) }, user.id);
      return { ok: true };
    });
  }
  const match = path.match(/^\/api\/custom\/designs\/([^/]+)(?:\/(preview|artwork)\/(front|back))?$/);
  if (!match || method !== 'GET') return undefined;
  const design = await store.get('design', match[1]);
  if (!design || (design.userId !== user.id && user.role !== 'admin')) fail(404, 'Không tìm thấy thiết kế.', 'NOT_FOUND');
  if (!match[2]) return { design };
  const product = await store.get('product', design.project.productId);
  const color = design.colorHex ?? product?.colors.find(value => value.name === design.project.color)?.hex ?? '#eee9db';
  const svg = match[2] === 'preview' ? renderShirtSvg(design.project, color, match[3]) : renderArtworkSvg(design.project, match[3]);
  response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  response.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; sandbox allow-downloads");
  if (match[2] === 'artwork') response.setHeader('Content-Disposition', `attachment; filename="design-${design.id}-${match[3]}.svg"`);
  response.end(svg);
  return null;
}
