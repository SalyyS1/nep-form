import { boolean, fail, id, integer, string } from './common.mjs';

function stringArray(value, name, maxItems) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) fail(400, `${name} không hợp lệ.`);
  const values = value.map(item => string(item, name, 2000));
  if (new Set(values).size !== values.length) fail(400, `${name} bị trùng.`);
  return values;
}
function saleFields(source) {
  if (source.salePrice === undefined && source.saleStartsAt === undefined && source.saleEndsAt === undefined) return {};
  if (source.salePrice === null || source.salePrice === undefined) return { salePrice: null, saleStartsAt: null, saleEndsAt: null };
  const salePrice = integer(source.salePrice, 'Giá khuyến mãi', 1, source.price - 1);
  const date = (value, label) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || value.length > 40 || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value))) fail(400, `${label} cần có múi giờ hợp lệ.`);
    return new Date(value).toISOString();
  };
  const saleStartsAt = date(source.saleStartsAt, 'Thời gian bắt đầu giảm giá');
  const saleEndsAt = date(source.saleEndsAt, 'Thời gian kết thúc giảm giá');
  if (saleStartsAt && saleEndsAt && Date.parse(saleStartsAt) >= Date.parse(saleEndsAt)) fail(400, 'Thời gian kết thúc giảm giá phải sau lúc bắt đầu.');
  return { salePrice, saleStartsAt, saleEndsAt };
}
function validImageUrl(image, existing) {
  if (/[\s\\\u0000-\u001f]/.test(image)) return false;
  if (/^\/images\/[\w./%-]+$/.test(image)) {
    try { return decodeURIComponent(image).split('/').every(part => part !== '..' && !part.includes('\\')); } catch { return false; }
  }
  if (/^\/api\/media\/[0-9a-f-]{36}$/.test(image)) return true;
  try {
    const url = new URL(image);
    if (url.username || url.password || !url.hostname) return false;
    if (['pinterest.com', 'www.pinterest.com', 'pin.it'].includes(url.hostname)) return false;
    return url.protocol === 'https:' || (url.protocol === 'http:' && existing?.images.includes(image));
  } catch { return false; }
}
export function validateProduct(input, existing = null) {
  const source = { description: '', material: '', fit: '', featured: false, isActive: true, isDemo: false, ...existing, ...input };
  const productId = existing?.id ?? id();
  const name = string(source.name, 'Tên sản phẩm', 200);
  const category = string(source.category, 'Danh mục', 100);
  const sizes = stringArray(source.sizes, 'Kích thước', 30);
  if (!Array.isArray(source.colors) || !source.colors.length || source.colors.length > 30) fail(400, 'Màu không hợp lệ.');
  const colors = source.colors.map(color => {
    if (!color || !/^#[\da-f]{6}$/i.test(color.hex)) fail(400, 'Mã màu không hợp lệ.');
    return { name: string(color.name, 'Tên màu', 100), hex: color.hex };
  });
  if (new Set(colors.map(color => color.name)).size !== colors.length) fail(400, 'Tên màu bị trùng.');
  const images = stringArray(source.images, 'Ảnh', 15);
  if (images.some(image => !validImageUrl(image, existing))) fail(400, 'Dùng ảnh tải lên, đường dẫn /images/ hoặc liên kết ảnh HTTPS trực tiếp. Trang Pinterest cần nhập ảnh trước.');
  let values = source.variants;
  if (!values) values = sizes.flatMap(size => colors.map(color => ({ size, color: color.name, stock: 0 })));
  if (!Array.isArray(values) || !values.length || values.length > 900) fail(400, 'Phân loại không hợp lệ.');
  const seen = new Set();
  const variants = values.map(value => {
    if (!value || !sizes.includes(value.size) || !colors.some(color => color.name === value.color)) fail(400, 'Phân loại không khớp kích thước/màu.');
    const key = JSON.stringify([value.size, value.color]);
    if (seen.has(key)) fail(400, 'Phân loại bị trùng.');
    seen.add(key);
    const prior = existing?.variants.find(item => item.size === value.size && item.color === value.color);
    return { id: prior?.id ?? id(), size: value.size, color: value.color, stock: integer(value.stock, 'Tồn kho', 0, 1000000) };
  });
  const slug = source.slug || `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${productId.slice(0, 6)}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) fail(400, 'Đường dẫn sản phẩm không hợp lệ.');
  return {
    id: productId, version: existing ? (existing.version ?? 1) + 1 : 1, slug, name, category, categoryLabel: string(source.categoryLabel ?? category, 'Tên danh mục', 100),
    price: integer(source.price, 'Giá', 1), description: string(source.description, 'Mô tả', 10000, true),
    ...saleFields(source),
    material: string(source.material, 'Chất liệu', 1000, true), fit: string(source.fit, 'Phom', 1000, true),
    images, sizes, colors, variants, stock: variants.reduce((sum, value) => sum + value.stock, 0),
    featured: boolean(source.featured, 'Nổi bật'), isActive: boolean(source.isActive, 'Đang bán'), isDemo: boolean(source.isDemo, 'Dữ liệu demo'),
    ...(source.isCustomBase !== undefined ? { isCustomBase: boolean(source.isCustomBase, 'Áo nền thiết kế') } : {}),
  };
}
