import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { productPrice } from '../../shared/product-pricing.mjs';
import { api, send } from './api';
import type { Bootstrap, CartItem, Product } from './types';

interface Notice { id: number; message: string; kind: 'success' | 'error' }
interface StoreValue {
  data: Bootstrap | null; loading: boolean; error: string; cart: CartItem[];
  refresh: () => Promise<void>; notify: (message: string, kind?: 'success' | 'error') => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  addToCart: (product: Product, size: string, color: string, quantity: number) => Promise<void>;
  updateCart: (id: string, quantity: number) => Promise<void>;
  removeCart: (id: string) => Promise<void>;
  pendingCart: CartItem[]; retryPendingCart: () => Promise<void>;
  updatePendingCart: (id: string, quantity: number) => void; removePendingCart: (id: string) => void;
}
const StoreContext = createContext<StoreValue | null>(null);
const CART_KEY = 'nep-form-guest-cart';
const AUTH_EVENT_KEY = 'nep-form-auth-event';
function announceAuthChange() {
  // Share only an invalidation signal; the HttpOnly cookie remains the authority.
  try { localStorage.setItem(AUTH_EVENT_KEY, `${Date.now()}-${Math.random()}`); }
  catch { /* Focus/visibility reconciliation still works if storage is unavailable. */ }
}
function readGuestCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string' && typeof item.productId === 'string' && typeof item.size === 'string' && typeof item.color === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) : [];
  }
  catch { return []; }
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guestCart, setGuestCart] = useState<CartItem[]>(readGuestCart);
  const [notices, setNotices] = useState<Notice[]>([]);
  const bootstrapRequest = useRef(0);
  const hasBootstrap = useRef(false);
  const foregroundRefresh = useRef<Promise<void> | null>(null);
  const notify = useCallback((message: string, kind: Notice['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setNotices((current) => [...current.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setNotices((current) => current.filter((n) => n.id !== id)), 4500);
  }, []);
  const refresh = useCallback(async function restore(background = false): Promise<void> {
    // A focus check must not supersede a successful login/cart refresh then fail silently.
    if (background && foregroundRefresh.current) {
      await foregroundRefresh.current.catch(() => undefined);
      return restore(true);
    }
    const request = ++bootstrapRequest.current;
    const task = (async () => {
      try {
        const next = await api<Bootstrap>('/bootstrap');
        if (request === bootstrapRequest.current) { hasBootstrap.current = true; setData(next); setError(''); }
      }
      catch (e) { if (request === bootstrapRequest.current && (!background || !hasBootstrap.current)) setError(e instanceof Error ? e.message : 'Chưa kết nối được cửa hàng.'); throw e; }
      finally { if (request === bootstrapRequest.current) setLoading(false); }
    })();
    if (background) return task;
    foregroundRefresh.current = task;
    try { await task; }
    finally { if (foregroundRefresh.current === task) foregroundRefresh.current = null; }
  }, []);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reconcile = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void refresh(true).catch(() => undefined); }, 0);
    };
    const visibility = () => { if (document.visibilityState === 'visible') reconcile(); };
    const storage = (event: StorageEvent) => { if (event.key === AUTH_EVENT_KEY) reconcile(); };
    window.addEventListener('storage', storage);
    window.addEventListener('focus', reconcile);
    window.addEventListener('pageshow', reconcile);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', reconcile);
      window.removeEventListener('pageshow', reconcile);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [refresh]);
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(guestCart)); }, [guestCart]);
  async function finishLogin() {
    let ready = true;
    if (guestCart.length) {
      try { await api('/cart/merge', send('POST', { items: guestCart })); setGuestCart([]); }
      catch { ready = false; notify('Đã đăng nhập. Có sản phẩm trong giỏ cần bạn kiểm tra lại.', 'error'); }
    }
    await refresh();
    return ready;
  }
  async function login(email: string, password: string) { await api('/auth/login', send('POST', { email, password })); announceAuthChange(); return finishLogin(); }
  async function register(name: string, email: string, password: string, confirmPassword: string) {
    const result = await api<{ user: {id:string}; localOnly?:boolean; verificationUrl?:string }>('/auth/register', send('POST', { name, email, password, confirmPassword }));
    if (result.localOnly && result.verificationUrl) sessionStorage.setItem(`nep-local-verification:${result.user.id}`, result.verificationUrl);
    announceAuthChange();
    return finishLogin();
  }
  async function resetPassword(token: string, password: string, confirmPassword: string) {
    await api('/auth/reset-password', send('POST', { token, password, confirmPassword }));
    announceAuthChange();
    await refresh();
  }
  async function logout() { await api('/auth/logout', send('POST')); announceAuthChange(); setData(null); await refresh(); notify('Bạn đã đăng xuất.'); }
  async function addToCart(product: Product, size: string, color: string, quantity: number) {
    const available = product.variants.find((v) => v.size === size && v.color === color)?.stock ?? 0;
    if (product.isCustomBase) throw new Error('Bạn hãy mở studio để thiết kế áo này.');
    const existing = (data?.user ? data.cart : guestCart).find((item) => !item.custom && item.productId === product.id && item.size === size && item.color === color)?.quantity ?? 0;
    if (quantity < 1 || existing + quantity > available) throw new Error('Số lượng bạn chọn vượt quá số hàng còn lại cho size và màu này.');
    if (data?.user) { await api('/cart', send('POST', { productId: product.id, size, color, quantity })); await refresh(); }
    else setGuestCart((current) => {
      const match = current.find((item) => !item.custom && item.productId === product.id && item.size === size && item.color === color);
      return match ? current.map((item) => item.id === match.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.variants.find((v) => v.size === size && v.color === color)?.stock ?? product.stock) } : item)
        : [...current, { id: crypto.randomUUID(), productId: product.id, size, color, quantity }];
    });
    notify('Đã thêm vào giỏ hàng.');
  }
  async function updateCart(id: string, quantity: number) {
    if (data?.user) { await api(`/cart/${id}`, send('PATCH', { quantity })); await refresh(); }
    else setGuestCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  }
  async function removeCart(id: string) {
    if (data?.user) { await api(`/cart/${id}`, send('DELETE')); await refresh(); }
    else setGuestCart((current) => current.filter((item) => item.id !== id));
  }
  async function retryPendingCart() {
    await api('/cart/merge', send('POST', { items: guestCart }));
    setGuestCart([]); await refresh(); notify('Đã cập nhật đầy đủ giỏ hàng của bạn.');
  }
  const updatePendingCart = (id: string, quantity: number) => setGuestCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  const removePendingCart = (id: string) => setGuestCart((current) => current.filter((item) => item.id !== id));
  const value = { data, loading, error, refresh, notify, login, register, resetPassword, logout, addToCart, updateCart, removeCart,
    cart: data?.user ? data.cart : guestCart, pendingCart: data?.user ? guestCart : [], retryPendingCart, updatePendingCart, removePendingCart };
  return <StoreContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{notices.map((notice) => <div key={notice.id} className={`toast toast-${notice.kind}`}>{notice.message}</div>)}</div></StoreContext.Provider>;
}
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('StoreProvider required');
  return value;
}
export function useCartTotal() {
  const { cart, data } = useStore();
  return useMemo(() => cart.reduce((sum, item) => {
    const product = data?.products.find((p) => p.id === item.productId);
    return sum + (item.custom?.unitPrice ?? (product ? productPrice(product) : 0)) * item.quantity;
  }, 0), [cart, data]);
}
