import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorText } from '../../components/ui';
import { useStore } from '../../lib/store-context';
import { moveAuthFocus, PasswordField } from '../account/auth-fields';

export function SupportPopupSignin({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const emailId = useId();
  const emailField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => emailField.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [active]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await login(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa đăng nhập được. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }

  return <div className="support-popup-signin">
    <p>Đăng nhập để nhắn tin và lưu cuộc trò chuyện. Bạn có thể tiếp tục ngay tại đây.</p>
    <form className="stack-form" data-testid="support-popup-login" aria-busy={busy} onKeyDown={moveAuthFocus} onSubmit={event => void submit(event)}>
      <fieldset disabled={busy}>
        <label className="form-field" htmlFor={emailId}>Email<input ref={emailField} id={emailId} name="email" className="input" data-auth-field type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/></label>
        <PasswordField value={password} onChange={setPassword}/>
      </fieldset>
      <ErrorText>{error}</ErrorText>
      <button className="button full-width" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập và trò chuyện'}</button>
    </form>
    <Link className="text-link" onClick={onNavigate} to="/dang-ky">Tạo tài khoản</Link>
  </div>;
}
