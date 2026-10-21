import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productSalePercent } from '../../shared/product-pricing.mjs';
import { ProductPrice } from './product-price';
import type { Product } from '../lib/types';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const salePercent = productSalePercent(product);
  return <article className="product-card">
    <Link className="product-image" to={`/san-pham/${product.slug}`} aria-label={`Xem ${product.name}`}>
      <img src={product.images[0]} alt={product.name} loading={index < 4 ? 'eager' : 'lazy'} />
      {salePercent > 0 ? <span className="product-badge product-sale-badge">−{salePercent}%</span> : product.featured && <span className="product-badge">Mới</span>}
      {product.stock === 0 && <span className="product-sold-out">Tạm hết hàng</span>}
      <span className="product-quick-view"><ArrowUpRight size={20} /></span>
    </Link>
    <div className="product-info"><span className="product-category">{product.categoryLabel}</span><Link to={`/san-pham/${product.slug}`} className="product-name">{product.name}</Link><div className="product-bottom"><ProductPrice product={product} className="product-price" /><div className="color-dots" aria-label={`Màu: ${product.colors.map((c) => c.name).join(', ')}`}>{product.colors.map((color) => <span key={color.name} style={{ background: color.hex }} title={color.name} />)}</div></div></div>
  </article>;
}
