import { useEffect, useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, send } from '../../lib/api';
import { useStore } from '../../lib/store-context';
import { ErrorText } from '../../components/ui';

export function EmailVerificationNotice() {
  const { data, refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [localLink, setLocalLink] = useState(() => data?.mode === 'local' && data.user ? sessionStorage.getItem(`nep-local-verification:${data.user.id}`) || '' : '');
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  if (!data?.user || data.user.role === 'admin') return null;
  if (data.user.emailVerified) return <p className="email-verified"><Check size={16} />Email đã xác minh.</p>;
  const available = data.email?.configured || data.mode === 'local';
  async function resend() {
    setBusy(true); setError('');
    try {
      const result = await api<{ queued?: boolean; alreadyVerified?: boolean; verificationUrl?: string; localOnly?: boolean }>('/auth/resend-verification', send('POST'));
      if (result.alreadyVerified) await refresh();
      else if (result.queued) { setSent(true); setCooldown(60); }
      else if (result.localOnly && result.verificationUrl && data?.mode === 'local') setLocalLink(result.verificationUrl);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa gửi được. Bạn thử lại nhé.'); }
    finally { setBusy(false); }
  }
  return <section className="email-verification-notice" aria-label="Xác minh email"><Mail size={22} /><div>
    <strong>Xác minh địa chỉ email.</strong>
    <p>{available ? <>Email của bạn là <b>{data.user.email}</b>. {data.mode === 'local' ? 'Bản thử không gửi email. Dùng liên kết bên dưới để thử xác minh.' : 'Mở thư từ Nếp rồi bấm xác minh.'}{data.email?.verificationRequired ? ' Bạn cần xác minh trước khi đặt hàng.' : ''}</> : 'Chức năng gửi email đang được thiết lập. Bạn vẫn có thể mua hàng và theo dõi đơn trong tài khoản.'}</p>
    {available && <div className="email-verification-actions"><button type="button" className="button-secondary" disabled={busy || cooldown > 0} onClick={() => void resend()}>{busy ? 'Đang gửi yêu cầu…' : cooldown ? `Gửi lại sau ${cooldown}s` : data.mode === 'local' ? 'Tạo liên kết xác minh' : 'Gửi lại thư xác minh'}</button><button type="button" className="text-link" disabled={busy} onClick={() => void refresh()}>Tôi đã xác minh, kiểm tra lại</button></div>}
    {sent && <p role="status">Đã nhận yêu cầu gửi lại. Bạn kiểm tra hộp thư và mục thư rác nhé.</p>}
    {localLink && data.mode === 'local' && <Link className="text-link" to={localLink}>Mở liên kết xác minh (chỉ bản thử)</Link>}
    <ErrorText>{error}</ErrorText>
  </div></section>;
}
