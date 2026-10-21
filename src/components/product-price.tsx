import { activeSalePrice, productSalePercent } from '../../shared/product-pricing.mjs';
import { money } from '../lib/api';
import type { Product } from '../lib/types';
import '../styles/product-pricing.css';

interface ProductPriceProps {
  product: Product;
  className?: string;
  showBadge?: boolean;
}

export function ProductPrice({ product, className = '', showBadge = false }: ProductPriceProps) {
  const now = Date.now();
  const sale = activeSalePrice(product, now);
  return <span className={`sale-price ${sale !== null ? 'sale-price-active' : ''} ${className}`}>
    <span aria-label={sale !== null ? 'Giá ưu đãi' : 'Giá bán'}>{money(sale ?? product.price)}</span>
    {sale !== null && <><del aria-label="Giá gốc">{money(product.price)}</del>{showBadge && <span className="sale-price-badge">−{productSalePercent(product, now)}%</span>}</>}
  </span>;
}
