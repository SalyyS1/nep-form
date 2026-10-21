import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store-context';
import { Dialog } from './ui';
import { SupportWidget } from '../features/support/support-widget';

export function StoreLayout() {
  const { data, cart } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  function search(event: FormEvent) { event.preventDefault(); setSearchOpen(false); navigate(`/cua-hang?q=${encodeURIComponent(query)}`); }
  return <>
    <a className="skip-link" href="#noi-dung">Đến nội dung</a>
    <div className="announcement"><span>Tự thiết kế áo, xem giá ngay.</span>{data?.mode === 'local' ? <Link to="/dang-nhap?demo=1">Dùng thử trên máy <ArrowUpRight size={12} /></Link> : <Link to="/thiet-ke">Tạo chiếc áo của bạn <ArrowUpRight size={12}/></Link>}</div>
    <header className="store-header"><div className="header-inner">
      <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở danh mục"><Menu size={23} /></button>
      <Link to="/" className="brand" aria-label="NẾP FORM — Trang chủ">nếp<span>form</span><i /></Link>
      <nav className="desktop-nav" aria-label="Danh mục chính"><NavLink className="nav-studio" to="/thiet-ke">Tự thiết kế áo<ArrowUpRight size={14} /></NavLink><NavLink to="/cua-hang">Mẫu có sẵn</NavLink><Link to="/tai-khoan/thiet-ke">Thiết kế của tôi</Link><Link to="/ve-nep">Về Nếp</Link></nav>
      <div className="header-actions"><button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Tìm kiếm"><Search size={21} /></button><Link className={`icon-button ${location.pathname.startsWith('/tai-khoan') ? 'is-active' : ''}`} to={data?.user ? '/tai-khoan' : '/dang-nhap'} aria-label={data?.user ? 'Tài khoản của bạn' : 'Đăng nhập'}><UserRound size={21} /></Link><Link className="icon-button cart-icon" to="/gio-hang" aria-label={`Giỏ hàng, ${count} sản phẩm`}><ShoppingBag size={21} />{count > 0 && <span>{count}</span>}</Link></div>
    </div></header>
    <main id="noi-dung"><Outlet /></main>
    <SupportWidget />
    <footer className="store-footer"><div className="container footer-grid"><div className="footer-intro"><Link className="brand" to="/">nếp<span>form</span><i /></Link><p>In áo theo thiết kế của bạn.</p><p className="footer-small">Chọn áo, thêm chữ hoặc hình của bạn và xem trước khi đặt.</p></div><div><h3>Khám phá</h3><Link to="/thiet-ke">Tự thiết kế áo</Link><Link to="/cua-hang">Mẫu có sẵn</Link><Link to="/tai-khoan/thiet-ke">Thiết kế của tôi</Link><Link to="/ve-nep">Về Nếp</Link></div><div><h3>Tài khoản & hỗ trợ</h3><Link to="/tai-khoan/don-hang">Đơn hàng của bạn</Link><Link to="/tai-khoan/ho-tro">Nhắn cho Nếp</Link><Link to="/thong-tin/giao-hang">Giao hàng & đổi trả</Link><Link to="/thong-tin/bao-mat">Quyền riêng tư</Link></div><div><h3>Liên hệ Nếp</h3><a href={`mailto:${data?.settings.contactEmail || 'hello@nepform.local'}`}>{data?.settings.contactEmail || 'hello@nepform.local'}</a><span>Cần tư vấn áo hoặc đơn hàng? Nhắn cho Nếp.</span>{data?.user?.role === 'admin' && <Link to="/quan-tri">Trang quản trị ↗</Link>}</div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} NẾP FORM</span><span>{data?.mode === 'local' ? 'Bản thử trên máy · Giá áo & phí in để tham khảo' : 'Thiết kế riêng · In theo yêu cầu'}</span><span>Tự thiết kế áo, xem giá ngay.</span></div></footer>
    <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} title="Bạn đang tìm gì?" className="search-dialog"><form onSubmit={search} className="search-form"><Search size={21} /><input autoFocus className="input" placeholder="Áo thun, sơ mi, quần..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Từ khóa sản phẩm" /><button className="button" type="submit">Tìm kiếm</button></form><p className="muted">Gợi ý: áo thun · sơ mi · phom rộng</p></Dialog>
    <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Khám phá Nếp" className="menu-dialog"><nav className="mobile-nav">{[['/thiet-ke', 'Tự thiết kế áo'], ['/cua-hang', 'Mẫu có sẵn'], ['/tai-khoan/thiet-ke', 'Thiết kế của tôi'], ['/ve-nep', 'Về Nếp'], ['/tai-khoan', 'Tài khoản']].map(([to, label]) => <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={19} /></Link>)}</nav><button className="button-secondary" onClick={() => setMenuOpen(false)}><X size={16} />Đóng danh mục</button></Dialog>
  </>;
}

