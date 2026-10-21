import { useState, type FormEvent } from 'react';
import { api, ApiError, send } from '../../lib/api';
import type { Promotion } from '../../lib/types';
import { ErrorMessage, errorText } from './admin-shared';
import { isoToVietnamInput, vietnamInputToIso } from './vietnam-date-time';

type PromotionFields = Omit<Promotion, 'id' | 'version' | 'usedCount'>;
type QuotaPreset = 'custom' | 'global-once' | 'customer-once';
function inferQuotaPreset(usageLimit: string, perUserLimit: string): QuotaPreset {
  if (Number(usageLimit) === 1 && perUserLimit === '') return 'global-once';
  if (usageLimit === '' && Number(perUserLimit) === 1) return 'customer-once';
  return 'custom';
}
function optionalPositiveInteger(value: string, label: string): number | null {
  if (value === '') return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label} phải là số nguyên lớn hơn 0.`);
  return number;
}

export function PromotionEditor({ promotion, onSaved, onCancel }: { promotion?: Promotion; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [code, setCode] = useState(promotion?.code ?? '');
  const [label, setLabel] = useState(promotion?.label ?? '');
  const [type, setType] = useState<Promotion['type']>(promotion?.type ?? 'percent');
  const [value, setValue] = useState(promotion?.value.toString() ?? '');
  const [minSubtotal, setMinSubtotal] = useState(promotion?.minSubtotal.toString() ?? '0');
  const [maxDiscount, setMaxDiscount] = useState(promotion?.maxDiscount?.toString() ?? '');
  const [startsAt, setStartsAt] = useState(isoToVietnamInput(promotion?.startsAt));
  const [endsAt, setEndsAt] = useState(isoToVietnamInput(promotion?.endsAt));
  const [usageLimit, setUsageLimit] = useState(promotion?.usageLimit?.toString() ?? '');
  const [perUserLimit, setPerUserLimit] = useState(promotion?.perUserLimit?.toString() ?? '');
  const [quotaPreset, setQuotaPreset] = useState<QuotaPreset>(() => inferQuotaPreset(promotion?.usageLimit?.toString() ?? '', promotion?.perUserLimit?.toString() ?? ''));
  const [firstOrderOnly, setFirstOrderOnly] = useState(promotion?.firstOrderOnly ?? false);
  const [minQuantity, setMinQuantity] = useState((promotion?.minQuantity ?? 1).toString());
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true);
  const [showAtCheckout, setShowAtCheckout] = useState(promotion?.showAtCheckout ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);

  function selectQuotaPreset(preset: QuotaPreset) {
    setQuotaPreset(preset);
    if (preset === 'custom') return;
    setUsageLimit(preset === 'global-once' ? '1' : '');
    setPerUserLimit(preset === 'customer-once' ? '1' : '');
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || conflict) return;
    setError('');
    let fields: PromotionFields;
    try {
      const amount = Number(value);
      const minimum = Number(minSubtotal);
      const quantity = Number(minQuantity);
      if (!label.trim()) throw new Error('Nhập tên chương trình.');
      if (!/^[A-Z0-9_-]{3,32}$/.test(code.trim().toUpperCase())) throw new Error('Mã cần 3–32 chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.');
      if (!Number.isSafeInteger(amount) || amount <= 0 || (type === 'percent' && amount > 100)) throw new Error(type === 'percent' ? 'Phần trăm giảm phải là số nguyên từ 1 đến 100.' : 'Số tiền giảm phải là số đồng nguyên lớn hơn 0.');
      if (!Number.isSafeInteger(minimum) || minimum < 0) throw new Error('Tiền hàng tối thiểu phải là số đồng nguyên từ 0.');
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Số món tối thiểu phải là số nguyên từ 1 đến 10.000.');
      const start = vietnamInputToIso(startsAt); const end = vietnamInputToIso(endsAt);
      if (start && end && start >= end) throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
      fields = { code: code.trim().toUpperCase(), label: label.trim(), type, value: amount, minSubtotal: minimum, firstOrderOnly, minQuantity: quantity, maxDiscount: type === 'percent' ? optionalPositiveInteger(maxDiscount, 'Mức giảm tối đa') : null, startsAt: start, endsAt: end, usageLimit: optionalPositiveInteger(usageLimit, 'Tổng lượt sử dụng'), perUserLimit: optionalPositiveInteger(perUserLimit, 'Lượt dùng mỗi khách'), isActive, showAtCheckout };
    } catch (reason) { setError(errorText(reason)); return; }
    setBusy(true);
    try {
      await api(promotion ? `/admin/promotions/${promotion.id}` : '/admin/promotions', send(promotion ? 'PATCH' : 'POST', { ...fields, ...(promotion ? { expectedVersion: promotion.version } : {}) }));
      await onSaved();
    } catch (reason) {
      const changed = reason instanceof ApiError && reason.status === 409;
      setConflict(changed && !!promotion);
      setError(changed ? `${errorText(reason)} Nội dung bạn nhập vẫn được giữ. ${promotion ? 'Sao chép phần cần giữ, đóng cửa sổ rồi làm mới danh sách và mở lại mã trước khi lưu.' : 'Kiểm tra mã có bị trùng và đổi sang mã khác trước khi lưu lại.'}` : errorText(reason));
    } finally { setBusy(false); }
  }

  return <form className="admin-form promotion-form" onSubmit={event => void submit(event)}>
    <p className="promotion-note">Mỗi đơn dùng một mã. Mã được cộng dồn với SALE, tính trên tiền hàng sau SALE và không giảm phí giao hàng.</p>
    <fieldset disabled={busy} className="promotion-fields">
      <section className="admin-form-group"><h3>Chương trình</h3>
        <label>Mã giảm giá<input required minLength={3} maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={code} onChange={event => setCode(event.target.value.toUpperCase())}/><small>3–32 chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.</small></label>
        <label>Tên chương trình<input required maxLength={160} value={label} onChange={event => setLabel(event.target.value)}/></label>
        <div className="admin-form-grid"><label>Hình thức giảm<select value={type} onChange={event => setType(event.target.value as Promotion['type'])}><option value="percent">Theo phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
          <label>{type === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'}<input required type="number" min={1} max={type === 'percent' ? 100 : undefined} step={1} value={value} onChange={event => setValue(event.target.value)}/></label></div>
        <div className="admin-form-grid"><label>Tiền hàng tối thiểu (đ)<input required type="number" min={0} step={1} value={minSubtotal} onChange={event => setMinSubtotal(event.target.value)}/><small>Tính sau SALE, không gồm phí giao hàng. Nhập 0 nếu không yêu cầu.</small></label>
          {type === 'percent' && <label>Giảm tối đa (đ)<input type="number" min={1} step={1} value={maxDiscount} onChange={event => setMaxDiscount(event.target.value)}/><small>Để trống để không đặt mức trần.</small></label>}</div>
      </section>
      <section className="admin-form-group"><h3>Điều kiện đơn hàng</h3>
        <div className="promotion-condition"><label className="admin-check"><input type="checkbox" checked={firstOrderOnly} onChange={event => setFirstOrderOnly(event.target.checked)} aria-describedby="promotion-first-order-help"/>Chỉ dành cho đơn đầu tiên</label><p id="promotion-first-order-help" className="promotion-help">Khách chưa từng đặt đơn, hoặc toàn bộ đơn trước đó đã hủy. Đơn chờ xác nhận hoặc chưa thanh toán vẫn được tính.</p></div>
        <label>Số món tối thiểu<input required type="number" min={1} max={10000} step={1} value={minQuantity} onChange={event => setMinQuantity(event.target.value)}/><small>Tính tổng số lượng, kể cả áo thiết kế riêng: 3 áo giống nhau tính là 3 món. Nhập 1 nếu không yêu cầu.</small></label>
        <p className="promotion-help">Các điều kiện được áp dụng cùng tiền hàng tối thiểu và giới hạn sử dụng.</p>
      </section>
      <section className="admin-form-group"><h3>Thời gian áp dụng</h3><div className="admin-form-grid">
        <label>Bắt đầu (giờ Việt Nam)<input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)}/><small>Để trống để bắt đầu ngay.</small></label>
        <label>Kết thúc (giờ Việt Nam)<input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)}/><small>Để trống để không giới hạn thời gian.</small></label>
      </div></section>
      <section className="admin-form-group"><h3>Giới hạn sử dụng</h3>
        <label>Cách giới hạn lượt dùng<select value={quotaPreset} onChange={event => selectQuotaPreset(event.target.value as QuotaPreset)}><option value="custom">Tùy chỉnh</option><option value="global-once">Một lượt cho cả mã</option><option value="customer-once">Mỗi khách một lượt</option></select><small>{quotaPreset === 'global-once' ? 'Cả mã chỉ có 1 lượt sử dụng, dành cho bất kỳ khách nào.' : quotaPreset === 'customer-once' ? 'Mỗi khách dùng tối đa 1 lượt; không giới hạn tổng lượt của mã.' : 'Có thể kết hợp giới hạn tổng lượt và lượt dùng mỗi khách.'}</small></label>
        <div className="admin-form-grid">
        <label>Tổng lượt sử dụng<input type="number" min={1} step={1} value={usageLimit} onChange={event => { setUsageLimit(event.target.value); setQuotaPreset(inferQuotaPreset(event.target.value, perUserLimit)); }}/><small>Để trống để không giới hạn.</small></label>
        <label>Lượt dùng mỗi khách<input type="number" min={1} step={1} value={perUserLimit} onChange={event => { setPerUserLimit(event.target.value); setQuotaPreset(inferQuotaPreset(usageLimit, event.target.value)); }}/><small>Để trống để không giới hạn.</small></label>
      </div><p className="promotion-help">Đơn hủy được hoàn lại lượt sử dụng. Đơn đã đặt giữ nguyên mức giảm lúc đặt hàng.</p>
        {promotion && <p className="promotion-help">Đã sử dụng {promotion.usedCount ?? 0} lượt.</p>}
        <label className="admin-check"><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)}/>Cho phép sử dụng mã</label>
        <div className="promotion-condition"><label className="admin-check"><input type="checkbox" checked={showAtCheckout} onChange={event => setShowAtCheckout(event.target.checked)} aria-describedby="promotion-checkout-help"/>Hiện tại thanh toán</label><p id="promotion-checkout-help" className="promotion-help">Bật để khách thấy mã trong danh sách chọn khi thanh toán. Tắt để ẩn mã khỏi danh sách; khách biết mã vẫn nhập và sử dụng được nếu đủ điều kiện. Mã mới mặc định không hiển thị.</p></div>
      </section>
    </fieldset>
    <ErrorMessage message={error}/>
    <div className="admin-form-actions"><button type="button" className="admin-button admin-button-secondary" disabled={busy} onClick={onCancel}>Hủy</button><button className="admin-button" disabled={busy || conflict}>{busy ? 'Đang lưu…' : promotion ? 'Lưu thay đổi' : 'Tạo mã giảm giá'}</button></div>
  </form>;
}
