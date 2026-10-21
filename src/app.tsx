import { Fragment, lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store-context';
import { StoreLayout } from './components/store-layout';
import { EmptyState } from './components/ui';
import CatalogPage from './features/storefront/catalog-page';
import ProductPage from './features/storefront/product-page';
import InfoPage from './features/storefront/info-page';
import AuthPage, { ResetPasswordPage } from './features/account/auth-page';
import VerifyEmailPage from './features/account/verify-email-page';
import AccountPage from './features/account/account-page';
import CartPage from './features/checkout/cart-page';
import CheckoutPage from './features/checkout/checkout-page';
import OrderPage from './features/checkout/order-page';

const AdminPage = lazy(() => import('./features/admin/admin-page'));
const StudioPage = lazy(() => import('./features/studio/studio-page'));
const HomePage = lazy(() => import('./features/storefront/home-page'));
function Guard({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { data } = useStore(); const location = useLocation();
  if (!data?.user) return <Navigate to={`/dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && data.user.role !== 'admin') return <EmptyState title="Khu vực dành cho quản trị viên." text="Bạn có thể tiếp tục mua sắm hoặc đăng nhập bằng tài khoản quản trị." to={`/dang-nhap?doi-tai-khoan=1&tiep=${encodeURIComponent(location.pathname + location.search)}`} action="Chuyển tài khoản" />;
  return <Fragment key={data.user.id}>{children}</Fragment>;
}
function ProductRoute() { const { slug } = useParams(); return <ProductPage key={slug} />; }
function AppRoutes() {
  const { data, loading, error, refresh } = useStore();
  const location = useLocation();
  const previous = useRef(location.pathname);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (previous.current.startsWith('/quan-tri') && !location.pathname.startsWith('/quan-tri')) void refresh().catch(() => undefined);
    previous.current = location.pathname;
  }, [location.pathname, refresh]);
  if (loading) return <div className="app-loading"><span className="brand">nếp<span>form</span><i /></span><span className="loading-line" /><p>Đang tải cửa hàng…</p></div>;
  if (!data || error) return <div className="app-loading"><span className="brand">nếp<span>form</span><i /></span><h1>Chưa kết nối được cửa hàng.</h1><p>{error || 'Bạn thử tải lại sau một chút nhé.'}</p><button className="button" onClick={() => refresh().catch(() => undefined)}>Kết nối lại</button></div>;
  return <Suspense fallback={<div className="app-loading"><p>Đang mở trang...</p></div>}><Routes>
    <Route element={<StoreLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/cua-hang" element={<CatalogPage />} />
      <Route path="/san-pham/:slug" element={<ProductRoute />} />
      <Route path="/gio-hang" element={<CartPage />} />
      <Route path="/thanh-toan" element={<Guard><CheckoutPage /></Guard>} />
      <Route path="/dang-nhap" element={<AuthPage />} />
      <Route path="/dang-ky" element={<AuthPage key="register" registerMode />} />
      <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />
      <Route path="/xac-minh-email" element={<VerifyEmailPage />} />
      <Route path="/tai-khoan/*" element={<Guard><AccountPage /></Guard>} />
      <Route path="/don-hang/:id" element={<Guard><OrderPage /></Guard>} />
      <Route path="/ve-nep" element={<InfoPage about />} />
      <Route path="/thong-tin/:slug" element={<InfoPage />} />
      <Route path="*" element={<EmptyState title="Không tìm thấy trang này." text="Bạn kiểm tra đường dẫn hoặc quay lại cửa hàng." />} />
    </Route>
    <Route path="/thiet-ke" element={<StudioPage />} />
    <Route path="/quan-tri/*" element={<Guard admin><AdminPage /></Guard>} />
  </Routes></Suspense>;
}
export default function App() { return <BrowserRouter><StoreProvider><AppRoutes /></StoreProvider></BrowserRouter>; }
