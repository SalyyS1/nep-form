import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight, TicketPercent, X } from 'lucide-react';
import { money } from '../../lib/api';
import type { CheckoutQuote } from '../../lib/types';
import { useCheckoutPromotions } from './use-checkout-promotions';
import { VoucherPicker } from './voucher-picker';
import './checkout-coupon.css';

export function CheckoutCoupon({ quote, couponCode, loading, error, contextKey, onApply, onRemove }: {
  quote: CheckoutQuote | null; couponCode: string; loading: boolean; error: string; contextKey: string; onApply:(code:string)=>Promise<unknown>; onRemove:()=>Promise<unknown>;
}) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [open, setOpen] = useState(false);
  const [applyFailure, setApplyFailure] = useState({ context: contextKey, error: '' });
  const selectionSerial = useRef(0);
  const pickerContext = useRef(contextKey);
  const invalidateSelection = useCallback(() => { selectionSerial.current++; }, []);
  useLayoutEffect(() => {
    pickerContext.current = contextKey;
    invalidateSelection();
    return invalidateSelection;
  }, [contextKey, invalidateSelection]);
  const promotions = useCheckoutPromotions(contextKey);
  const best = promotions.data?.promotions.find(promotion => promotion.code === promotions.data?.bestCode && promotion.eligible && promotion.discount > 0);
  // A private code may save more than every publicly listed offer. Suggest a switch only after comparing actual savings.
  const suggestBest = best && !promotions.loading && !promotions.error && best.code !== couponCode && (!couponCode || (quote?.coupon && best.discount > quote.discount));
  function openPicker() { selectionSerial.current++; setApplyFailure({ context: contextKey, error: '' }); setOpen(true); void promotions.reload(); }
  function closePicker() { selectionSerial.current++; setOpen(false); }
  async function choose(code: string) {
    const current = ++selectionSerial.current;
    setApplyFailure({ context: contextKey, error: '' });
    const isCurrent = () => current === selectionSerial.current && pickerContext.current === contextKey;
    try { await onApply(code); if (isCurrent()) setOpen(false); }
    catch (reason) {
      if (!isCurrent()) return;
      setApplyFailure({ context: contextKey, error: reason instanceof Error ? reason.message : 'Chưa áp dụng được mã. Bạn thử lại nhé.' });
      void promotions.reload();
    }
  }
  async function apply() {
    if (!code.trim()) { setLocalError('Bạn nhập mã giảm giá trước nhé.'); return; }
    setLocalError('');
    try { await onApply(code); setCode(''); } catch { /* Parent retains the authoritative failure. */ }
  }
  function keyboard(event:KeyboardEvent<HTMLInputElement>) { if (event.key === 'Enter') { event.preventDefault(); if (!loading) void apply(); } }
  const conditions = quote?.coupon ? [quote.coupon.firstOrderOnly ? 'Dành cho đơn đầu tiên' : '', (quote.coupon.minQuantity ?? 1) > 1 ? `Từ ${quote.coupon.minQuantity} món` : ''].filter(Boolean).join(' · ') : '';
  return <section className="checkout-coupon" aria-label="Mã giảm giá"><label htmlFor="checkout-coupon-code"><TicketPercent size={17} />Có mã ưu đãi? Nhập ở đây.</label>
    <button type="button" className="checkout-voucher-trigger" onClick={openPicker}><span><TicketPercent size={17}/>Chọn mã giảm giá</span><ChevronRight size={17}/></button>
    {suggestBest && <p className="checkout-best-offer"><strong>{best.code}</strong> giúp giảm {money(best.discount)} cho đơn này. <button type="button" className="text-link" onClick={openPicker}>Xem ưu đãi</button></p>}
    <div className="checkout-coupon-input"><input id="checkout-coupon-code" className="input" value={code} onChange={event => {setCode(event.target.value);setLocalError('');}} onKeyDown={keyboard} maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="Nhập mã giảm giá" disabled={loading} /><button type="button" className="button-secondary" disabled={loading || !code.trim()} onClick={() => void apply()}>{loading ? 'Đang tính…' : 'Áp dụng'}</button></div>
    {couponCode && <div className="applied-coupon"><div><strong>{couponCode}</strong><span>{quote?.coupon ? `Giảm ${money(quote.discount)} · ${quote.coupon.label}` : 'Bạn có thể bỏ mã để tiếp tục đặt hàng.'}</span>{conditions && <span>{conditions}</span>}</div><button type="button" className="icon-button" disabled={loading} aria-label="Bỏ mã giảm giá" onClick={() => void onRemove().catch(() => undefined)}><X size={17} /></button></div>}
    {(localError || error) && <p className="error-text" role="alert">{localError || error}</p>}
    <small>Mỗi đơn dùng một mã, tính trên tiền hàng sau sale; không giảm phí giao hàng.</small>
    <VoucherPicker open={open} onClose={closePicker} data={promotions.data} loading={promotions.loading} error={promotions.error} applyError={applyFailure.context === contextKey ? applyFailure.error : ''} loadedAt={promotions.loadedAt} couponCode={quote?.coupon?.code ?? ''} busy={loading} onChoose={code => void choose(code)} onReload={() => void promotions.reload()}/>
  </section>;
}
