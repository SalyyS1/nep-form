import { useState } from 'react';
import { ArrowUpRight, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { productPrice } from '../../../shared/product-pricing.mjs';
import { ProductCard } from '../../components/product-card';
import { Dialog, EmptyState } from '../../components/ui';
import { useStore } from '../../lib/store-context';

export default function CatalogPage() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const category = params.get('danh-muc') || '';
  const group = params.get('nhom') || '';
  const q = params.get('q') || '';
  const size = params.get('size') || '';
  const price = params.get('gia') || '';
  const sort = params.get('sap-xep') || 'newest';
  const page = Number(params.get('trang') || '1');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const now = Date.now();
  const readywear = (data?.products ?? []).filter((product) => !product.isCustomBase);
  const categories = (data?.categories ?? []).filter((item) => item.id !== 'ao-custom');
  const products = readywear.filter((product) => (!category || product.category === category)
    && (!group || (group === 'quan' ? product.category.startsWith('quan') : !product.category.startsWith('quan')))
    && (!q || normalize(`${product.name} ${product.description}`).includes(normalize(q)))
    && (!size || product.sizes.includes(size))
    && (!price || (price === 'under-300' ? productPrice(product, now) < 300000 : price === '300-500' ? productPrice(product, now) >= 300000 && productPrice(product, now) <= 500000 : productPrice(product, now) > 500000))
    && (!params.get('moi') || product.featured));
  products.sort((a, b) => sort === 'price-asc' ? productPrice(a, now) - productPrice(b, now) : sort === 'price-desc' ? productPrice(b, now) - productPrice(a, now) : sort === 'name' ? a.name.localeCompare(b.name, 'vi') : Number(b.featured) - Number(a.featured));
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'trang') next.delete('trang'); setParams(next); }
  const heading = q ? `Kết quả cho “${q}”` : params.get('moi') ? 'Vừa lên kệ.' : categories.find((c) => c.id === category)?.label || (group === 'ao' ? 'Những chiếc áo.' : group === 'quan' ? 'Những chiếc quần.' : 'Mẫu có sẵn.');
  const filters = <><div className="filter-group"><h3>Danh mục</h3><button className={!category && !group ? 'filter-link active' : 'filter-link'} onClick={() => { const next = new URLSearchParams(params); next.delete('danh-muc'); next.delete('nhom'); next.delete('trang'); setParams(next); }}>Tất cả sản phẩm<span>{readywear.length}</span></button>{categories.map((cat) => <button key={cat.id} className={category === cat.id ? 'filter-link active' : 'filter-link'} onClick={() => { const next = new URLSearchParams(params); next.delete('nhom'); next.set('danh-muc', cat.id); next.delete('trang'); setParams(next); }}>{cat.label}<span>{readywear.filter((p) => p.category === cat.id).length}</span></button>)}</div><div className="filter-group"><h3>Kích thước</h3><div className="size-options">{['S', 'M', 'L', 'XL'].map((value) => <button key={value} className={size === value ? 'selected' : ''} onClick={() => update('size', size === value ? '' : value)}>{value}</button>)}</div></div><div className="filter-group"><h3>Khoảng giá</h3>{[['', 'Tất cả mức giá'], ['under-300', 'Dưới 300.000đ'], ['300-500', '300.000đ – 500.000đ'], ['over-500', 'Trên 500.000đ']].map(([value, label]) => <label className="radio-line" key={value}><input type="radio" checked={price === value} onChange={() => update('gia', value)} name={filterOpen ? 'price-modal' : 'price'} />{label}</label>)}</div>{params.size > 0 && <button className="text-link filter-clear" onClick={() => setParams({})}><X size={15} />Xóa bộ lọc</button>}</>;
  return <div className="container catalog-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Cửa hàng</span></div><div className="catalog-intro"><p className="eyebrow">MẪU CÓ SẴN / NẾP FORM</p><h1>{heading}</h1><p>Những món đồ dễ mặc. Cho những ngày là chính mình.</p></div><div className="catalog-custom-prompt"><p>Có ý tưởng riêng? Tạo một chiếc áo mang dấu ấn của bạn.</p><Link className="text-link" to="/thiet-ke">Tự thiết kế áo<ArrowUpRight size={16} /></Link></div><div className="catalog-layout"><aside className="catalog-filters">{filters}</aside><div className="catalog-results"><div className="catalog-toolbar"><span>{products.length} sản phẩm</span><button className="button-secondary mobile-filter" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} />Bộ lọc</button><label className="sort-label">Sắp xếp<select value={sort} onChange={(e) => update('sap-xep', e.target.value)} aria-label="Sắp xếp sản phẩm"><option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name">Tên A – Z</option></select></label></div>{products.length ? <><div className="product-grid catalog-grid">{products.slice((page - 1) * 12, page * 12).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div><div className="pagination" aria-label="Phân trang">{Array.from({ length: Math.ceil(products.length / 12) }, (_, i) => <button className={page === i + 1 ? 'current' : ''} key={i} onClick={() => { update('trang', String(i + 1)); window.scrollTo({ top: 160, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>{i + 1}</button>)}</div></> : <EmptyState title="Chưa tìm thấy món đồ phù hợp" text="Bạn thử một từ khóa khác hoặc xóa bớt bộ lọc nhé." />}</div></div><Dialog open={filterOpen} onClose={() => setFilterOpen(false)} title="Lọc sản phẩm" className="filter-dialog">{filters}<button className="button full-width" onClick={() => setFilterOpen(false)}>Xem {products.length} sản phẩm</button></Dialog></div>;
}


