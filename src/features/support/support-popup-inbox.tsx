import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { api, dateLabel } from '../../lib/api';
import { SupportConversation } from './support-conversation';
import type { SupportThread } from './support-types';

export function SupportPopupInbox({ active }: { active: boolean }) {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useRef<() => void>(() => undefined);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const select = useCallback((id: string) => {
    setVisited(old => old.includes(id) ? old : [...old, id]);
    setSelected(id);
  }, []);

  useEffect(() => {
    if (!active) return;
    let mounted = true; let fetching = false;
    const controller = new AbortController();
    setLoading(true);
    async function load() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const result = await api<{ threads: SupportThread[]; total: number }>(`/admin/support?q=${encodeURIComponent(query)}&status=${status}&page=${page}`, { signal: controller.signal });
        if (!mounted) return;
        setThreads(result.threads); setTotal(result.total); setError('');
      } catch (reason) { if (mounted) setError(reason instanceof Error ? reason.message : 'Chưa tải được hộp thư.'); }
      finally { fetching = false; if (mounted) setLoading(false); }
    }
    reload.current = () => void load();
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    document.addEventListener('visibilitychange', load);
    return () => {
      mounted = false; controller.abort(); clearInterval(timer);
      reload.current = () => undefined;
      document.removeEventListener('visibilitychange', load);
    };
  }, [active, query, status, page]);

  function back() {
    setSelected(null);
    requestAnimationFrame(() => listHeading.current?.focus({ preventScroll: true }));
  }

  return <div className="support-popup-inbox" data-testid="support-popup-inbox">
    <div className="support-popup-list" hidden={!!selected}>
      <h3 ref={listHeading} tabIndex={-1}>Tin nhắn của khách</h3>
      <div className="support-popup-filters">
        <label className="support-sr-only" htmlFor="support-popup-search">Tìm hội thoại</label>
        <input id="support-popup-search" type="search" className="input" placeholder="Tìm khách hoặc lời nhắn…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/>
        <select aria-label="Lọc hội thoại" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">Tất cả hội thoại</option><option value="unread">Chưa đọc</option><option value="open">Đang hỗ trợ</option><option value="resolved">Đã xử lý</option></select>
      </div>
      {error && <div className="support-error" role="alert">{error}<button className="support-retry" onClick={() => reload.current()}><RefreshCw size={13}/>Thử lại</button></div>}
      <div className="support-popup-threads" aria-busy={loading}>
        {loading && <p className="support-empty" role="status">Đang tải hộp thư…</p>}
        {!loading && !error && !threads.length && <p className="support-empty">{query || status !== 'all' ? 'Chưa có hội thoại phù hợp.' : 'Chưa có tin nhắn của khách.'}</p>}
        {!loading && threads.map(thread => <button key={thread.id} className="admin-thread" data-testid="support-popup-thread" onClick={() => select(thread.id)}>
          <span className="admin-thread-avatar">{thread.customer.name.slice(0, 1)}</span>
          <span><strong>{thread.customer.name}</strong><small>{thread.customer.email}</small><small>{thread.lastMessage}</small><em>{thread.status === 'resolved' ? 'Đã xử lý' : 'Đang hỗ trợ'} · {dateLabel(thread.updatedAt)}</em></span>
          {thread.adminUnread > 0 && <b aria-label={`${thread.adminUnread} tin chưa đọc`}>{thread.adminUnread > 99 ? '99+' : thread.adminUnread}</b>}
        </button>)}
      </div>
      <div className="admin-inbox-pages"><button disabled={page === 1 || loading} onClick={() => setPage(old => old - 1)}>Trước</button><span>{total} hội thoại · Trang {page}</span><button disabled={page * 20 >= total || loading} onClick={() => setPage(old => old + 1)}>Sau</button></div>
    </div>
    {visited.map(id => <div key={id} className="support-popup-detail" hidden={selected !== id}>
      <button className="support-popup-back" onClick={back}><ArrowLeft size={16}/>Danh sách hội thoại</button>
      <SupportConversation root={`/admin/support/${encodeURIComponent(id)}`} admin active={active && selected === id} autoFocus onChanged={() => reload.current()}/>
    </div>)}
  </div>;
}
