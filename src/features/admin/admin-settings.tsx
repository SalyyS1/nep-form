import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, send, money, dateLabel } from '../../lib/api';
import type { AdminData, Settings, User } from '../../lib/types';
import { Drawer, Empty, ErrorMessage, PageTitle, SearchField, errorText } from './admin-shared';
import { OrdersTable } from './admin-orders';
import { AdminEmailStatus } from './admin-email-status';

export function CustomersPage({ data }: { data: AdminData }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const customers = data.users.filter(user => user.role === 'customer');
  const filtered = customers.filter(user => `${user.name} ${user.email}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const customerOrders = (user: User) => data.orders.filter(order => order.userId === user.id);
  return <><PageTitle title="Khách hàng" description={`${customers.length} tài khoản khách hàng của NẾP FORM.`}/><section className="admin-panel"><div className="admin-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Tìm tên hoặc email khách hàng…"/><span className="admin-result-count">{filtered.length} khách hàng</span></div>{filtered.length ? <div className="admin-table-wrap"><table className="admin-table admin-customers-table"><thead><tr><th>Khách hàng</th><th>Email</th><th className="admin-num">Đơn hàng</th><th className="admin-num">Đã thanh toán</th><th className="admin-num">Đơn gần nhất</th></tr></thead><tbody>{filtered.map(user => { const orders = customerOrders(user); const latest = [...orders].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]; return <tr key={user.id}><td><div className="admin-customer-cell"><span className="admin-customer-avatar">{user.name.slice(0,1).toUpperCase()}</span><button className="admin-text-button" onClick={() => setSelected(user)}>{user.name}</button></div></td><td>{user.email}</td><td className="admin-num">{orders.length}</td><td className="admin-num">{money(orders.filter(order => order.paymentStatus === 'paid' && order.status !== 'cancelled').reduce((sum,order) => sum + order.total, 0))}</td><td className="admin-num">{latest ? dateLabel(latest.createdAt) : 'Chưa đặt hàng'}</td></tr>; })}</tbody></table></div> : <Empty>{query ? 'Không tìm thấy khách hàng phù hợp.' : 'Khách hàng mới sẽ xuất hiện tại đây sau khi đăng ký.'}</Empty>}</section>{selected && <Drawer title={selected.name} onClose={() => setSelected(null)}><p className="admin-detail-email">{selected.email}</p><section className="admin-form-group"><h3>Lịch sử mua hàng</h3><OrdersTable orders={customerOrders(selected)}/></section><Link className="admin-button admin-button-secondary" to="/quan-tri/don-hang">Quản lý đơn hàng</Link></Drawer>}</>;
}
export function SettingsPage({ data, refresh }: { data: AdminData; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<Settings>(data.settings);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);
  useEffect(() => { setForm(data.settings); }, [data.settings]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setForm(previous => ({ ...previous, [key]: value })); setSuccess(''); };
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try { await api('/admin/settings', send('PATCH', form)); await refresh(); setSuccess('Đã lưu cấu hình cửa hàng.'); }
    catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }
  return <><PageTitle title="Cài đặt cửa hàng" description="Thông tin liên hệ, phí giao hàng và tùy chọn nhận đơn."/><form className="admin-settings-form admin-panel" onSubmit={event => void submit(event)}><section className="admin-settings-section"><div><h2>Thông tin chung</h2><p>Tên và email được sử dụng trong cửa hàng.</p></div><div className="admin-form"><label>Tên cửa hàng<input required maxLength={100} value={form.shopName} onChange={event => update('shopName', event.target.value)}/></label><label>Email liên hệ<input required type="email" value={form.contactEmail} onChange={event => update('contactEmail', event.target.value)}/></label></div></section><section className="admin-settings-section"><div><h2>Giao hàng</h2><p>Phí cố định áp dụng cho mỗi đơn hàng mới.</p></div><div className="admin-form"><label>Phí giao hàng (đ)<input required type="number" min={0} max={1000000} step={1} value={form.shippingFee} onChange={event => update('shippingFee', Number(event.target.value))}/><small>Hiện tại: {money(form.shippingFee)} / đơn hàng.</small></label></div></section><section className="admin-settings-section"><div><h2>Đặt hàng & thanh toán</h2><p>Chủ động điều chỉnh thời điểm nhận đơn.</p></div><div><label className="admin-toggle-row"><span><strong>Cho phép đặt hàng</strong><small>Khách có thể đặt đơn mới.</small></span><input type="checkbox" role="switch" checked={form.checkoutEnabled} onChange={event => update('checkoutEnabled', event.target.checked)}/></label><label className="admin-toggle-row"><span><strong>Chuyển khoản ngân hàng</strong><small>Bật khi đã có hướng dẫn chuyển khoản và quy trình đối soát.</small></span><input type="checkbox" role="switch" checked={form.bankEnabled} onChange={event => update('bankEnabled', event.target.checked)}/></label><p className="admin-helper">COD luôn có sẵn khi cửa hàng đang nhận đơn. Cấu hình này không tự kết nối ngân hàng hoặc xác nhận tiền đã nhận.</p></div></section><ErrorMessage message={error}/>{success && <p className="admin-success" role="status">{success}</p>}<div className="admin-settings-save"><span>{dirty ? 'Bạn có thay đổi chưa lưu.' : 'Cấu hình đã được lưu.'}</span><div>{dirty && <button type="button" className="admin-button admin-button-secondary" onClick={() => { setForm(data.settings); setError(''); }}>Hoàn tác</button>}<button className="admin-button" disabled={!dirty || busy}>{busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button></div></div></form><AdminEmailStatus /></>;
}
