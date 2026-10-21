// Sale changes the blank/garment price. Printing fees stay separate in custom pricing.
export function activeSalePrice(product, now = Date.now()) {
  if (!Number.isSafeInteger(product.salePrice) || product.salePrice < 1 || product.salePrice >= product.price) return null;
  if (product.saleStartsAt && now < Date.parse(product.saleStartsAt)) return null;
  if (product.saleEndsAt && now >= Date.parse(product.saleEndsAt)) return null;
  return product.salePrice;
}
export function productPrice(product, now = Date.now()) { return activeSalePrice(product, now) ?? product.price; }
export function productSalePercent(product, now = Date.now()) {
  const sale = activeSalePrice(product, now);
  return sale === null ? 0 : Math.max(1, Math.floor((product.price - sale) * 100 / product.price));
}
