import { fail } from './common.mjs';

export const CART_LINE_LIMIT = 50;
export const ADDRESS_LIMIT = 20;
export const STUDIO_HOURLY_WRITE_LIMIT = 30;
export const STUDIO_DAILY_BYTE_LIMIT = 20 * 1024 * 1024;
const hour = 60 * 60 * 1000;
const day = 24 * hour;

export function requireCartCapacity(cart, existing = false) {
  if (!existing && cart.length >= CART_LINE_LIMIT) fail(409, 'Giỏ hàng tối đa 50 dòng sản phẩm. Vui lòng xóa bớt trước khi thêm.', 'CART_LINE_LIMIT');
}

// Call under the same write transaction as the design. Failed validation, stock
// checks or persistence roll back the allowance together with the new artwork.
export async function consumeStudioWrite(store, userId, project, now = Date.now()) {
  const prior = await store.get('studio-write-budget', userId);
  const currentHour = prior && now < prior.hourStartedAt + hour;
  const currentDay = prior && now < prior.dayStartedAt + day;
  const budget = {
    id: userId,
    hourStartedAt: currentHour ? prior.hourStartedAt : now,
    hourWrites: currentHour ? prior.hourWrites : 0,
    dayStartedAt: currentDay ? prior.dayStartedAt : now,
    dayBytes: currentDay ? prior.dayBytes : 0,
  };
  const bytes = Buffer.byteLength(JSON.stringify(project));
  const resets = [];
  if (budget.hourWrites >= STUDIO_HOURLY_WRITE_LIMIT) resets.push(budget.hourStartedAt + hour);
  if (budget.dayBytes + bytes > STUDIO_DAILY_BYTE_LIMIT) resets.push(budget.dayStartedAt + day);
  if (resets.length) throw Object.assign(new Error('Studio đã đạt giới hạn lưu tạm thời (30 lần/giờ hoặc 20 MB/ngày). Vui lòng thử lại sau.'), {
    status: 429, code: 'STUDIO_WRITE_LIMIT', retryAfter: Math.max(1, Math.ceil((Math.max(...resets) - now) / 1000)),
  });
  await store.put('studio-write-budget', { ...budget, hourWrites: budget.hourWrites + 1, dayBytes: budget.dayBytes + bytes }, userId);
}
