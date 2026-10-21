import { useState } from 'react';
import { Check, MailCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, send } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import { ErrorText } from '../../components/ui';

export default function VerifyEmailPage() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { refresh } = useStore();
  async function verify() {
    setBusy(true); setError('');
    try { await api('/auth/verify-email', send('POST', { token })); setDone(true); setParams({}, { replace: true }); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa xác minh được. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }
  return <section className="container narrow-page verify-email-page">{done ? <Check size={38} /> : <MailCheck size={38} />}<p className="eyebrow">NẾP FORM / EMAIL</p><h1>{done ? 'Email đã được xác minh.' : 'Xác minh email của bạn.'}</h1>
    <p>{done ? 'Bạn có thể quay lại tài khoản để tiếp tục.' : token ? 'Bấm nút bên dưới để xác nhận địa chỉ email này là của bạn. Đường dẫn chỉ dùng được một lần.' : 'Đường dẫn thiếu mã xác minh. Bạn vào tài khoản để yêu cầu thư mới nhé.'}</p>
    <ErrorText>{error}</ErrorText>{!done && token && <button className="button" disabled={busy} onClick={() => void verify()}>{busy ? 'Đang xác minh…' : 'Xác minh email'}</button>}
    <Link className="button-secondary" to="/tai-khoan">Về tài khoản</Link>
  </section>;
}
