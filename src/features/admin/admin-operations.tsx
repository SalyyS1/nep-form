import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, orderLabels, paymentLabels } from '../../lib/api';
import type { AdminData, AuditEvent } from '../../lib/types';
import { PageTitle, Empty } from './admin-shared';

const time = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
const actions: Record<string, string> = { 'order.update': 'Cập nhật đơn hàng', 'order.cancel': 'Khách hủy đơn', 'product.create': 'Thêm sản phẩm', 'product.update': 'Sửa sản phẩm / kho', 'settings.update': 'Đổi cài đặt cửa hàng', 'support.status': 'Đổi trạng thái hỗ trợ', 'custom-pricing.update': 'Đổi bảng giá custom' };
function targetLabel(event: AuditEvent, data: AdminData) {
  const id = typeof event.target === 'string' ? event.target : event.target?.id;
  return data.orders.find(o => o.id === id)?.code || data.products.find(p => p.id === id)?.name || (event.action.startsWith('support.') ? data.users.find(u => u.id === id)?.name : '') || '';
}
export function OperationsOverview({ data }: { data: AdminData }) {
  const max = Math.max(1, ...data.stats.daily.map(day => day.orders));
  return <>
    <div className="admin-ops-grid"><Link className="admin-ops-card" to="/quan-tri/don-hang"><span>Tiền đang chờ thu</span><strong>{money(data.stats.unpaidTotal)}</strong><small>{data.stats.reviewCount} đơn cần đối soát riêng</small></Link><Link className="admin-ops-card" to="/quan-tri/don-hang"><span>Đơn có thiết kế riêng</span><strong>{data.stats.customOrderCount} đơn</strong><small>Xem bản in và chi phí trong từng đơn</small></Link><Link className="admin-ops-card" to="/quan-tri/ho-tro"><span>Khách đang cần hỗ trợ</span><strong>{data.stats.supportOpen} hội thoại</strong><small>Mở hộp thư và trả lời khách ↗</small></Link></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Nhịp cửa hàng · 14 ngày</h2><p>Số đơn theo ngày đặt, múi giờ Việt Nam. Di chuột để xem tiền đã thu của các đơn đó.</p></div></div><div className="admin-chart" role="img" aria-label={`Biểu đồ số đơn trong 14 ngày: ${data.stats.daily.map(d => `${d.date}: ${d.orders} đơn`).join(', ')}`}>{data.stats.daily.map(day => <div className="admin-chart-day" key={day.date} title={`${day.date}: ${day.orders} đơn · Đã thu ${money(day.revenue)}`}><b>{day.orders || ''}</b><i style={{ height: `${Math.max(1, day.orders / max * 130)}px` }}/><small>{day.date.slice(8)}/{day.date.slice(5,7)}</small></div>)}</div><p className="admin-chart-caption">Tiền đã thu tính theo trạng thái thanh toán hiện tại của đơn, không tính đơn đã hủy.</p><div className="admin-status-summary">{Object.entries(data.stats.statuses).map(([status, count]) => <span key={status}>{orderLabels[status as keyof typeof orderLabels]} <b>{count}</b></span>)}</div></section>
  </>;
}
export function AuditPage({ data }: { data: AdminData }) {
  const [page, setPage] = useState(1);
  return <><PageTitle title="Nhật ký hoạt động" description="200 thay đổi gần nhất: đơn hàng, kho, cấu hình và hỗ trợ."/><section className="admin-panel"><div className="admin-audit-list">{data.audit.length ? data.audit.slice((page - 1) * 20, page * 20).map(event => <div className="admin-audit-event" key={event.id}><div><strong>{actions[event.action] || event.action}{targetLabel(event, data) && ` · ${targetLabel(event, data)}`}</strong><p>{data.users.find(u => u.id === event.actorId)?.name || 'Tài khoản cửa hàng'}{typeof event.target === 'object' && event.target?.toStatus && ` · ${orderLabels[event.target.toStatus]}`}{typeof event.target === 'object' && event.target?.toPayment && ` · ${paymentLabels[event.target.toPayment]}`}</p></div><time dateTime={event.createdAt}>{time(event.createdAt)}</time></div>) : <Empty>Những thay đổi tiếp theo sẽ được ghi nhận tại đây.</Empty>}</div><div className="admin-inbox-pages"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</button><span>Trang {page} · {data.audit.length} hoạt động</span><button disabled={page * 20 >= data.audit.length} onClick={() => setPage(p => p + 1)}>Trang sau</button></div></section></>;
}
export function OrderHistory({ data, orderId }: { data: AdminData; orderId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api<{ events: AuditEvent[] }>(`/admin/orders/${orderId}/history`, { signal: controller.signal }).then(result => { setEvents(result.events); setError(''); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [orderId, data.audit]);
  if (error) return <p className="admin-error" role="alert">{error}</p>;
  return <section className="admin-form-group admin-order-history"><h3>Lịch sử xử lý</h3>{events.length ? events.map(event => <div key={event.id}><p>{actions[event.action]}{typeof event.target === 'object' && event.target?.toStatus && ` · ${orderLabels[event.target.toStatus]}`}{typeof event.target === 'object' && event.target?.toPayment && ` · ${paymentLabels[event.target.toPayment]}`}</p><small>{time(event.createdAt)} · {data.users.find(u => u.id === event.actorId)?.name || 'Cửa hàng'}</small></div>) : <p>Chưa có thay đổi sau khi đặt đơn.</p>}</section>;
}
