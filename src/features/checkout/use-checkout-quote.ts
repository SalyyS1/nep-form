import { useCallback, useEffect, useRef, useState } from 'react';
import { api, send } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import type { CheckoutQuote } from '../../lib/types';

export function useCheckoutQuote() {
  const { cart, data } = useStore();
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const applied = useRef('');
  const serial = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const hasCart = !!(cart.length && data?.user);
  const context = JSON.stringify([data?.user?.id, cart, data?.settings.shippingFee, data?.customPricing, data?.products.map(p => [p.id, p.price, p.salePrice, p.saleStartsAt, p.saleEndsAt, p.version])]);
  const cancel = useCallback(() => { serial.current++; controller.current?.abort(); }, []);
  const load = useCallback(async (code: string, mode: 'apply' | 'refresh') => {
    const current = ++serial.current;
    controller.current?.abort(); controller.current = new AbortController();
    setLoading(true); setError('');
    try {
      const result = await api<{quote:CheckoutQuote}>('/checkout/quote', { ...send('POST', {couponCode:code}), signal:controller.current.signal });
      if (serial.current === current) {
        setQuote(result.quote);
        if (mode === 'apply') { applied.current = result.quote.coupon?.code || ''; setCouponCode(applied.current); }
      }
      return result.quote;
    } catch (reason) {
      if (serial.current === current) { setError(reason instanceof Error ? reason.message : 'Chưa tính được tổng tiền. Bạn thử lại nhé.'); if (mode === 'refresh') setQuote(null); }
      throw reason;
    } finally { if (serial.current === current) setLoading(false); }
  }, []);
  useEffect(() => {
    setQuote(null);
    if (hasCart) void load(applied.current, 'refresh').catch(() => undefined);
    else setLoading(false);
    return cancel;
  }, [context, hasCart, load, cancel]);
  return {quote, loading, error, couponCode, contextKey: context, apply:(code:string) => load(code.trim().toUpperCase(), 'apply'), remove:() => load('', 'apply'), reload:() => load(applied.current, 'refresh')};
}
