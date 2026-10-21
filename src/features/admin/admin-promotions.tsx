import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { api, money } from '../../lib/api';
import type { Promotion } from '../../lib/types';
import { Drawer, Empty, ErrorMessage, PageTitle, SearchField, errorText } from './admin-shared';
import { PromotionEditor } from './promotion-editor';
import { vietnamDateTimeLabel } from './vietnam-date-time';
import './admin-promotions.css';

const statusLabels = { active: 'Đang áp dụng', scheduled: 'Chưa bắt đầu', expired: 'Đã hết hạn', exhausted: 'Hết lượt', inactive: 'Đã tắt' };
function promotionStatus(promotion: Promotion, now: number): keyof typeof statusLabels {
  if (!promotion.isActive) return 'inactive';
  if (promotion.endsAt && Date.parse(promotion.endsAt) <= now) return 'expired';
  if (promotion.startsAt && Date.parse(promotion.startsAt) > now) return 'scheduled';
  if (promotion.usageLimit !== null && (promotion.usedCount ?? 0) >= promotion.usageLimit) return 'exhausted';
  return 'active';
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await api<{ promotions: Promotion[] }>('/admin/promotions'); setPromotions(result.promotions); setNow(Date.now()); }
    catch (reason) { setError(errorText(reason)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const filtered = promotions.filter(promotion => `${promotion.code} ${promotion.label}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (filter === 'all' || promotionStatus(promotion, now) === filter));

  return <><PageTitle title="Khuyến mãi" description="Tạo mã giảm giá và theo dõi các chương trình của cửa hàng."><button className="admin-button" onClick={() => { setEditing('new'); setSuccess(''); }}><Plus size={17}/>Tạo mã giảm giá</button></PageTitle>
    <div className="promotion-overview"><strong>SALE + mã giảm giá</strong><p>Chỉnh giá SALE trong mục Sản phẩm. Mỗi đơn dùng một mã, tính trên tiền hàng sau SALE; phí giao hàng giữ nguyên. Đơn hủy được hoàn lượt dùng mã.</p></div>
    <ErrorMessage message={error}/>{success && <p className="admin-success" role="status">{success}</p>}
    <section className="admin-panel" aria-busy={loading}>
      <div className="admin-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Tìm mã hoặc tên chương trình…"/><select aria-label="Trạng thái mã giảm giá" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="admin-icon" disabled={loading} onClick={() => void load()} aria-label="Làm mới mã giảm giá"><RefreshCw size={17} className={loading ? 'admin-spinning' : ''}/></button><span className="admin-result-count">{filtered.length} mã</span></div>
      {loading && !promotions.length ? <p className="promotion-loading" role="status">Đang tải mã giảm giá…</p> : filtered.length ? <div className="admin-table-wrap"><table className="admin-table promotion-table"><thead><tr><th>Mã / chương trình</th><th>Mức giảm</th><th>Thời gian (giờ Việt Nam)</th><th>Lượt sử dụng</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{filtered.map(promotion => {
        const status = promotionStatus(promotion, now);
        return <tr key={promotion.id}><td><button className="admin-text-button promotion-code" onClick={() => setEditing(promotion)}>{promotion.code}</button><small>{promotion.label}</small><span className={`promotion-visibility${promotion.showAtCheckout ? ' promotion-visible' : ''}`}>{promotion.showAtCheckout ? 'Hiện tại thanh toán' : 'Mã riêng tư'}</span>{(promotion.firstOrderOnly || (promotion.minQuantity ?? 1) > 1) && <div className="promotion-restrictions">{promotion.firstOrderOnly && <span>Chỉ đơn đầu tiên</span>}{(promotion.minQuantity ?? 1) > 1 && <span>Từ {promotion.minQuantity} món</span>}</div>}</td><td><strong>{promotion.type === 'percent' ? `${promotion.value}%` : money(promotion.value)}</strong><small>Đơn từ {money(promotion.minSubtotal)}</small>{promotion.maxDiscount !== null && <small>Tối đa {money(promotion.maxDiscount)}</small>}</td><td><span>{promotion.startsAt ? `Từ ${vietnamDateTimeLabel(promotion.startsAt)}` : 'Bắt đầu ngay'}</span><small>{promotion.endsAt ? `Đến ${vietnamDateTimeLabel(promotion.endsAt)}` : 'Không có ngày kết thúc'}</small></td><td><strong>{promotion.usedCount ?? 0} / {promotion.usageLimit ?? 'Không giới hạn'}</strong><small>{promotion.perUserLimit !== null ? `${promotion.perUserLimit} lượt / khách` : 'Không giới hạn mỗi khách'}</small></td><td><span className={`admin-status promotion-status-${status}`}><i/>{statusLabels[status]}</span></td><td><button className="admin-icon" onClick={() => setEditing(promotion)} aria-label={`Sửa mã ${promotion.code}`}><Pencil size={16}/></button></td></tr>;
      })}</tbody></table></div> : <Empty>{error ? 'Không tải được mã giảm giá. Chọn làm mới để thử lại.' : query || filter !== 'all' ? 'Không tìm thấy mã phù hợp.' : 'Chưa có mã giảm giá. Tạo chương trình đầu tiên khi bạn sẵn sàng.'}</Empty>}
    </section>
    {editing && <Drawer title={editing === 'new' ? 'Tạo mã giảm giá' : `Chỉnh sửa ${editing.code}`} onClose={() => setEditing(null)}><PromotionEditor promotion={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); setSuccess('Đã lưu mã giảm giá.'); await load(); }}/></Drawer>}
  </>;
}
