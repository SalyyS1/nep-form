interface PricedProduct { price: number; salePrice?: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null }
export function activeSalePrice(product: PricedProduct, now?: number): number | null;
export function productPrice(product: PricedProduct, now?: number): number;
export function productSalePercent(product: PricedProduct, now?: number): number;
