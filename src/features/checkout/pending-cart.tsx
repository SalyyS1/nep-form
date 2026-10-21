import { useState } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store-context';
import { ErrorText, Quantity } from '../../components/ui';

export function PendingCart() {
  const { data, cart, pendingCart, updatePendingCart, removePendingCart, retryPendingCart } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!pendingCart.length) return null;
  async function retry() {
    setBusy(true); setError('');
    try { await retryPendingCart(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Giỏ hàng chưa được cập nhật.'); }
    finally { setBusy(false); }
  }
  return <section className="pending-cart-panel"><div className="pending-cart-heading"><AlertCircle size={21} /><div><h2>Một vài món cần bạn kiểm tra lại.</h2><p>Bạn đã đăng nhập. Những lựa chọn dưới đây vẫn được giữ lại vì số lượng hoặc tình trạng sản phẩm đã thay đổi.</p></div></div>{pendingCart.map((item) => {
    const product = data?.products.find((p) => p.id === item.productId);
    const available = (product?.variants.find((v) => v.size === item.size && v.color === item.color)?.stock ?? 0) - (cart.find((line) => line.productId === item.productId && line.size === item.size && line.color === item.color)?.quantity ?? 0);
    return <div className="pending-cart-item" key={item.id}>{product && <img src={product.images[0]} alt="" />}<div><strong>{product?.name || 'Sản phẩm không còn trên kệ'}</strong><p>{item.color} / {item.size} · Đã chọn {item.quantity}{available > 0 ? ` · Còn có thể thêm ${available}` : ' · Tạm hết hàng'}</p></div>{available > 0 && <Quantity value={item.quantity} onChange={(quantity) => updatePendingCart(item.id, quantity)} max={available} />}<button className="icon-button" onClick={() => removePendingCart(item.id)} aria-label={`Bỏ ${product?.name || 'sản phẩm'} khỏi giỏ chờ`}><Trash2 size={17} /></button></div>;
  })}<ErrorText>{error}</ErrorText><button className="button-secondary" disabled={busy} onClick={retry}>{busy ? 'Đang kiểm tra...' : 'Cập nhật các món này vào giỏ'}</button></section>;
}
