import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface EmailStatus { configured: boolean; pending: number; failed: number; sent: number }
export function AdminEmailStatus() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try { setStatus(await api<EmailStatus>('/admin/email-status')); setError(''); }
    catch { setError('Chưa xem được tình trạng gửi thư. Bạn thử tải lại nhé.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="admin-panel admin-email-status"><div className="admin-toolbar"><div><h2>Email của cửa hàng</h2><p>{status ? status.configured ? 'Đã kết nối dịch vụ gửi thư.' : 'Chưa bật gửi email. Cần cấu hình tên miền và khóa dịch vụ trên máy chủ.' : 'Đang kiểm tra kết nối…'}</p></div><button className="admin-button admin-button-secondary" disabled={busy} onClick={() => void load()}>{busy ? 'Đang tải…' : 'Làm mới'}</button></div>
    {status?.configured && <dl><div><dt>Đang chờ gửi</dt><dd>{status.pending}</dd></div><div><dt>Dịch vụ đã nhận</dt><dd>{status.sent}</dd></div><div><dt>Cần kiểm tra</dt><dd>{status.failed}</dd></div></dl>}
    {status?.configured && <p>Hệ thống tự thử lại khi gửi lỗi tạm thời. “Dịch vụ đã nhận” chưa có nghĩa là thư đã vào hộp thư đến. Thư lỗi cần kiểm tra trong Resend và nhật ký máy chủ.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </section>;
}
