import { boolean, email, fail, integer, publicUser, string } from './common.mjs';
import { requireUser } from './auth.mjs';
import { settings } from './database.mjs';
import { restoreStock, statusTransitions } from './orders.mjs';
import { validateProduct } from './product-validation.mjs';
import { adminMetrics } from './admin-metrics.mjs';
import { validateProductMedia } from './product-media.mjs';
import { releaseCoupon } from './promotions.mjs';

async function updateOrder(store, user, orderId, body, mail) {
  return await store.transaction(async () => {
    const order = await store.get('order', orderId);
    if (!order) fail(404, 'Không tìm thấy đơn hàng.', 'NOT_FOUND');
    if (body.expectedVersion !== undefined && body.expectedVersion !== (order.version ?? 1)) fail(409, 'Đơn vừa được cập nhật. Hãy tải lại trước khi lưu.', 'ORDER_VERSION_CONFLICT');
    const nextStatus = body.status ?? order.status;
    if (nextStatus !== order.status && !statusTransitions[order.status].includes(nextStatus)) fail(409, 'Không thể chuyển trạng thái đơn hàng.', 'ORDER_STATE_CONFLICT');
    let paymentStatus = body.paymentStatus ?? order.paymentStatus;
    if (!['unpaid', 'pending', 'paid', 'review'].includes(paymentStatus)) fail(400, 'Trạng thái thanh toán không hợp lệ.');
    if (nextStatus === 'cancelled' && paymentStatus === 'paid') {
      if (body.paymentStatus === 'paid') fail(409, 'Đơn đã hủy không thể xác nhận đã thu tiền.', 'ORDER_STATE_CONFLICT');
      paymentStatus = 'review';
    }
    if (order.paymentStatus === 'paid' && ['pending', 'unpaid'].includes(paymentStatus)) fail(409, 'Khoản đã thu cần đối soát, không thể xóa.', 'ORDER_STATE_CONFLICT');
    if (nextStatus === 'cancelled' && nextStatus !== order.status) { await restoreStock(store, order); await releaseCoupon(store, order); }
    const trackingCode = body.trackingCode === undefined ? (order.trackingCode ?? '') : string(body.trackingCode, 'Mã vận đơn', 100, true);
    const carrier = body.carrier === undefined ? (order.carrier ?? '') : string(body.carrier, 'Đơn vị vận chuyển', 100, true);
    const next = { ...order, status: nextStatus, paymentStatus, trackingCode, carrier, version: (order.version ?? 1) + 1, updatedAt: new Date().toISOString(), note: body.note === undefined ? order.note : string(body.note, 'Ghi chú', 2000, true) };
    await store.put('order', next, order.userId);
    if (['status', 'paymentStatus', 'trackingCode', 'carrier'].some(field => (order[field] ?? '') !== (next[field] ?? ''))) await mail?.enqueueOrder(next, 'update');
    await store.audit(user, 'order.update', { id: orderId, fromStatus: order.status, toStatus: nextStatus, fromPayment: order.paymentStatus, toPayment: paymentStatus, trackingCode, carrier });
    return { ok: true };
  });
}
export async function adminRoute(ctx) {
  const { store, path, method, user, body } = ctx;
  if (!/^\/api\/admin(\/|$)/.test(path)) return undefined;
  requireUser(user, true);
  if (method === 'GET' && path === '/api/admin/email-status') return ctx.mail ? await ctx.mail.status() : { configured: false, pending: 0, failed: 0, sent: 0 };
  if (method === 'GET' && path === '/api/admin') {
    const orders = (await store.list('order')).reverse();
    const products = await store.list('product');
    return {
      orders, users: (await store.list('user')).map(publicUser), products, settings: await settings(store), audit: (await store.list('audit')).reverse().slice(0, 200),
      stats: await adminMetrics(store, orders, products),
    };
  }
  const productId = path.match(/^\/api\/admin\/products\/([^/]+)$/)?.[1];
  if ((method === 'POST' && path === '/api/admin/products') || (method === 'PATCH' && productId)) {
    return await store.transaction(async () => {
      const existing = productId ? await store.get('product', productId) : null;
      if (productId && !existing) fail(404, 'Không tìm thấy sản phẩm.', 'NOT_FOUND');
      if (existing) {
        const expectedVersion = integer(body.expectedVersion, 'Phiên bản sản phẩm', 1, Number.MAX_SAFE_INTEGER);
        if (expectedVersion !== existing.version) fail(409, 'Sản phẩm vừa thay đổi. Vui lòng tải lại trước khi lưu.', 'PRODUCT_VERSION_CONFLICT');
      }
      const product = validateProduct(body, existing);
      await validateProductMedia(store, product.images);
      if ((await store.list('product')).some(item => item.id !== product.id && item.slug === product.slug)) fail(409, 'Đường dẫn sản phẩm đã được dùng.', 'SLUG_EXISTS');
      // Cancellable orders must retain their variant so cancellation can restore inventory.
      for (const order of await store.list('order')) {
        if (!['pending', 'confirmed', 'packing'].includes(order.status)) continue;
        for (const item of order.items.filter(item => item.productId === product.id)) {
          if (!product.variants.some(value => value.size === item.size && value.color === item.color)) fail(409, 'Phân loại đang thuộc đơn chưa hoàn tất; hãy giữ phân loại hoặc xử lý đơn trước.', 'VARIANT_IN_USE');
        }
      }
      await store.put('product', product);
      await store.audit(user, existing ? 'product.update' : 'product.create', product.id);
      return product;
    });
  }
  const historyId = path.match(/^\/api\/admin\/orders\/([^/]+)\/history$/)?.[1];
  if (method === 'GET' && historyId) {
    if (!await store.get('order', historyId)) fail(404, 'Không tìm thấy đơn hàng.', 'NOT_FOUND');
    return { events: (await store.list('audit')).filter(event => event.action.startsWith('order.') && (typeof event.target === 'string' ? event.target === historyId : event.target?.id === historyId)).reverse() };
  }
  const orderId = path.match(/^\/api\/admin\/orders\/([^/]+)$/)?.[1];
  if (method === 'PATCH' && orderId) return await updateOrder(store, user, orderId, body, ctx.mail);
  if (method === 'PATCH' && path === '/api/admin/settings') {
    return await store.transaction(async () => {
      const current = await settings(store);
      const next = {
        shopName: body.shopName === undefined ? current.shopName : string(body.shopName, 'Tên shop', 100),
        shippingFee: body.shippingFee === undefined ? current.shippingFee : integer(body.shippingFee, 'Phí giao hàng', 0, 1000000),
        contactEmail: body.contactEmail === undefined ? current.contactEmail : email(body.contactEmail),
        checkoutEnabled: body.checkoutEnabled === undefined ? current.checkoutEnabled : boolean(body.checkoutEnabled, 'Nhận đơn'),
        bankEnabled: body.bankEnabled === undefined ? current.bankEnabled : boolean(body.bankEnabled, 'Chuyển khoản'),
      };
      await store.put('settings', { id: 'store', ...next });
      await store.audit(user, 'settings.update', next);
      return { ok: true };
    });
  }
  return undefined;
}
