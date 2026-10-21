import { useState, type FormEvent } from 'react';
import { api, send } from '../../lib/api';
import type { Address } from '../../lib/types';
import { useStore } from '../../lib/store-context';
import { ErrorText } from '../../components/ui';

export type AddressInput = Omit<Address, 'id'>;
export const emptyAddress: AddressInput = { recipient: '', phone: '', province: '', ward: '', line1: '', isDefault: false };
export function AddressFields({ value, onChange }: { value: AddressInput; onChange: (value: AddressInput) => void }) {
  const field = (key: keyof AddressInput, next: string) => onChange({ ...value, [key]: next });
  return <div className="address-fields"><label className="form-field">Họ tên người nhận<input className="input" required value={value.recipient} onChange={(e) => field('recipient', e.target.value)} autoComplete="name" placeholder="Họ và tên" /></label><label className="form-field">Số điện thoại<input className="input" required type="tel" value={value.phone} onChange={(e) => field('phone', e.target.value)} autoComplete="tel" pattern="[0-9+() .-]{9,16}" placeholder="Số điện thoại nhận hàng" /></label><label className="form-field">Tỉnh / Thành phố<input className="input" required value={value.province} onChange={(e) => field('province', e.target.value)} autoComplete="address-level1" placeholder="Ví dụ: TP. Hồ Chí Minh" /></label><label className="form-field">Phường / Xã<input className="input" required value={value.ward} onChange={(e) => field('ward', e.target.value)} autoComplete="address-level2" placeholder="Phường / Xã" /></label><label className="form-field span-two">Địa chỉ chi tiết<input className="input" required value={value.line1} onChange={(e) => field('line1', e.target.value)} autoComplete="street-address" placeholder="Số nhà, tên đường, tòa nhà..." /></label></div>;
}
export function AddressForm({ address, onSaved }: { address?: Address; onSaved: () => void }) {
  const [value, setValue] = useState<AddressInput>(address || emptyAddress);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { refresh, notify } = useStore();
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api(address ? `/addresses/${address.id}` : '/addresses', send(address ? 'PATCH' : 'POST', value)); await refresh(); notify('Đã lưu địa chỉ của bạn.'); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được địa chỉ.'); }
    finally { setBusy(false); }
  }
  return <form className="stack-form" onSubmit={submit}><AddressFields value={value} onChange={setValue} /><label className="checkbox-line"><input type="checkbox" checked={value.isDefault} onChange={(e) => setValue({ ...value, isDefault: e.target.checked })} />Đặt làm địa chỉ mặc định</label><ErrorText>{error}</ErrorText><button className="button" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu địa chỉ'}</button></form>;
}
