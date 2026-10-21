import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { CustomPricing } from '../../../shared/custom-types';
import { api, ApiError, send } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import { ErrorMessage, PageTitle, errorText } from './admin-shared';

const contentFields = [{ key: 'text', label: 'Chữ' }, { key: 'shape', label: 'Hình có sẵn' }, { key: 'image', label: 'Ảnh tải lên' }, { key: 'extraLayer', label: 'Mỗi lớp thêm' }] as const;
const areaFields = [{ key: 'small', label: 'Vùng in nhỏ' }, { key: 'medium', label: 'Vùng in vừa' }, { key: 'large', label: 'Vùng in lớn' }] as const;

export function CustomPricingPage() {
  const { data, refresh } = useStore();
  const local = data?.mode === 'local';
  const [saved, setSaved] = useState<CustomPricing | null>(null);
  const [form, setForm] = useState<CustomPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conflict, setConflict] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const load = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try { const result = await api<{ pricing: CustomPricing }>('/admin/custom-pricing'); setSaved(result.pricing); setForm(result.pricing); setConflict(false); }
    catch (reason) { setError(errorText(reason)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!form || !saved) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await api<{ pricing: CustomPricing }>('/admin/custom-pricing', send('PATCH', { pricing: form, expectedVersion: saved.version }));
      setSaved(result.pricing); setForm(result.pricing); setConflict(false); setSuccess('Đã lưu bảng giá. Giỏ hàng dùng giá mới; đơn đã đặt giữ nguyên giá.');
      await refresh();
    } catch (reason) { setConflict(reason instanceof ApiError && reason.status === 409); setError(errorText(reason)); }
    finally { setBusy(false); }
  }
  return <><PageTitle title="Giá áo custom" description="Chỉnh phụ phí theo nội dung, khổ in và số lớp." /><div className="admin-panel custom-pricing-panel"><p className="custom-pricing-demo">{local && 'Giá thử nghiệm trên máy. '}Phí cho mỗi mặt có in = phí loại nội dung cao nhất + phí vùng in + phí cho các lớp từ lớp thứ hai. Mặt trống không tính phí.</p><ErrorMessage message={error} />{loading ? <p role="status">Đang tải bảng giá…</p> : !form ? <button className="admin-button" onClick={() => void load()}>Thử tải lại</button> : <form className="admin-form" onSubmit={event => void submit(event)}><section className="admin-form-group"><h3>Loại nội dung (đ / mặt)</h3><div className="custom-pricing-grid">{contentFields.map(({ key, label }) => <label key={key}>{label}<input required type="number" min={0} step={1} disabled={busy} value={form[key]} onChange={event => { setForm({ ...form, [key]: Number(event.target.value) }); setSuccess(''); }} /></label>)}</div></section><section className="admin-form-group"><h3>Diện tích in (đ / mặt)</h3><div className="custom-pricing-grid">{areaFields.map(({ key, label }) => <label key={key}>{label}<input required type="number" min={0} step={1} disabled={busy} value={form.areas[key]} onChange={event => { setForm({ ...form, areas: { ...form.areas, [key]: Number(event.target.value) } }); setSuccess(''); }} /></label>)}</div></section>{conflict && <div className="custom-pricing-conflict" role="alert"><p>Bảng giá đã thay đổi ở phiên khác. Tải bản mới nhất rồi nhập lại thay đổi của bạn.</p><button type="button" className="admin-button admin-button-secondary" onClick={() => void load()}>Tải bảng giá mới nhất</button></div>}{success && <p className="admin-success" role="status">{success}</p>}<div className="admin-settings-save"><span>{dirty ? 'Bạn có thay đổi chưa lưu.' : `Phiên bản bảng giá ${saved?.version}`}</span><div><button type="button" className="admin-button admin-button-secondary" disabled={!dirty || busy} onClick={() => { setForm(saved); setSuccess(''); }}>Hoàn tác</button><button className="admin-button" disabled={!dirty || busy || conflict}>{busy ? 'Đang lưu…' : 'Lưu bảng giá'}</button></div></div></form>}</div></>;
}
