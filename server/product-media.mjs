import sharp from 'sharp';
import { requireUser } from './auth.mjs';
import { fail, id } from './common.mjs';
import { importPinterestImage } from './pinterest-image-import.mjs';

export const MAX_PRODUCT_IMAGE_BYTES = 4_000_000;
export const MEDIA_BODY_LIMIT = 6_000_000;
export async function validateProductMedia(store, images) {
  for (const url of images) {
    if (url.startsWith('/api/media/') && !await store.get('media', url.slice('/api/media/'.length))) fail(400, 'Ảnh đã tải lên không tồn tại. Hãy chọn lại ảnh.');
  }
}
export function imageDataUrl(value) {
  if (typeof value !== 'string') fail(400, 'Dữ liệu ảnh không hợp lệ.');
  if (value.length > 5_400_000) fail(413, 'Ảnh tối đa 4 MB.');
  const match = value.match(/^data:image\/(?:png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[1].length % 4 !== 0) fail(400, 'Chọn ảnh PNG, JPEG, WebP, GIF tĩnh hoặc AVIF hợp lệ.');
  const data = Buffer.from(match[1], 'base64');
  if (!data.length || data.toString('base64') !== match[1]) fail(400, 'Dữ liệu ảnh không hợp lệ.');
  if (data.length > MAX_PRODUCT_IMAGE_BYTES) fail(413, 'Ảnh tối đa 4 MB.');
  return data;
}
export async function normalizeProductImage(data) {
  if (data.length > MAX_PRODUCT_IMAGE_BYTES) fail(413, 'Ảnh tối đa 4 MB.');
  try {
    const image = sharp(data, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif'].includes(meta.format) || !meta.width || !meta.height || meta.width > 6000 || meta.height > 6000 || (meta.pages ?? 1) > 1) fail(400, 'Ảnh cần là ảnh tĩnh, tối đa 6.000 px mỗi cạnh và 16 triệu điểm ảnh.');
    const { data: output, info } = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).timeout({ seconds: 5 }).toBuffer({ resolveWithObject: true });
    return { data: output, width: info.width, height: info.height };
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'Không giải mã được toàn bộ ảnh. Chọn ảnh tĩnh hợp lệ, tối đa 16 triệu điểm ảnh.');
  }
}
export async function mediaRoute(ctx) {
  const { path, method, user, body, store, response } = ctx;
  const mediaId = path.match(/^\/api\/media\/([0-9a-f-]{36})$/)?.[1];
  if (method === 'GET' && mediaId) {
    const media = await store.get('media', mediaId);
    if (!media) fail(404, 'Không tìm thấy ảnh.', 'NOT_FOUND');
    const data = Buffer.from(media.data, 'base64');
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('Content-Length', data.length);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(data);
    return { ok: true };
  }
  if (method !== 'POST' || path !== '/api/admin/media') return undefined;
  requireUser(user, true);
  if (!body || (body.dataUrl !== undefined) === (body.url !== undefined)) fail(400, 'Chọn một tệp ảnh hoặc một liên kết Pinterest.');
  if (body.url !== undefined && (typeof body.url !== 'string' || body.url.length > 2000)) fail(400, 'Liên kết quá dài hoặc không hợp lệ.');
  const input = body.url !== undefined ? await importPinterestImage(body.url) : imageDataUrl(body.dataUrl);
  const normalized = await normalizeProductImage(input);
  const media = { id: id(), type: 'image/webp', width: normalized.width, height: normalized.height, data: normalized.data.toString('base64'), createdAt: new Date().toISOString() };
  // Product photos are public and shared across administrators; the actor lives in the audit record.
  await store.transaction(async () => { await store.put('media', media); await store.audit(user, 'media.create', media.id); });
  return { id: media.id, url: `/api/media/${media.id}`, width: media.width, height: media.height };
}
