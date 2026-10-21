import { addressFields, canonical, digest, fail, id, string } from './common.mjs';
import { requireUser } from './auth.mjs';
import { owned, saveAddress } from './cart-and-addresses.mjs';
import { settings } from './database.mjs';
import { requireMatchingQuote } from './quote-validation.mjs';
import { checkoutQuote } from './checkout-quote.mjs';
import { redeemCoupon, releaseCoupon } from './promotions.mjs';

export const statusTransitions = {
  pending: ['confirmed', 'cancelled'], confirmed: ['packing', 'cancelled'],
  packing: ['shipping', 'cancelled'], shipping: ['delivered'], delivered: [], cancelled: [],
};
export async function restoreStock(store, order) {
  if (order.status === 'cancelled') return;
  for (const item of order.items) {
    const product = await store.get('product', item.productId);
    if (!product) fail(409, 'Không thể hoàn tồn kho sản phẩm.', 'ORDER_STATE_CONFLICT');
    const variant = product.variants.find(value => value.size === item.size && value.color === item.color);
    if (!variant) fail(409, 'Không thể hoàn tồn kho phân loại.', 'ORDER_STATE_CONFLICT');
    variant.stock += item.quantity;
    product.stock = product.variants.reduce((sum, value) => sum + value.stock, 0);
    product.version = (product.version ?? 1) + 1;
    await store.put('product', product);
  }
}
async function createOrder(store, user, body, mail) {
  const key = string(body.idempotencyKey, 'Mã giao dịch', 150);
  const fingerprint = digest(canonical(body));
  return await store.transaction(async () => {
    const prior = await store.getIdempotency(user.id, key);
    if (prior) {
      if (prior.fingerprint !== fingerprint) fail(409, 'Mã giao dịch đã được dùng cho nội dung khác.', 'IDEMPOTENCY_CONFLICT');
      return await store.get('order', prior.order_id);
    }
    if (mail?.configured && user.role !== 'admin' && !user.emailVerified) fail(403, 'Vui lòng xác minh email trước khi đặt hàng.', 'EMAIL_VERIFICATION_REQUIRED');
    const config = await settings(store);
    if (!config.checkoutEnabled) fail(409, 'Shop đang tạm ngừng nhận đơn.', 'CHECKOUT_DISABLED');
    if (!['cod', 'bank'].includes(body.paymentMethod)) fail(400, 'Phương thức thanh toán không hợp lệ.');
    if (body.paymentMethod === 'bank' && !config.bankEnabled) fail(409, 'Chuyển khoản đang tạm ngừng.', 'BANK_DISABLED');
    if (body.saveAddress !== undefined && typeof body.saveAddress !== 'boolean') fail(400, 'Lưu địa chỉ không hợp lệ.');
    const { cart, quote } = await checkoutQuote(store, user, body.couponCode);
    const address = body.addressId ? await owned(store, 'address', string(body.addressId, 'Địa chỉ', 100), user.id) : addressFields(body.address ?? {});
    const { items, subtotal, shipping, discount, coupon, total } = quote;
    requireMatchingQuote(body.expectedQuote, items, subtotal, shipping, discount, coupon);
    const orderId = id();
    const order = {
      id: orderId, code: `NEP-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 4).toUpperCase()}`,
      userId: user.id, customerName: user.name, customerEmail: user.email, items, address,
      subtotal, shipping, discount, total, ...(coupon ? { coupon } : {}),
      paymentMethod: body.paymentMethod, paymentStatus: body.paymentMethod === 'bank' ? 'pending' : 'unpaid',
      status: 'pending', version: 1, createdAt: new Date().toISOString(), note: string(body.note, 'Ghi chú', 2000, true),
    };
    // All stock changes and the purchased cart clear commit with the order snapshot.
    for (const item of items) {
      const product = await store.get('product', item.productId);
      product.variants.find(value => value.size === item.size && value.color === item.color).stock -= item.quantity;
      product.stock = product.variants.reduce((sum, value) => sum + value.stock, 0);
      product.version = (product.version ?? 1) + 1;
      await store.put('product', product);
    }
    if (!body.addressId && body.saveAddress) await saveAddress(store, user.id, address, address.id);
    if (coupon) await redeemCoupon(store, coupon, user.id, orderId);
    await store.put('order', order, user.id);
    await mail?.enqueueOrder(order);
    await store.putIdempotency(user.id, key, fingerprint, orderId);
    for (const item of cart) await store.remove('cart', item.id);
    return order;
  });
}
export async function orderRoute(ctx) {
  const { path, method, store, user, body } = ctx;
  if (!/^\/api\/orders(\/|$)/.test(path)) return undefined;
  requireUser(user);
  if (path === '/api/orders' && method === 'POST') return { order: await createOrder(store, user, body, ctx.mail) };
  const match = path.match(/^\/api\/orders\/([^/]+)(\/cancel)?$/);
  if (!match) return undefined;
  const handle = async () => {
    const order = await store.get('order', match[1]);
    if (!order || (order.userId !== user.id && user.role !== 'admin')) fail(404, 'Không tìm thấy đơn hàng.', 'NOT_FOUND');
    if (method === 'GET' && !match[2]) return { order };
    if (method === 'POST' && match[2]) {
      if (order.userId !== user.id) fail(403, 'Thao tác này chỉ dành cho chủ đơn.', 'FORBIDDEN');
      if (order.status === 'cancelled') return { ok: true };
      if (order.status !== 'pending' || order.paymentStatus === 'paid') fail(409, 'Đơn đã xử lý; vui lòng liên hệ shop.', 'ORDER_STATE_CONFLICT');
      await store.transaction(async () => {
        await restoreStock(store, order);
        await releaseCoupon(store, order);
        const next = { ...order, status: 'cancelled', version: (order.version ?? 1) + 1 };
        await store.put('order', next, order.userId);
        await ctx.mail?.enqueueOrder(next, 'update');
        await store.audit(user, 'order.cancel', order.id);
      });
      return { ok: true };
    }
    return undefined;
  };
  return method === 'GET' ? handle() : store.transaction(handle);
}
