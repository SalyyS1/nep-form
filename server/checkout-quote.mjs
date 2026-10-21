import { fail } from './common.mjs';
import { requireUser } from './auth.mjs';
import { settings } from './database.mjs';
import { availableVariant } from './cart-and-addresses.mjs';
import { customSummary } from './custom-summary.mjs';
import { productPrice } from '../shared/product-pricing.mjs';
import { quoteCoupon } from './promotions.mjs';

export async function checkoutQuote(store, user, couponCode, now = Date.now()) {
  const cart = await store.list('cart', user.id);
  if (!cart.length) fail(409, 'Giỏ hàng đang trống.', 'CART_EMPTY');
  const config = await settings(store);
  const quantities = new Map();
  const items = [];
  for (const item of cart) {
    const { product, variant } = await availableVariant(store, item.productId, item.size, item.color);
    const variantKey = JSON.stringify([product.id, item.size, item.color]);
    const quantity = (quantities.get(variantKey) ?? 0) + item.quantity;
    quantities.set(variantKey, quantity);
    if (quantity > variant.stock) fail(409, `${product.name} không đủ tồn kho.`, 'OUT_OF_STOCK');
    if (product.isCustomBase && !item.custom) fail(409, 'Áo thiết kế thiếu bản in.', 'CUSTOM_DESIGN_REQUIRED');
    const custom = item.custom ? await customSummary(store, item.custom.designId, user.id, product, now) : undefined;
    if (custom) {
      const design = await store.get('design', custom.designId);
      if (design.project.color !== item.color || design.project.size !== item.size) fail(409, 'Phân loại không khớp thiết kế.', 'DESIGN_UNAVAILABLE');
    }
    const unitPrice = custom?.unitPrice ?? productPrice(product, now);
    items.push({ productId: product.id, name: product.name, image: product.images[0] ?? '', size: item.size, color: item.color, quantity: item.quantity, unitPrice, ...(custom ? { custom, designId: custom.designId } : {}) });
  }
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(subtotal + config.shippingFee)) fail(400, 'Tổng tiền vượt giới hạn.');
  const promotion = await quoteCoupon(store, couponCode, user.id, subtotal, now, items.reduce((sum, item) => sum + item.quantity, 0));
  return { cart, config, quote: { items, subtotal, shipping: config.shippingFee, ...promotion, total: subtotal + config.shippingFee - promotion.discount } };
}
export async function checkoutQuoteRoute(ctx) {
  if (ctx.path !== '/api/checkout/quote' || ctx.method !== 'POST') return undefined;
  requireUser(ctx.user);
  return ctx.store.transaction(async () => ({ quote: (await checkoutQuote(ctx.store, ctx.user, ctx.body.couponCode)).quote }));
}
