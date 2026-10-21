import { useState } from 'react';
import { Plus, Pencil, Archive, ArrowUpRight } from 'lucide-react';
import { api, ApiError, send } from '../../lib/api';
import type { AdminData, Product } from '../../lib/types';
import { Drawer, SearchField, Empty, PageTitle, ErrorMessage, errorText } from './admin-shared';
import { ProductEditor } from './admin-product-editor';
import { ProductPrice } from '../../components/product-price';

export function ProductsPage({ data, refresh }: { data: AdminData; refresh: () => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [archive, setArchive] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const products = data.products.filter(product => `${product.name} ${product.categoryLabel}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (filter === 'all' || (filter === 'active' ? product.isActive : !product.isActive)));
  async function toggleArchive() {
    if (!archive) return;
    setBusy(true); setError('');
    try { await api(`/admin/products/${archive.id}`, send('PATCH', { isActive: !archive.isActive, expectedVersion: archive.version ?? 1 })); await refresh(); setArchive(null); }
    catch (reason) { setError(reason instanceof ApiError && reason.status === 409 ? `${errorText(reason)} Hãy đóng cửa sổ, chọn Làm mới dữ liệu rồi mở lại sản phẩm trước khi đổi trạng thái.` : errorText(reason)); }
    finally { setBusy(false); }
  }
  return <><PageTitle title="Sản phẩm" description={`${data.products.length} sản phẩm · Những lựa chọn cho tủ đồ mỗi ngày.`}><button className="admin-button" onClick={() => setEditing('new')}><Plus size={17}/>Thêm sản phẩm</button></PageTitle>
    <section className="admin-panel"><div className="admin-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Tìm tên sản phẩm, danh mục…"/><select aria-label="Trạng thái sản phẩm" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="hidden">Đã ẩn</option></select><span className="admin-result-count">{products.length} sản phẩm</span></div>
      {products.length ? <div className="admin-table-wrap"><table className="admin-table admin-product-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th className="admin-num">Giá bán</th><th className="admin-num">Tồn kho</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.images[0]} alt=""/><div><button className="admin-text-button" onClick={() => setEditing(product)}>{product.name}</button><small>{product.isDemo ? 'Sản phẩm mẫu' : product.slug}</small></div></div></td><td>{product.categoryLabel}</td><td className="admin-num"><ProductPrice product={product}/></td><td className={`admin-num ${product.stock < 10 ? 'admin-stock-low' : ''}`}>{product.stock}</td><td><span className={`admin-status ${product.isActive ? 'admin-status-paid' : ''}`}><i/>{product.isActive ? 'Đang bán' : 'Đã ẩn'}</span></td><td><div className="admin-row-actions"><button className="admin-icon" onClick={() => setEditing(product)} aria-label={`Sửa ${product.name}`}><Pencil size={16}/></button><button className="admin-icon" onClick={() => { setArchive(product); setError(''); }} aria-label={`${product.isActive ? 'Ẩn' : 'Hiện'} ${product.name}`}>{product.isActive ? <Archive size={16}/> : <ArrowUpRight size={16}/>}</button></div></td></tr>)}</tbody></table></div> : <Empty>Không tìm thấy sản phẩm.{query && <button className="admin-text-button" onClick={() => { setQuery(''); setFilter('all'); }}>Xóa bộ lọc</button>}</Empty>}
    </section>
    {editing && <Drawer title={editing === 'new' ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'} onClose={() => setEditing(null)}><ProductEditor product={editing === 'new' ? undefined : editing} categories={Array.from(new Map(data.products.map(p => [p.category, p.categoryLabel])).entries())} onSaved={async () => { await refresh(); setEditing(null); }} onCancel={() => setEditing(null)}/></Drawer>}
    {archive && <Drawer title={archive.isActive ? 'Ẩn sản phẩm' : 'Mở bán sản phẩm'} onClose={() => setArchive(null)}><p><strong>{archive.name}</strong> {archive.isActive ? 'sẽ không còn xuất hiện trong cửa hàng. Đơn đã đặt vẫn được giữ nguyên.' : 'sẽ xuất hiện trở lại trong cửa hàng.'}</p><ErrorMessage message={error}/><div className="admin-form-actions"><button className="admin-button admin-button-secondary" onClick={() => setArchive(null)}>Quay lại</button><button className="admin-button" disabled={busy} onClick={() => void toggleArchive()}>{busy ? 'Đang lưu…' : archive.isActive ? 'Ẩn sản phẩm' : 'Mở bán'}</button></div></Drawer>}
  </>;
}
