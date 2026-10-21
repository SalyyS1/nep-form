import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Ruler, ShoppingBag, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SizeAdvisor } from '../../components/size-advisor';
import { SHIRT_SIZE_CHART } from '../../../shared/size-guide.mjs';
import { ProductCard } from '../../components/product-card';
import { Dialog, EmptyState, ErrorText, Quantity } from '../../components/ui';
import { ProductPrice } from '../../components/product-price';
import { useStore } from '../../lib/store-context';

export default function ProductPage() {
  const { slug } = useParams();
  const { data, addToCart } = useStore();
  const product = data?.products.find((p) => p.slug === slug);
  const [size, setSize] = useState('');
  const [colorChoice, setColorChoice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  if (!product) return <EmptyState title="Sản phẩm này hiện không có." text="Bạn xem các mẫu khác trong cửa hàng nhé." />;
  const color = colorChoice || product.colors[0]?.name || '';
  const stock = product.variants.find((v) => v.size === size && v.color === color)?.stock ?? product.stock;
  async function add() {
    if (!size) { setError('Bạn chọn kích thước trước khi thêm vào giỏ nhé.'); return; }
    setBusy(true); setError('');
    try { await addToCart(product!, size, color, quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2500); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa thêm được sản phẩm.'); }
    finally { setBusy(false); }
  }
  return <><div className="container product-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to={`/cua-hang?danh-muc=${product.category}`}>{product.categoryLabel}</Link><span>/</span><span>{product.name}</span></div><div className="product-detail-layout"><div className="product-gallery"><div className="product-main-image"><img src={product.images[imageIndex] || product.images[0]} alt={product.name} /></div>{product.images.length > 1 && <div className="product-thumbnails">{product.images.map((image, index) => <button key={image} className={imageIndex === index ? 'selected' : ''} onClick={() => setImageIndex(index)} aria-label={`Ảnh ${index + 1}`}><img src={image} alt={`${product.name}, ảnh ${index + 1}`} /></button>)}</div>}</div><div className="product-detail-copy"><p className="eyebrow">NẾP FORM / {product.categoryLabel}</p><h1>{product.name}</h1><p className="detail-price"><ProductPrice product={product} showBadge /></p><p className="detail-description">{product.description}</p><div className="product-divider" /><div className="option-heading"><span>Màu sắc: <strong>{color}</strong></span></div><div className="color-options">{product.colors.map((c) => <button key={c.name} onClick={() => setColorChoice(c.name)} aria-label={`Chọn màu ${c.name}`} aria-pressed={color === c.name} className={color === c.name ? 'selected' : ''}><span style={{ background: c.hex }} />{c.name}</button>)}</div><div className="option-heading"><span>Kích thước{size && <>: <strong>{size}</strong></>}</span><button className="text-link" onClick={() => setGuide(true)}><Ruler size={16} />Bảng kích thước</button></div><div className="size-options detail-sizes">{product.sizes.map((value) => <button key={value} className={size === value ? 'selected' : ''} onClick={() => { setSize(value); setQuantity(1); setError(''); }} disabled={product.variants.some((v) => v.size === value && v.color === color) && !product.variants.some((v) => v.size === value && v.color === color && v.stock > 0)}>{value}</button>)}</div><SizeAdvisor product={product} color={color} selectedSize={size} onApply={value => { setSize(value); setQuantity(1); setError(''); }} /><ErrorText>{error}</ErrorText><div className="add-to-cart-row"><Quantity value={quantity} onChange={setQuantity} max={Math.max(1, stock)} /><button className="button" onClick={add} disabled={busy || product.stock === 0}>{added ? <Check size={18} /> : <ShoppingBag size={18} />}{busy ? 'Đang thêm...' : added ? 'Đã thêm vào giỏ' : product.stock === 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}</button></div><p className="product-stock"><span className={stock > 0 ? 'stock-dot' : 'stock-dot empty'} />{stock > 0 ? 'Còn hàng' : 'Kích thước này tạm hết hàng'}</p><div className="detail-service"><Truck size={20} /><span>Giao hàng tận nơi. Phí giao hàng được tính ở bước thanh toán.</span></div><details className="product-accordion" open><summary>Chi tiết sản phẩm<ChevronDown size={17} /></summary><dl><div><dt>Chất liệu</dt><dd>{product.material}</dd></div><div><dt>Phom dáng</dt><dd>{product.fit}</dd></div><div><dt>Dòng sản phẩm</dt><dd>Unisex</dd></div></dl></details><details className="product-accordion"><summary>Giao hàng & đổi trả<ChevronDown size={17} /></summary><p>Phí giao hàng hiển thị trước khi đặt đơn. Xem cách theo dõi đơn và liên hệ Nếp khi cần đổi trả.</p><Link className="text-link" to="/thong-tin/giao-hang">Xem thông tin<ArrowRight size={16} /></Link></details></div></div></div><section className="section container"><div className="section-heading"><div><p className="eyebrow">THÊM MỘT CHÚT CẢM HỨNG</p><h2>Có thể bạn cũng thích.</h2></div><Link className="text-link" to="/cua-hang">Ghé tủ đồ<ArrowRight size={17} /></Link></div><div className="product-grid">{data?.products.filter((p) => p.id !== product.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div></section><Dialog open={guide} onClose={() => setGuide(false)} title="Chọn kích thước của bạn"><p className="muted">Bảng tham khảo cho bản trải nghiệm. Số đo chính xác từng mẫu sẽ được shop cập nhật khi mở bán.</p><div className="size-guide-table"><table><thead><tr><th>Size</th><th>Chiều cao</th><th>Cân nặng</th></tr></thead><tbody>{SHIRT_SIZE_CHART.filter(row => product.sizes.includes(row.size)).map(row => <tr key={row.size}><td>{row.size}</td><td>{row.height.join('–')} cm</td><td>{row.weight.join('–')} kg</td></tr>)}</tbody></table></div></Dialog></>;
}
