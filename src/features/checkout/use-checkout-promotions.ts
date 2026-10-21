import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { CheckoutPromotions } from '../../lib/types';

interface PromotionState {
  context: string;
  data: CheckoutPromotions | null;
  loading: boolean;
  error: string;
  loadedAt: string | null;
}

export function useCheckoutPromotions(contextKey: string) {
  const [state, setState] = useState<PromotionState>({ context: contextKey, data: null, loading: true, error: '', loadedAt: null });
  const serial = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const activeContext = useRef<string | null>(contextKey);
  const reload = useCallback(async () => {
    // A failed apply can settle after the cart/account has already changed.
    if (activeContext.current !== contextKey) return;
    const current = ++serial.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 15000);
    // Discard an earlier cart/account result immediately, including during a retry.
    setState({ context: contextKey, data: null, loading: true, error: '', loadedAt: null });
    try {
      const data = await api<CheckoutPromotions>('/checkout/promotions', { signal: request.signal });
      if (serial.current === current) setState({ context: contextKey, data, loading: false, error: '', loadedAt: new Date().toISOString() });
    } catch (reason) {
      if (serial.current === current) setState({ context: contextKey, data: null, loading: false, loadedAt: null, error: request.signal.aborted ? 'Tải mã giảm giá quá lâu. Bạn thử lại nhé.' : reason instanceof Error ? reason.message : 'Chưa tải được mã giảm giá. Bạn thử lại nhé.' });
    } finally { window.clearTimeout(timeout); }
  }, [contextKey]);
  const cancel = useCallback(() => { activeContext.current = null; serial.current++; controller.current?.abort(); }, []);
  useEffect(() => {
    activeContext.current = contextKey;
    void reload();
    return cancel;
  }, [contextKey, reload, cancel]);
  // Effects run after render; this guard prevents displaying another account's result.
  const visible = state.context === contextKey ? state : { data: null, loading: true, error: '', loadedAt: null };
  return { ...visible, reload };
}
