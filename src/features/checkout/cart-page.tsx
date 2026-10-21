import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorText, Quantity } from '../../components/ui';
import { productPrice } from '../../../shared/product-pricing.mjs';
import { ProductPrice } from '../../components/product-price';
import { money } from '../../lib/api';
import { useCartTotal, useStore } from '../../lib/store-context';
import { PendingCart } from './pending-cart';
import { CustomDesignDetails, designPreview } from './custom-design-details';

export default function CartPage() {
  const { data, cart, pendingCart, updateCart, removeCart } = useStore();
  const subtotal = useCartTotal();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function update(id: string, quantity?: number) {
    setBusy(id); setError('');
    try { if (quantity === undefined) await removeCart(id); else await updateCart(id, quantity); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa cập nhật được giỏ hàng.'); }
    finally { setBusy(''); }
  }
  return <div className="container cart-page"><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Giỏ hàng</span></div><div className="page-heading"><p className="eyebrow">NHỮNG LỰA CHỌN CỦA BẠN</p><h1>Giỏ hàng<span className="olive-period">.</span><span className="heading-count">({cart.reduce((sum, i) => sum + i.quantity, 0)})</span></h1></div><PendingCart />{cart.length ? <div className="purchase-layout"><div><div className="cart-table-heading"><span>Sản phẩm</span><span>Số lượng</span><span>Thành tiền</span></div>{cart.map((item) => { const product = data?.products.find((p) => p.id === item.productId); if (!product) return <div className="cart-item" key={item.id}><p>Sản phẩm không còn trên kệ.</p><button className="text-link" onClick={() => update(item.id)}>Xóa khỏi giỏ</button></div>; const unitPrice = item.custom?.unitPrice ?? productPrice(product); const productLink = item.custom ? `/thiet-ke?ban-thiet-ke=${encodeURIComponent(item.custom.designId)}` : `/san-pham/${product.slug}`; const stock = product.variants.find((v) => v.size === item.size && v.color === item.color)?.stock ?? product.stock; const otherQuantity = cart.reduce((sum, other) => sum + (other.id !== item.id && other.productId === item.productId && other.size === item.size && other.color === item.color ? other.quantity : 0), 0); const max = Math.max(0, stock - otherQuantity); return <article className="cart-item" key={item.id}><Link to={productLink} className="cart-item-photo"><img src={item.custom ? designPreview(item.custom.designId) : product.images[0]} alt={item.custom?.name || product.name} /></Link><div className="cart-item-info"><Link to={productLink}>{item.custom?.name || product.name}</Link><p>{item.color} <span>/</span> Size {item.size}</p>{item.custom ? <span>{money(unitPrice)}</span> : <ProductPrice product={product} />}{item.custom && <CustomDesignDetails custom={item.custom} />}<button className="text-link cart-remove" onClick={() => update(item.id)} disabled={busy === item.id}><Trash2 size={13} />Xóa</button></div><Quantity value={item.quantity} onChange={(value) => update(item.id, value)} max={max} disabled={busy === item.id} /><strong className="cart-line-total">{money(unitPrice * item.quantity)}</strong></article>; })}<ErrorText>{error}</ErrorText><Link className="text-link continue-shopping" to="/cua-hang"><ArrowLeft size={17} />Tiếp tục mua sắm</Link></div><aside className="order-summary"><h2>Tóm tắt đơn hàng</h2><div className="summary-row"><span>Tạm tính</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Phí giao hàng</span><span>Tính khi thanh toán</span></div><div className="summary-total"><span>Tạm tính</span><strong>{money(subtotal)}</strong></div><p className="summary-note">Bạn có thể chọn hoặc thay đổi địa chỉ nhận hàng ở bước tiếp theo.</p><Link className="button full-width" to={data?.user ? '/thanh-toan' : '/dang-nhap?tiep=%2Fthanh-toan'}>{data?.user ? 'Tiến hành thanh toán' : 'Đăng nhập để đặt hàng'}<ArrowRight size={17} /></Link><div className="secure-note"><ShieldCheck size={17} />{data?.settings.bankEnabled ? 'Trả khi nhận hàng hoặc chuyển khoản' : 'Thanh toán khi nhận hàng'}</div></aside></div> : pendingCart.length ? null : <EmptyState title="Giỏ hàng chưa có sản phẩm." text="Chọn mẫu có sẵn hoặc tự thiết kế một chiếc áo." />}</div>;
}
