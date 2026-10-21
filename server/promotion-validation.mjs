import { boolean, fail, id, integer, string } from './common.mjs';

export function couponCode(value) {
  const code = string(value, 'Mã giảm giá', 32).toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) fail(400, 'Mã giảm giá cần 3–32 chữ, số, dấu gạch ngang hoặc gạch dưới.');
  return code;
}
function nullableInteger(value, name) {
  return value === null ? null : integer(value, name, 1, 1_000_000_000);
}
function timestamp(value, name) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 40) fail(400, `${name} không hợp lệ.`);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) fail(400, `${name} cần thời gian có múi giờ.`);
  const [, year, month, day, hour, minute, second] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (+year < 1970 || +month < 1 || +month > 12 || +day < 1 || +day > days || +hour > 23 || +minute > 59 || +(second ?? 0) > 59 || !Number.isFinite(Date.parse(value))) fail(400, `${name} không hợp lệ.`);
  return new Date(value).toISOString();
}
export function validatePromotion(input, existing = null) {
  const source = { minSubtotal: 0, minQuantity: 1, firstOrderOnly: false, showAtCheckout: false, maxDiscount: null, startsAt: null, endsAt: null, usageLimit: null, perUserLimit: null, isActive: true, ...existing, ...input };
  if (!['percent', 'fixed'].includes(source.type)) fail(400, 'Loại giảm giá không hợp lệ.');
  const startsAt = timestamp(source.startsAt, 'Thời gian bắt đầu');
  const endsAt = timestamp(source.endsAt, 'Thời gian kết thúc');
  if (startsAt && endsAt && startsAt >= endsAt) fail(400, 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  return {
    id: existing?.id ?? id(), code: couponCode(source.code), label: string(source.label, 'Tên ưu đãi', 200),
    type: source.type, value: integer(source.value, 'Mức giảm', 1, source.type === 'percent' ? 100 : 1_000_000_000),
    minSubtotal: integer(source.minSubtotal, 'Giá trị đơn tối thiểu', 0, 1_000_000_000),
    minQuantity: integer(source.minQuantity, 'Số lượng sản phẩm tối thiểu', 1, 10_000),
    firstOrderOnly: boolean(source.firstOrderOnly, 'Chỉ áp dụng cho đơn đầu tiên'),
    showAtCheckout: boolean(source.showAtCheckout, 'Hiển thị ở bước thanh toán'),
    maxDiscount: nullableInteger(source.maxDiscount, 'Mức giảm tối đa'), startsAt, endsAt,
    usageLimit: nullableInteger(source.usageLimit, 'Giới hạn lượt dùng'), perUserLimit: nullableInteger(source.perUserLimit, 'Giới hạn mỗi khách'),
    isActive: boolean(source.isActive, 'Đang áp dụng'), version: existing ? (existing.version ?? 1) + 1 : 1,
  };
}
