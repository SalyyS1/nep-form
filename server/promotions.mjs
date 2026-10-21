import { fail, integer } from './common.mjs';
import { requireUser } from './auth.mjs';
import { couponCode, validatePromotion } from './promotion-validation.mjs';

async function liveUses(store, promotionId) {
  return (await store.list('coupon-use')).filter(use => use.promotionId === promotionId && !use.releasedAt);
}
function validWindow(promotion, now) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) fail(400, 'Thời gian áp dụng không hợp lệ.');
  if (!promotion.isActive) fail(409, 'Mã giảm giá đang tạm ngừng.', 'COUPON_INACTIVE');
  if (promotion.startsAt && time < Date.parse(promotion.startsAt)) fail(409, 'Mã giảm giá chưa đến thời gian áp dụng.', 'COUPON_NOT_STARTED');
  if (promotion.endsAt && time >= Date.parse(promotion.endsAt)) fail(409, 'Mã giảm giá đã hết hạn.', 'COUPON_EXPIRED');
}
export async function promotionEligibilityState(store, userId) {
  const [uses, orders] = await Promise.all([store.list('coupon-use'), store.list('order', userId)]);
  const counts = new Map();
  for (const use of uses) {
    if (use.releasedAt) continue;
    const count = counts.get(use.promotionId) ?? { total: 0, user: 0 };
    count.total++;
    if (use.userId === userId) count.user++;
    counts.set(use.promotionId, count);
  }
  return { counts, hasOrder: orders.some(order => order.status !== 'cancelled') };
}
function checkQuota(promotion, state) {
  const count = state.counts.get(promotion.id) ?? { total: 0, user: 0 };
  if (promotion.usageLimit !== null && count.total >= promotion.usageLimit) fail(409, 'Mã giảm giá đã hết lượt sử dụng.', 'COUPON_USAGE_LIMIT');
  if (promotion.perUserLimit !== null && count.user >= promotion.perUserLimit) fail(409, 'Bạn đã dùng hết lượt của mã giảm giá này.', 'COUPON_USER_LIMIT');
}
function calculateDiscount(promotion, subtotal) {
  const amount = promotion.type === 'percent' ? Number(BigInt(subtotal) * BigInt(promotion.value) / 100n) : promotion.value;
  return Math.min(amount, subtotal, promotion.maxDiscount ?? subtotal);
}
function checkFirstOrder(promotion, state) {
  if (promotion.firstOrderOnly && state.hasOrder) {
    fail(409, 'Mã giảm giá chỉ dành cho đơn hàng đầu tiên. Bạn đã có đơn chưa hủy; vui lòng bỏ mã hoặc chọn mã khác.', 'COUPON_FIRST_ORDER_ONLY');
  }
}

// Discovery and manual quotes share the same policy and exact integer calculation.
export function quotePromotion(promotion, subtotal, now, quantity, state) {
  validWindow(promotion, now);
  if (subtotal < promotion.minSubtotal) fail(409, 'Đơn hàng chưa đạt giá trị tối thiểu của mã giảm giá.', 'COUPON_MIN_SUBTOTAL');
  integer(quantity, 'Số lượng sản phẩm', 1, Number.MAX_SAFE_INTEGER);
  if (quantity < (promotion.minQuantity ?? 1)) fail(409, `Mã giảm giá yêu cầu ít nhất ${promotion.minQuantity} sản phẩm; giỏ hàng có ${quantity}. Vui lòng thêm ${promotion.minQuantity - quantity} sản phẩm hoặc bỏ mã.`, 'COUPON_MIN_QUANTITY');
  checkFirstOrder(promotion, state);
  checkQuota(promotion, state);
  return calculateDiscount(promotion, subtotal);
}

export async function quoteCoupon(store, code, userId, subtotal, now = new Date(), quantity = 1) {
  if (code === undefined || code === null || code === '') return { discount: 0 };
  integer(subtotal, 'Giá trị đơn hàng', 0, Number.MAX_SAFE_INTEGER);
  const normalized = couponCode(code);
  const promotion = (await store.list('promotion')).find(value => value.code.toUpperCase() === normalized);
  if (!promotion) fail(400, 'Không tìm thấy mã giảm giá.', 'COUPON_NOT_FOUND');
  const discount = quotePromotion(promotion, subtotal, now, quantity, await promotionEligibilityState(store, userId));
  return { discount, coupon: {
    id: promotion.id, code: promotion.code, label: promotion.label, type: promotion.type, value: promotion.value, discount,
    ...(promotion.firstOrderOnly ? { firstOrderOnly: true } : {}),
    ...(promotion.minQuantity > 1 ? { minQuantity: promotion.minQuantity } : {}),
  } };
}

// The order transaction owns the store's global write lock from quote through redemption.
export async function redeemCoupon(store, coupon, userId, orderId, now = new Date()) {
  if (!coupon) return;
  const prior = await store.get('coupon-use', orderId);
  if (prior) {
    if (prior.promotionId !== coupon.id || prior.userId !== userId) fail(409, 'Đơn hàng đã có lượt dùng mã khác.', 'COUPON_ORDER_CONFLICT');
    return prior;
  }
  const promotion = await store.get('promotion', coupon.id);
  if (!promotion || promotion.code !== coupon.code || promotion.type !== coupon.type || promotion.value !== coupon.value) fail(409, 'Mã giảm giá vừa thay đổi. Vui lòng áp dụng lại.', 'COUPON_CHANGED');
  if ((promotion.firstOrderOnly ?? false) !== (coupon.firstOrderOnly ?? false) || (promotion.minQuantity ?? 1) !== (coupon.minQuantity ?? 1)) fail(409, 'Điều kiện mã giảm giá vừa thay đổi. Vui lòng áp dụng lại.', 'COUPON_CHANGED');
  validWindow(promotion, now);
  const state = await promotionEligibilityState(store, userId);
  checkFirstOrder(promotion, state);
  checkQuota(promotion, state);
  const use = { id: orderId, orderId, promotionId: promotion.id, userId, createdAt: new Date(now).toISOString(), releasedAt: null };
  await store.put('coupon-use', use, userId);
  return use;
}

// Release the historical promotion ID once; editing a code never rewrites prior orders.
export async function releaseCoupon(store, order) {
  if (!order.coupon) return false;
  const use = await store.get('coupon-use', order.id);
  if (!use || use.releasedAt) return false;
  if (use.promotionId !== order.coupon.id || use.userId !== order.userId) fail(409, 'Lượt dùng mã không khớp đơn hàng.', 'COUPON_ORDER_CONFLICT');
  await store.put('coupon-use', { ...use, releasedAt: new Date().toISOString() }, use.userId);
  return true;
}

export async function promotionRoute(ctx) {
  const { store, path, method, user, body } = ctx;
  if (!/^\/api\/admin\/promotions(?:\/|$)/.test(path)) return undefined;
  requireUser(user, true);
  if (method === 'GET' && path === '/api/admin/promotions') {
    const uses = (await store.list('coupon-use')).filter(use => !use.releasedAt);
    return { promotions: (await store.list('promotion')).map(promotion => ({ firstOrderOnly: false, minQuantity: 1, ...promotion, showAtCheckout: promotion.showAtCheckout === true, usedCount: uses.filter(use => use.promotionId === promotion.id).length })) };
  }
  const promotionId = path.match(/^\/api\/admin\/promotions\/([^/]+)$/)?.[1];
  if (!((method === 'POST' && path === '/api/admin/promotions') || (method === 'PATCH' && promotionId))) return undefined;
  return store.transaction(async () => {
    const existing = promotionId ? await store.get('promotion', promotionId) : null;
    if (promotionId && !existing) fail(404, 'Không tìm thấy ưu đãi.', 'NOT_FOUND');
    if (existing && integer(body.expectedVersion, 'Phiên bản ưu đãi', 1, Number.MAX_SAFE_INTEGER) !== existing.version) fail(409, 'Ưu đãi vừa thay đổi. Vui lòng tải lại trước khi lưu.', 'PROMOTION_VERSION_CONFLICT');
    const promotion = validatePromotion(body, existing);
    if ((await store.list('promotion')).some(value => value.id !== promotion.id && value.code.toUpperCase() === promotion.code)) fail(409, 'Mã giảm giá đã được dùng.', 'COUPON_CODE_EXISTS');
    await store.put('promotion', promotion);
    await store.audit(user, existing ? 'promotion.update' : 'promotion.create', promotion.id);
    return { ...promotion, usedCount: (await liveUses(store, promotion.id)).length };
  });
}
