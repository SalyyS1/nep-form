import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { api, dateLabel } from '../../lib/api';
import { PageTitle, SearchField } from './admin-shared';
import { SupportConversation } from '../support/support-conversation';
import type { SupportThread } from '../support/support-types';

export function AdminSupport() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api<{ threads: SupportThread[]; total: number }>(`/admin/support?q=${encodeURIComponent(query)}&status=${status}&page=${page}`, { signal });
      if (signal?.aborted) return;
      setThreads(result.threads); setTotal(result.total); setError('');
    } catch (reason) { if (!signal?.aborted) setError((reason as Error).message); }
  }, [query, status, page]);
  useEffect(() => {
    const controller = new AbortController(); void load(controller.signal);
    const timer = window.setInterval(() => { if (!document.hidden) void load(controller.signal); }, 4000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load]);
  return <><PageTitle title="Hỗ trợ khách hàng" description="Xem và trả lời tin nhắn về thiết kế, size áo và đơn hàng."/>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <section className={`admin-inbox admin-panel ${selected ? 'has-selection' : ''}`}>
      <aside className="admin-inbox-list"><div className="admin-inbox-filters"><SearchField value={query} onChange={v => { setQuery(v); setPage(1); }} placeholder="Tìm khách hoặc lời nhắn…"/><select aria-label="Lọc hội thoại" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">Tất cả hội thoại</option><option value="unread">Chưa đọc</option><option value="open">Đang hỗ trợ</option><option value="resolved">Đã xử lý</option></select></div>
        <div className="admin-inbox-threads">{threads.length ? threads.map(thread => <button key={thread.id} className={`admin-thread ${selected === thread.id ? 'selected' : ''}`} onClick={() => setSelected(thread.id)}><span className="admin-thread-avatar">{thread.customer.name.slice(0, 1)}</span><span><strong>{thread.customer.name}</strong><small>{thread.lastMessage}</small><em>{thread.status === 'resolved' ? 'Đã xử lý' : 'Đang hỗ trợ'} · {dateLabel(thread.updatedAt)}</em></span>{thread.adminUnread > 0 && <b>{thread.adminUnread}</b>}</button>) : <p className="support-empty">Chưa có hội thoại phù hợp.<br/>Tin nhắn mới của khách sẽ xuất hiện ở đây.</p>}</div>
        <div className="admin-inbox-pages"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>{total} hội thoại · Trang {page}</span><button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </aside>
      <div className="admin-inbox-detail">{selected ? <><button className="admin-inbox-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/>Danh sách hội thoại</button><SupportConversation key={selected} root={`/admin/support/${selected}`} admin onChanged={() => void load()}/></> : <div className="admin-inbox-welcome"><MessageCircle size={42} strokeWidth={1}/><span>HỘP THƯ HỖ TRỢ</span><h2>Chọn hội thoại<br/>để trả lời.</h2><p>Chọn hội thoại để tư vấn thiết kế,<br/>size áo và hỗ trợ đơn hàng.</p><small>Tự cập nhật mỗi 4 giây khi trang đang mở.</small></div>}</div>
    </section></>;
}
