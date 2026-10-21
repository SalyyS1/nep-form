import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export const id = () => randomUUID();
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function fail(status, error, code = 'INVALID_INPUT') {
  throw Object.assign(new Error(error), { status, code });
}
export function string(value, name, max = 300, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, `${name} không hợp lệ.`);
  return value.trim();
}
export function integer(value, name, min = 0, max = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `${name} không hợp lệ.`);
  return value;
}
export function boolean(value, name) {
  if (typeof value !== 'boolean') fail(400, `${name} không hợp lệ.`);
  return value;
}
export function email(value) {
  const normalized = string(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) fail(400, 'Email không hợp lệ.');
  return normalized;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) fail(400, 'Mật khẩu cần từ 8 đến 128 ký tự.');
  return value;
}
export function hashPassword(value) {
  const salt = token();
  return `${salt}:${scryptSync(value, salt, 64).toString('hex')}`;
}
export function checkPassword(value, stored) {
  if (typeof value !== 'string' || value.length > 128) return false;
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(value, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const publicUser = ({ id, name, email, role, emailVerified }) => ({ id, name, email, role, emailVerified: role === 'admin' || emailVerified === true });
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function addressFields(input, addressId = id()) {
  return {
    id: addressId, recipient: string(input.recipient, 'Tên người nhận', 100),
    phone: string(input.phone, 'Số điện thoại', 25), province: string(input.province, 'Tỉnh/thành', 100),
    ward: string(input.ward, 'Phường/xã', 100), line1: string(input.line1, 'Địa chỉ', 300),
    isDefault: input.isDefault === undefined ? false : boolean(input.isDefault, 'Địa chỉ mặc định'),
  };
}
