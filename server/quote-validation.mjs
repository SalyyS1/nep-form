import { canonical, fail, integer, string } from './common.mjs';

function normalizedQuote(quote) {
  if (!quote || typeof quote !== 'object' || !Array.isArray(quote.items) || !quote.items.length) fail(400, 'Thiếu thông tin xác nhận tổng tiền.');
  const items = quote.items.map(item => {
    if (!item || typeof item !== 'object') fail(400, 'Thông tin xác nhận sản phẩm không hợp lệ.');
    return {
      productId: string(item.productId, 'Sản phẩm xác nhận', 100), size: string(item.size, 'Kích thước xác nhận', 50),
      color: string(item.color, 'Màu xác nhận', 100), quantity: integer(item.quantity, 'Số lượng xác nhận', 1, 99),
      unitPrice: integer(item.unitPrice, 'Giá xác nhận', 1, Number.MAX_SAFE_INTEGER),
      ...((item.designId ?? item.custom?.designId) !== undefined ? { designId: string(item.designId ?? item.custom?.designId, 'Thiết kế xác nhận', 100) } : {}),
    };
  }).sort((a, b) => canonical(a).localeCompare(canonical(b)));
  return {
    subtotal: integer(quote.subtotal, 'Tạm tính xác nhận', 0, Number.MAX_SAFE_INTEGER),
    shipping: integer(quote.shipping, 'Phí giao hàng xác nhận', 0, Number.MAX_SAFE_INTEGER),
    total: integer(quote.total, 'Tổng tiền xác nhận', 0, Number.MAX_SAFE_INTEGER), items,
    discount: integer(quote.discount ?? 0, 'Giảm giá xác nhận', 0, Number.MAX_SAFE_INTEGER),
    coupon: quote.coupon ? { id: string(quote.coupon.id, 'Mã ưu đãi xác nhận', 100), code: string(quote.coupon.code, 'Mã giảm giá xác nhận', 32) } : null,
  };
}
export function requireMatchingQuote(expected, items, subtotal, shipping, discount = 0, coupon) {
  const received = normalizedQuote(expected);
  const current = normalizedQuote({ items, subtotal, shipping, discount, coupon, total: subtotal + shipping - discount });
  if (canonical(received) !== canonical(current)) fail(409, 'Giỏ hàng, giá hoặc phí giao hàng vừa thay đổi. Vui lòng kiểm tra và xác nhận lại.', 'CART_CHANGED');
}
