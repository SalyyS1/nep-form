import { validateTextEffects } from './text-effects-validation.mjs';
import { fail, integer, string } from './common.mjs';
import { SHAPES } from '../shared/custom-core.mjs';
import sharp from 'sharp';
import { validateCustomFonts } from './custom-font-validation.mjs';
import { isBuiltinFont } from '../shared/builtin-font-catalog.mjs';

const fonts = ['Be Vietnam Pro', 'serif', 'monospace'];
const imageLimit = 2 * 1024 * 1024;
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Thiết kế không hợp lệ.');
  return value;
}
function number(value, name, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) fail(400, `${name} không hợp lệ.`);
  return value;
}
function optionalBoolean(value, name) {
  if (value !== undefined && typeof value !== 'boolean') fail(400, `${name} không hợp lệ.`);
  return value ?? false;
}
async function raster(value, budget) {
  if (typeof value !== 'string' || value.length > Math.ceil(imageLimit / 3) * 4 + 32) fail(400, 'Ảnh quá lớn.');
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) fail(400, 'Chỉ nhận ảnh PNG, JPEG hoặc WebP.', 'INVALID_IMAGE');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.toString('base64') !== match[2]) fail(400, 'Dữ liệu ảnh không hợp lệ.', 'INVALID_IMAGE');
  budget.bytes += bytes.length;
  if (budget.bytes > imageLimit) fail(400, 'Tổng ảnh tối đa 2 MB.', 'IMAGE_TOO_LARGE');
  const png = bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND';
  const jpeg = bytes.length >= 10 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const webp = bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16)) && bytes.readUInt32LE(4) + 8 === bytes.length;
  if (!({ png, jpeg, webp })[match[1]]) fail(400, 'Nội dung không khớp định dạng ảnh.', 'INVALID_IMAGE');
  if (png && (!bytes.readUInt32BE(16) || !bytes.readUInt32BE(20) || bytes.readUInt32BE(16) > 8192 || bytes.readUInt32BE(20) > 8192)) fail(400, 'Kích thước ảnh không hợp lệ.', 'INVALID_IMAGE');
  try {
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 16_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== match[1] || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192 || (metadata.pages ?? 1) !== 1) fail(400, 'Kích thước hoặc số trang ảnh không hợp lệ.', 'INVALID_IMAGE');
    // Metadata alone accepts truncated payloads. Decode all pixels before storing a source.
    await image.raw().toBuffer();
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'Không thể đọc toàn bộ ảnh. Vui lòng chọn ảnh PNG, JPEG hoặc WebP hợp lệ.', 'INVALID_IMAGE');
  }
  return value;
}
async function layer(input, budget, customFonts) {
  object(input);
  if (!['text', 'shape', 'image'].includes(input.kind)) fail(400, 'Loại lớp không hợp lệ.');
  if (typeof input.fill !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.fill)) fail(400, 'Màu lớp không hợp lệ.');
  const result = {
    id: string(input.id, 'Mã lớp', 100), kind: input.kind,
    x: number(input.x, 'Vị trí X', -300, 600), y: number(input.y, 'Vị trí Y', -360, 720),
    width: number(input.width, 'Chiều rộng', 1, 600), height: number(input.height, 'Chiều cao', 1, 720),
    rotation: number(input.rotation, 'Góc xoay', -360, 360), fill: input.fill,
    opacity: number(input.opacity, 'Độ trong suốt', 0, 1),
    hidden: optionalBoolean(input.hidden, 'Ẩn lớp'), locked: optionalBoolean(input.locked, 'Khóa lớp'),
  };
  if (input.textEffects !== undefined && input.kind !== 'text') fail(400, 'Hiệu ứng này chỉ dành cho lớp chữ.', 'INVALID_TEXT_EFFECTS');
  if (input.kind === 'text') {
    result.text = string(input.text, 'Nội dung chữ', 500);
    if (!fonts.includes(input.fontFamily) && !isBuiltinFont(input.fontFamily) && !customFonts.some(font => `custom:${font.id}` === input.fontFamily)) fail(400, 'Phông chữ không hợp lệ hoặc chưa được tải lên.');
    result.fontFamily = input.fontFamily;
    result.fontWeight = integer(input.fontWeight, 'Độ đậm', 100, 900);
    if (input.textEffects !== undefined) result.textEffects = validateTextEffects(input.textEffects);
  }
  if (input.kind === 'shape') {
    if (!SHAPES.includes(input.shape)) fail(400, 'Biểu tượng không hợp lệ.');
    result.shape = input.shape;
  }
  if (input.kind === 'image') result.src = await raster(input.src, budget);
  return result;
}
export async function validateProject(store, input) {
  object(input);
  if (input.version !== 1) fail(400, 'Phiên bản thiết kế không hợp lệ.');
  const productId = string(input.productId, 'Áo nền', 100);
  const product = await store.get('product', productId);
  const color = string(input.color, 'Màu áo', 100), size = string(input.size, 'Cỡ áo', 50);
  if (!product?.isActive || !product.isCustomBase || !product.variants.some(value => value.color === color && value.size === size)) fail(409, 'Áo nền hoặc phân loại không còn bán.', 'OUT_OF_STOCK');
  object(input.faces);
  const customFonts = validateCustomFonts(input.fonts);
  const budget = { bytes: 0 }, faces = {};
  for (const side of ['front', 'back']) {
    const face = object(input.faces[side]);
    if (!['small', 'medium', 'large'].includes(face.area) || !Array.isArray(face.layers) || face.layers.length > 20) fail(400, 'Vùng in hoặc số lớp không hợp lệ.');
    // Keep decoding sequential so one design cannot allocate 40 raw image buffers at once.
    const layers = [];
    for (const value of face.layers) layers.push(await layer(value, budget, customFonts));
    if (new Set(layers.map(value => value.id)).size !== layers.length) fail(400, 'Mã lớp bị trùng.');
    faces[side] = { area: face.area, layers };
  }
  return { version: 1, name: string(input.name, 'Tên thiết kế', 100), productId, color, size, faces, ...(customFonts.length ? { fonts: customFonts } : {}) };
}
export function validatePricing(input, version) {
  object(input); object(input.areas);
  return {
    version, text: integer(input.text, 'Phí chữ', 0), shape: integer(input.shape, 'Phí biểu tượng', 0), image: integer(input.image, 'Phí ảnh', 0),
    areas: Object.fromEntries(['small', 'medium', 'large'].map(area => [area, integer(input.areas[area], 'Phí vùng in', 0)])),
    extraLayer: integer(input.extraLayer, 'Phí thêm lớp', 0),
  };
}
