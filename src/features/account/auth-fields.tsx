import { useId, useState, type KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Only marked single-line fields participate; Tab/Enter and IME stay native.
export function moveAuthFocus(event: KeyboardEvent<HTMLFormElement>) {
  if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('[data-auth-field]')) return;
  const fields = [...event.currentTarget.querySelectorAll<HTMLInputElement>('input[data-auth-field]:not(:disabled)')];
  const index = fields.indexOf(input);
  const next = fields[index + (event.key === 'ArrowDown' ? 1 : -1)];
  if (index >= 0 && next) { event.preventDefault(); next.focus(); }
}

export function PasswordField({ label = 'Mật khẩu', name = 'password', value, onChange, newPassword = false, invalid = false }: {
  label?: string; name?: string; value: string; onChange: (value: string) => void; newPassword?: boolean; invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  return <label className="form-field" htmlFor={inputId}>{label}<span className="password-input">
    <input id={inputId} name={name} className="input" data-auth-field value={value} onChange={event => onChange(event.target.value)} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} aria-invalid={invalid || undefined} placeholder={newPassword ? 'Từ 8 ký tự trở lên' : 'Nhập mật khẩu'} />
    <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={inputId}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </span></label>;
}
