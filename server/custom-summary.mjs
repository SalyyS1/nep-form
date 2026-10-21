import { DEFAULT_PRICING, calculateCustomPrice } from '../shared/custom-core.mjs';
import { fail } from './common.mjs';
import { productPrice } from '../shared/product-pricing.mjs';

export async function customPricing(store) {
  const stored = await store.get('custom-pricing', 'custom');
  if (!stored) return structuredClone(DEFAULT_PRICING);
  const { id: _, ...pricing } = stored;
  return pricing;
}
export async function customSummary(store, designId, userId, product, now = Date.now()) {
  const design = await store.get('design', designId);
  if (!design || design.userId !== userId || design.project.productId !== product.id) fail(409, 'Thiết kế trong giỏ không hợp lệ.', 'DESIGN_UNAVAILABLE');
  const price = calculateCustomPrice(design.project, productPrice(product, now), await customPricing(store));
  return {
    designId, name: design.project.name, unitPrice: price.unitPrice, surcharge: price.surcharge, lines: price.lines,
    faces: ['front', 'back'].filter(side => design.project.faces[side].layers.some(layer => !layer.hidden)),
  };
}
export async function serializeCart(store, userId) {
  return Promise.all((await store.list('cart', userId)).map(async item => {
    if (!item.custom) return item;
    const product = await store.get('product', item.productId);
    if (!product) fail(409, 'Áo nền không còn tồn tại.', 'DESIGN_UNAVAILABLE');
    return { ...item, custom: await customSummary(store, item.custom.designId, userId, product) };
  }));
}
