import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChartNoAxesCombined, Package, ShoppingBag, Users, Palette, Settings2, Menu, RefreshCw, X, MessageCircle, History, TicketPercent } from 'lucide-react';
import { api, ApiError, money, dateLabel } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import type { AdminData } from '../../lib/types';
import { ProductsPage } from './admin-products';
import { OrdersPage, OrdersTable } from './admin-orders';
import { CustomersPage, SettingsPage } from './admin-settings';
import { PageTitle, Empty, errorText } from './admin-shared';
import { CustomPricingPage } from './admin-custom-pricing';
import './admin.css';
import { AdminSupport } from './admin-support';
import { OperationsOverview, AuditPage } from './admin-operations';
import { PromotionsPage } from './admin-promotions';

const navigation = [
  { to: '/quan-tri', label: 'Tổng quan', icon: ChartNoAxesCombined },
  { to: '/quan-tri/san-pham', label: 'Sản phẩm', icon: Package },
  { to: '/quan-tri/khuyen-mai', label: 'Khuyến mãi', icon: TicketPercent },
  { to: '/quan-tri/don-hang', label: 'Đơn hàng', icon: ShoppingBag },
  { to: '/quan-tri/khach-hang', label: 'Khách hàng', icon: Users },
  { to: '/quan-tri/gia-custom', label: 'Giá áo custom', icon: Palette },
  { to: '/quan-tri/ho-tro', label: 'Hỗ trợ khách hàng', icon: MessageCircle },
  { to: '/quan-tri/nhat-ky', label: 'Nhật ký hoạt động', icon: History },
  { to: '/quan-tri/cai-dat', label: 'Cài đặt', icon: Settings2 },
];
export default function AdminPage() {
  const { data: storeData } = useStore();
  const local = storeData?.mode === 'local';
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await api<AdminData>('/admin')); setError(''); setForbidden(false); }
    catch (reason) { setError(errorText(reason)); setForbidden(reason instanceof ApiError && [401, 403].includes(reason.status)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setMenu(false); }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menu]);
  const current = navigation.find(item => item.to === location.pathname)?.label || 'Quản trị';
  return <div className="admin-app">
    <aside className="admin-sidebar"><Link to="/" className="admin-wordmark">nếp form<span>KHÔNG GIAN QUẢN TRỊ</span></Link><AdminNav pending={data?.stats.pendingCount || 0}/><div className="admin-sidebar-bottom"><div className="admin-local"><i/>{local ? 'Phiên bản local' : 'Cửa hàng trực tuyến'}</div><Link to="/">Xem cửa hàng <ArrowUpRight size={16}/></Link></div></aside>
    <div className="admin-main"><header className="admin-topbar"><div><button className="admin-icon admin-menu-button" onClick={() => setMenu(true)} aria-label="Mở trình đơn"><Menu size={21}/></button><span>Quản trị <span className="admin-breadcrumb">/ {current}</span></span></div><div><button className="admin-icon" onClick={() => void refresh()} disabled={loading} aria-label="Làm mới dữ liệu"><RefreshCw size={17} className={loading ? 'admin-spinning' : ''}/></button><span className="admin-avatar">NF</span><span className="admin-account">Chủ cửa hàng</span></div></header>
      <main className="admin-content" id="admin-main">
        {error && <div className="admin-banner" role="alert"><strong>{forbidden ? 'Phiên quản trị không còn hiệu lực.' : 'Không tải được dữ liệu.'}</strong><span>{error}</span>{forbidden ? <Link to="/dang-nhap?tiep=%2Fquan-tri">Đăng nhập lại</Link> : <button onClick={() => void refresh()}>Thử lại</button>}</div>}
        {!data && !error ? <div className="admin-loading" role="status"><div/><div/><div/><p>Đang tải không gian quản trị…</p></div> : data && !forbidden && <Routes>
          <Route index element={<Dashboard data={data}/>}/>
          <Route path="san-pham" element={<ProductsPage data={data} refresh={refresh}/>}/>
          <Route path="khuyen-mai" element={<PromotionsPage/>}/>
          <Route path="don-hang" element={<OrdersPage data={data} refresh={refresh}/>}/>
          <Route path="khach-hang" element={<CustomersPage data={data}/>}/>
          <Route path="ho-tro" element={<AdminSupport/>}/>
          <Route path="nhat-ky" element={<AuditPage data={data}/>}/>
          <Route path="gia-custom" element={<CustomPricingPage/>}/>
          <Route path="cai-dat" element={<SettingsPage data={data} refresh={refresh}/>}/>
          <Route path="*" element={<Empty>Trang này chưa có. <Link to="/quan-tri">Về tổng quan</Link></Empty>}/>
        </Routes>}
        <footer className="admin-footer"><span>NẾP FORM · Mặc theo cách mình.</span><span>{local ? 'Dữ liệu lưu trên thiết bị này' : 'Dữ liệu lưu trên máy chủ'}</span></footer>
      </main>
    </div>
    {menu && <DrawerMenu onClose={() => setMenu(false)} pending={data?.stats.pendingCount || 0}/>}
  </div>;
}
function AdminNav({ pending }: { pending: number }) {
  return <nav className="admin-navigation" aria-label="Quản trị cửa hàng"><span className="admin-nav-caption">CỬA HÀNG</span>{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/quan-tri'}><Icon size={19}/><span>{label}</span>{to.endsWith('don-hang') && pending > 0 && <b>{pending}</b>}</NavLink>)}</nav>;
}
function DrawerMenu({ onClose, pending }: { onClose: () => void; pending: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    ref.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="admin-mobile-nav" aria-label="Trình đơn quản trị" onCancel={onClose}><button className="admin-nav-backdrop" onClick={onClose} tabIndex={-1} aria-label="Đóng trình đơn"/><aside><div className="admin-mobile-nav-head"><Link to="/" className="admin-wordmark">nếp form</Link><button className="admin-icon" onClick={onClose} aria-label="Đóng trình đơn"><X/></button></div><AdminNav pending={pending}/><Link className="admin-store-link" to="/">Xem cửa hàng <ArrowUpRight size={16}/></Link></aside></dialog>;
}
function Dashboard({ data }: { data: AdminData }) {
  const recent = [...data.orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const low = data.products.filter(product => product.isActive && product.stock < 10).sort((a,b) => a.stock - b.stock).slice(0, 4);
  return <><PageTitle title="Tổng quan cửa hàng" description="Theo dõi cửa hàng và những việc cần bạn xử lý."><span className="admin-today">{dateLabel(new Date().toISOString())}</span></PageTitle>
    <div className="admin-kpis">{[{ label: 'Doanh thu đã nhận', value: money(data.stats.revenue), help: 'Các đơn đã ghi nhận thanh toán' }, { label: 'Tổng đơn hàng', value: data.stats.orderCount, help: 'Tất cả đơn trong cửa hàng' }, { label: 'Chờ xác nhận', value: data.stats.pendingCount, help: 'Đơn mới cần bạn xử lý' }, { label: 'Sản phẩm sắp hết', value: data.stats.lowStockCount, help: 'Kiểm tra số lượng tồn kho' }].map((item, i) => <section className={`admin-kpi ${i === 0 ? 'admin-kpi-primary' : ''}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.help}</small></section>)}</div>
    <OperationsOverview data={data}/>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Đơn hàng gần đây</h2><p>Bắt đầu từ những đơn mới nhất.</p></div><Link to="/quan-tri/don-hang">Xem tất cả <ArrowUpRight size={16}/></Link></div><OrdersTable orders={recent}/></section>
    <div className="admin-dashboard-bottom"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Cần bổ sung hàng</h2><p>Các mẫu đang bán còn dưới 10 sản phẩm.</p></div><Package size={19}/></div>{low.length ? <div className="admin-stock-list">{low.map(product => <Link to="/quan-tri/san-pham" key={product.id}><img src={product.images[0]} alt=""/><div><strong>{product.name}</strong><small>{product.categoryLabel}</small></div><span className="admin-stock-number">{product.stock} còn lại</span></Link>)}</div> : <Empty>Kho hàng đang đủ cho các sản phẩm đang bán.</Empty>}</section><section className="admin-panel admin-quick-panel"><span className="admin-eyebrow">CỬA HÀNG CỦA BẠN</span><h2>Quản lý<br/>sản phẩm.</h2><p>Cập nhật giá, hình ảnh và tồn kho cho các mẫu đang bán.</p><Link className="admin-button admin-button-secondary" to="/quan-tri/san-pham">Quản lý sản phẩm <ArrowUpRight size={16}/></Link><div className="admin-quick-meta"><span>{data.products.filter(p => p.isActive).length} sản phẩm đang bán</span><span>{data.users.filter(u => u.role === 'customer').length} khách hàng</span></div></section></div>
  </>;
}
