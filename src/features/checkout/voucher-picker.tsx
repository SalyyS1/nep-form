import { createPortal } from 'react-dom';
import { Check, TicketPercent } from 'lucide-react';
import { Dialog } from '../../components/ui';
import { money } from '../../lib/api';
import type { CheckoutPromotion, CheckoutPromotions } from '../../lib/types';
import './voucher-picker.css';

const vietnamDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

function VoucherCard({ promotion, best, selected, busy, onChoose }: { promotion: CheckoutPromotion; best: boolean; selected: boolean; busy: boolean; onChoose: (code: string) => void }) {
  return <article aria-label={`Mã ${promotion.code}`} className={`voucher-card${promotion.eligible ? '' : ' voucher-unavailable'}${best ? ' voucher-best' : ''}`}>
    <div className="voucher-card-heading"><div><strong className="voucher-code">{promotion.code}</strong><h4>{promotion.label}</h4></div>{best && <span className="badge">Giảm nhiều nhất</span>}</div>
    <p className="voucher-value">{promotion.type === 'percent' ? `Giảm ${promotion.value}%` : `Giảm ${money(promotion.value)}`}{promotion.maxDiscount !== null && ` · tối đa ${money(promotion.maxDiscount)}`}</p>
    <ul className="voucher-conditions">
      <li>{promotion.minSubtotal > 0 ? `Tiền hàng sau SALE từ ${money(promotion.minSubtotal)}` : 'Không yêu cầu tiền hàng tối thiểu'}</li>
      <li>Từ {promotion.minQuantity ?? 1} món · {promotion.firstOrderOnly ? 'Chỉ dành cho đơn đầu tiên' : 'Áp dụng cả khách đã mua hàng'}</li>
      <li>{promotion.startsAt ? `Từ ${vietnamDate(promotion.startsAt)}` : 'Bắt đầu ngay'} · {promotion.endsAt ? `đến ${vietnamDate(promotion.endsAt)}` : 'không có ngày kết thúc'} (giờ Việt Nam)</li>
      <li>{promotion.usageLimit !== null ? `Tổng cộng ${promotion.usageLimit} lượt cho cả mã` : 'Không giới hạn tổng lượt'} · {promotion.perUserLimit !== null ? `${promotion.perUserLimit} lượt / khách` : 'không giới hạn mỗi khách'}</li>
    </ul>
    {!promotion.eligible && <p className="voucher-reason">{promotion.reason || 'Mã chưa dùng được cho đơn hàng hiện tại.'}</p>}
    <div className="voucher-card-footer"><strong>{promotion.eligible ? `Tiết kiệm ${money(promotion.discount)} cho đơn này` : 'Chưa áp dụng được'}</strong><button type="button" className={selected ? 'button-secondary' : 'button'} aria-label={selected ? `Đang áp dụng mã ${promotion.code}` : `Áp dụng mã ${promotion.code}`} disabled={busy || !promotion.eligible || selected} onClick={() => onChoose(promotion.code)}>{selected ? <><Check size={15}/>Đang áp dụng</> : 'Áp dụng'}</button></div>
  </article>;
}

export function VoucherPicker({ open, onClose, data, loading, error, applyError, loadedAt, couponCode, busy, onChoose, onReload }: {
  open: boolean; onClose: () => void; data: CheckoutPromotions | null; loading: boolean; error: string; applyError: string; loadedAt: string | null; couponCode: string; busy: boolean; onChoose: (code: string) => void; onReload: () => void;
}) {
  const eligible = data?.promotions.filter(promotion => promotion.eligible) ?? [];
  const unavailable = data?.promotions.filter(promotion => !promotion.eligible) ?? [];
  return createPortal(<Dialog open={open} onClose={onClose} title="Chọn mã giảm giá" className="voucher-dialog">
    <p className="voucher-intro"><TicketPercent size={18}/><span>Mỗi đơn dùng một mã, trên tiền hàng sau SALE và không gồm phí giao hàng.</span></p>
    {data && <p className="voucher-cart">Đơn hiện tại: <strong>{money(data.subtotal)}</strong> · {data.quantity} món</p>}
    {applyError && <p className="error-text" role="alert">{applyError}</p>}
    <div className="voucher-list" aria-busy={loading}>
      {loading && <p className="voucher-state" role="status">Đang tìm mã cho đơn của bạn…</p>}
      {error && <div className="voucher-state"><p className="error-text" role="alert">{error}</p><button type="button" className="button-secondary" onClick={onReload}>Thử tải lại</button></div>}
      {!loading && !error && data && !data.promotions.length && <p className="voucher-state" role="status">Chưa có mã hiển thị tại thanh toán. Bạn vẫn có thể nhập mã riêng nếu có.</p>}
      {!loading && !error && eligible.length > 0 && <section className="voucher-section" aria-label="Dùng được cho đơn này"><h3>Dùng được cho đơn này</h3><p className="voucher-section-help">“Giảm nhiều nhất” so sánh các mã đang hiển thị cho đơn này.</p>{eligible.map(promotion => <VoucherCard key={promotion.code} promotion={promotion} best={data?.bestCode === promotion.code && promotion.discount > 0} selected={couponCode === promotion.code} busy={busy} onChoose={onChoose}/>)}</section>}
      {!loading && !error && unavailable.length > 0 && <section className="voucher-section" aria-label="Chưa đủ điều kiện"><h3>Chưa đủ điều kiện</h3>{unavailable.map(promotion => <VoucherCard key={promotion.code} promotion={promotion} best={false} selected={couponCode === promotion.code} busy={busy} onChoose={onChoose}/>)}</section>}
    </div>
    <p className="voucher-disclosure">{loadedAt && `Cập nhật ${vietnamDate(loadedAt)} (giờ Việt Nam). `}Gợi ý theo điều kiện hiện tại, không giữ lượt dùng. Mã được kiểm tra lại khi áp dụng và đặt hàng.</p>
  </Dialog>, document.body);
}
