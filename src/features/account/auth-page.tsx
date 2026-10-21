import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, send } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import { Dialog, ErrorText } from '../../components/ui';
import { moveAuthFocus, PasswordField } from './auth-fields';

export default function AuthPage({ registerMode = false }: { registerMode?: boolean }) {
  const { data, login, register, notify } = useStore();
  const local = data?.mode === 'local';
  const mailReady = !!data?.email?.configured;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [resetError, setResetError] = useState('');
  const requestedTarget = params.get('tiep');
  const target = requestedTarget?.startsWith('/') && !requestedTarget.startsWith('//') && !requestedTarget.includes('\\') && ![...requestedTarget].some(char => char.charCodeAt(0) < 32) && !/^\/(dang-nhap|dang-ky)(?:[/?#]|$)/.test(requestedTarget) ? requestedTarget : '/tai-khoan';
  const switchingAccount = params.get('doi-tai-khoan') === '1' || (local && params.get('demo') === '1');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (registerMode && password !== confirmation) {
      setMismatch(true); setError('Hai mật khẩu chưa giống nhau. Bạn kiểm tra lại nhé.');
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus(); return;
    }
    setBusy(true);
    try {
      const cartReady = registerMode ? await register(name, email, password, confirmation) : await login(email, password);
      notify(registerMode ? mailReady ? 'Đã tạo tài khoản. Bạn kiểm tra email để xác minh.' : 'Đã tạo tài khoản.' : 'Đã đăng nhập.');
      navigate(cartReady ? target : '/gio-hang');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa đăng nhập được. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }
  async function demo(role: 'customer' | 'admin') {
    setBusy(true); setError('');
    try { const cartReady = await login(role === 'admin' ? 'admin@nepform.local' : 'khach@nepform.local', 'Nepform@2026!'); navigate(role === 'admin' ? '/quan-tri' : cartReady ? target : '/gio-hang'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa mở được tài khoản thử.'); }
    finally { setBusy(false); }
  }
  async function requestReset(event: FormEvent) {
    event.preventDefault(); setBusy(true); setResetError('');
    try { const result = await api<{ resetUrl?: string }>('/auth/request-reset', send('POST', { email: resetEmail })); setResetLink(result.resetUrl || 'none'); }
    catch (reason) { setResetError(reason instanceof Error ? reason.message : 'Chưa gửi được yêu cầu. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }
  if (data?.user && !registerMode && !switchingAccount && !busy) return <Navigate to={target} replace />;
  return <section className="auth-layout container">
    <div className="auth-visual"><img src="/images/story-editorial.webp" alt="Trang phục thường ngày của Nếp" /><div><p className="eyebrow">NẾP FORM</p><h2>Áo bạn chọn.<br />Hình bạn thích.</h2></div></div>
    <div className="auth-form-wrap"><p className="eyebrow">NẾP FORM / TÀI KHOẢN</p><h1>{registerMode ? 'Tạo tài khoản.' : 'Đăng nhập.'}</h1><p className="muted">{registerMode ? 'Lưu thiết kế, đặt áo và theo dõi đơn hàng của bạn.' : 'Đăng nhập để xem thiết kế, giỏ hàng và đơn đã đặt.'}</p>
      {data?.user && switchingAccount && <p className="inline-notice">Bạn đang đăng nhập. Điền tài khoản khác để chuyển, hoặc <Link to={target}>tiếp tục với tài khoản hiện tại</Link>.</p>}
      <form onSubmit={submit} onKeyDown={moveAuthFocus} className="stack-form" aria-busy={busy}>
        {registerMode && <label className="form-field">Tên của bạn<input name="name" className="input" data-auth-field value={name} onChange={event => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={100} placeholder="Nếp gọi bạn là gì?" /></label>}
        <label className="form-field">Email<input name="email" className="input" data-auth-field value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="ban@example.com" /></label>
        <PasswordField value={password} onChange={value => { setPassword(value); setMismatch(false); }} newPassword={registerMode} />
        {registerMode && <PasswordField label="Nhập lại mật khẩu" name="confirmPassword" value={confirmation} onChange={value => { setConfirmation(value); setMismatch(false); }} newPassword invalid={mismatch} />}
        {!registerMode && <button type="button" className="text-link forgot-link" onClick={() => { setResetOpen(true); setResetLink(''); setResetError(''); }}>Quên mật khẩu?</button>}
        <ErrorText>{error}</ErrorText><button className="button full-width" disabled={busy}>{busy ? 'Đang xử lý…' : registerMode ? 'Tạo tài khoản' : 'Đăng nhập'}<ArrowRight size={17} /></button>
      </form>
      <p className="auth-keyboard-hint">Dùng Tab hoặc phím ↑ ↓ để chuyển ô.</p>
      <p className="auth-switch">{registerMode ? 'Có tài khoản rồi? ' : 'Lần đầu ghé Nếp? '}<Link to={`${registerMode ? '/dang-nhap' : '/dang-ky'}${params.get('tiep') ? `?tiep=${encodeURIComponent(target)}` : ''}`}>{registerMode ? 'Đăng nhập' : 'Tạo tài khoản'}</Link></p>
      {local && <div className="demo-accounts"><span className="eyebrow">DÙNG THỬ NHANH / LOCAL</span><p>Chọn tài khoản để xem thử cửa hàng.</p><div><button className="button-secondary" onClick={() => demo('customer')} disabled={busy}>Khách mua hàng</button><button className="button-secondary" onClick={() => demo('admin')} disabled={busy}>Quản trị cửa hàng</button></div></div>}
    </div>
    <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Đặt lại mật khẩu">
      <p className="muted">{local ? 'Bản thử tạo liên kết đổi mật khẩu ngay bên dưới.' : mailReady ? 'Nhập email đã đăng ký. Nếu có tài khoản, Nếp sẽ gửi đường dẫn đổi mật khẩu.' : 'Gửi mail đang được thiết lập. Bạn liên hệ Nếp để được hỗ trợ nhé.'}</p>
      {local || mailReady ? <form className="stack-form" onSubmit={requestReset}><label className="form-field">Email tài khoản<input className="input" type="email" autoComplete="email" required value={resetEmail} onChange={event => setResetEmail(event.target.value)} /></label><ErrorText>{resetError}</ErrorText><button className="button" disabled={busy}>{busy ? 'Đang gửi…' : local ? 'Tạo liên kết đặt lại' : 'Gửi đường dẫn đổi mật khẩu'}<ArrowRight size={17} /></button></form> : <a className="button" href={`mailto:${data?.settings.contactEmail}`}>Liên hệ cửa hàng</a>}
      {resetLink && <div className="inline-notice" role="status">{resetLink === 'none' ? local ? 'Nếu tài khoản tồn tại, liên kết sẽ hiện tại đây.' : 'Nếu email này đã đăng ký, bạn sẽ nhận được hướng dẫn. Nhớ kiểm tra cả mục thư rác nhé.' : <Link onClick={() => setResetOpen(false)} to={resetLink}>Mở liên kết đổi mật khẩu (bản thử) ↗</Link>}</div>}
    </Dialog>
  </section>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { notify, resetPassword } = useStore();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('Hai mật khẩu chưa giống nhau. Bạn nhập lại nhé.'); event.currentTarget.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus(); return; }
    setBusy(true);
    try { await resetPassword(params.get('token') || '', password, confirmation); notify('Đổi mật khẩu xong rồi. Bạn đăng nhập lại nhé.'); navigate('/dang-nhap'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Đường dẫn không còn hiệu lực. Bạn yêu cầu lại nhé.'); }
    finally { setBusy(false); }
  }
  return <div className="container narrow-page"><LockKeyhole size={34} strokeWidth={1.25} /><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đặt lại mật khẩu.</h1><form className="stack-form" onSubmit={submit} onKeyDown={moveAuthFocus}>
    <PasswordField label="Mật khẩu mới" value={password} onChange={setPassword} newPassword />
    <PasswordField label="Nhập lại mật khẩu mới" name="confirmPassword" value={confirmation} onChange={setConfirmation} newPassword />
    <ErrorText>{error}</ErrorText><button className="button" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</button>
  </form></div>;
}
