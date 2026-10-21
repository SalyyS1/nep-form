import { requireUser } from './auth.mjs';
import { checkoutQuote } from './checkout-quote.mjs';
import { promotionEligibilityState, quotePromotion } from './promotions.mjs';

function publicPromotion(promotion, subtotal, quantity, state, now) {
  let eligibility;
  try {
    eligibility = { eligible: true, discount: quotePromotion(promotion, subtotal, now, quantity, state), reasonCode: null, reason: null };
  } catch (error) {
    if (error.status !== 409 || !error.code?.startsWith('COUPON_')) throw error;
    eligibility = { eligible: false, discount: 0, reasonCode: error.code, reason: error.message };
  }
  // Explicit projection keeps private administration and redemption data off checkout.
  return {
    code: promotion.code, label: promotion.label, type: promotion.type, value: promotion.value,
    minSubtotal: promotion.minSubtotal, maxDiscount: promotion.maxDiscount ?? null,
    minQuantity: promotion.minQuantity ?? 1, firstOrderOnly: promotion.firstOrderOnly ?? false,
    startsAt: promotion.startsAt ?? null, endsAt: promotion.endsAt ?? null,
    usageLimit: promotion.usageLimit ?? null, perUserLimit: promotion.perUserLimit ?? null,
    ...eligibility,
  };
}
const ordinal = (left, right) => left < right ? -1 : left > right ? 1 : 0;
function comparePromotions(left, right) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  if (left.eligible) {
    const amount = right.discount - left.discount;
    if (amount) return amount;
    const leftEnd = left.endsAt ? Date.parse(left.endsAt) : Infinity;
    const rightEnd = right.endsAt ? Date.parse(right.endsAt) : Infinity;
    if (leftEnd !== rightEnd) return leftEnd < rightEnd ? -1 : 1;
  }
  return ordinal(left.code, right.code);
}

export async function checkoutPromotionsRoute(ctx) {
  if (ctx.path !== '/api/checkout/promotions' || ctx.method !== 'GET') return undefined;
  requireUser(ctx.user);
  return ctx.store.transaction(async () => {
    const now = Date.now();
    const { quote } = await checkoutQuote(ctx.store, ctx.user, undefined, now);
    const quantity = quote.items.reduce((sum, item) => sum + item.quantity, 0);
    const [all, state] = await Promise.all([ctx.store.list('promotion'), promotionEligibilityState(ctx.store, ctx.user.id)]);
    const promotions = all
      .filter(promotion => promotion.showAtCheckout === true && promotion.isActive && (!promotion.endsAt || now < Date.parse(promotion.endsAt)))
      .map(promotion => publicPromotion(promotion, quote.subtotal, quantity, state, now))
      .sort(comparePromotions);
    return { promotions, bestCode: promotions.find(promotion => promotion.eligible && promotion.discount > 0)?.code ?? null, subtotal: quote.subtotal, quantity };
  });
}
