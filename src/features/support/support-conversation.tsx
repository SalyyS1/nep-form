import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { api, send } from '../../lib/api';
import type { SupportMessage, SupportPage, SupportThread } from './support-types';
import './support.css';

const stamp = (date: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
function mergeMessages(old: SupportMessage[], incoming: SupportMessage[]) {
  return [...new Map([...old, ...incoming].map(m => [m.id, m])).values()].sort((a, b) => a.sequence - b.sequence);
}
export function SupportConversation({ root, admin = false, active = true, autoFocus = false, onChanged }: { root: string; admin?: boolean; active?: boolean; autoFocus?: boolean; onChanged?: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [olderBusy, setOlderBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [text, setText] = useState('');
  const composerId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const reload = useRef<() => void>(() => undefined);
  const focusActive = useRef(active); focusActive.current = active;
  const nearBottom = useRef(true);
  const allLoaded = useRef(false);
  const cursor = useRef(0);
  const retry = useRef<{ text: string; requestId: string } | null>(null);
  const changed = useRef(onChanged); changed.current = onChanged;
  const accept = useCallback((page: SupportPage) => {
    setMessages(old => mergeMessages(old, page.messages));
    setThread(old => old && page.thread && old.version > page.thread.version ? old : page.thread);
  }, []);
  useEffect(() => {
    if (!active) return;
    let mounted = true; let fetching = false;
    const controller = new AbortController();
    async function load() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const after = cursor.current;
        const page = await api<SupportPage>(`${root}/messages${after ? `?after=${after}` : ''}`, { signal: controller.signal });
        if (!mounted) return;
        accept(page); if (!after) setHasMore(page.hasMore && !allLoaded.current); setLoadError('');
        cursor.current = Math.max(after, page.messages.at(-1)?.sequence ?? 0);
        const unread = admin ? page.thread?.adminUnread : page.thread?.customerUnread;
        const sequence = cursor.current;
        if (unread && sequence && nearBottom.current) {
          await api(`${root}/read`, { ...send('PATCH', { sequence }), signal: controller.signal });
          if (mounted) changed.current?.();
        }
      } catch (reason) { if (mounted) setLoadError(reason instanceof Error ? reason.message : 'Chưa tải được tin nhắn.'); }
      finally { if (mounted) setLoading(false); fetching = false; }
    }
    reload.current = () => void load();
    void load(); const timer = window.setInterval(() => void load(), 4000);
    document.addEventListener('visibilitychange', load);
    return () => { mounted = false; controller.abort(); clearInterval(timer); reload.current = () => undefined; document.removeEventListener('visibilitychange', load); };
  }, [root, admin, active, accept]);
  useEffect(() => {
    if (!active || !autoFocus) return;
    const frame = requestAnimationFrame(() => composer.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [active, autoFocus]);
  useEffect(() => {
    if (nearBottom.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages]);
  async function older() {
    setOlderBusy(true);
    const el = viewport.current; const height = el?.scrollHeight ?? 0;
    try {
      const page = await api<SupportPage>(`${root}/messages?before=${messages[0]?.sequence}`);
      nearBottom.current = false; accept(page); setHasMore(page.hasMore); if (!page.hasMore) allLoaded.current = true;
      requestAnimationFrame(() => { if (el) el.scrollTop += el.scrollHeight - height; });
    } catch (reason) { setActionError(`Chưa tải được tin cũ. ${(reason as Error).message}`); }
    finally { setOlderBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!text.trim() || busy) return;
    const content = text.trim();
    if (retry.current?.text !== content) retry.current = { text: content, requestId: crypto.randomUUID() };
    setBusy(true); setActionError('');
    try {
      const result = await api<{ message: SupportMessage; thread: SupportThread }>(`${root}/messages`, send('POST', retry.current));
      nearBottom.current = true; accept({ ...result, messages: [result.message], hasMore: false });
      setText(''); retry.current = null; changed.current?.();
    } catch (reason) { setActionError(`Tin chưa gửi được. ${(reason as Error).message} Nội dung vẫn ở đây, bạn thử gửi lại nhé.`); }
    finally {
      setBusy(false);
      if (autoFocus) requestAnimationFrame(() => { if (focusActive.current) composer.current?.focus({ preventScroll: true }); });
    }
  }
  async function status() {
    if (!thread || busy) return;
    setBusy(true);
    try {
      const result = await api<{ thread: SupportThread }>(root, send('PATCH', { status: thread.status === 'open' ? 'resolved' : 'open', expectedVersion: thread.version }));
      setThread(result.thread); changed.current?.(); setActionError('');
    } catch (reason) { setActionError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="support-conversation">
    <div className="support-thread-heading"><div><strong>{admin ? thread?.customer.name || 'Hội thoại' : 'Nhắn cho Nếp'}</strong><small>{admin ? thread?.customer.email : 'Hỗ trợ chọn size, thiết kế và đơn hàng'}</small></div>{thread && <span className={`support-state ${thread.status}`}>{thread.status === 'resolved' ? 'Đã xử lý' : 'Đang hỗ trợ'}</span>}</div>
    {admin && thread && <button className="support-resolve" disabled={busy} onClick={() => void status()}>{thread.status === 'open' ? 'Đánh dấu đã xử lý' : 'Mở lại hội thoại'}</button>}
    <div className="support-messages" ref={viewport} onScroll={() => { const el = viewport.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; }} role="log" aria-label="Lịch sử trò chuyện" aria-live="polite" aria-relevant="additions">
      {hasMore && <button className="support-older" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? 'Đang tải…' : 'Xem tin nhắn trước'}</button>}
      {loading && <p className="support-empty" role="status">Đang tải hội thoại…</p>}
      {!loading && !messages.length && !loadError && <div className="support-empty"><p>Bạn cần tư vấn mẫu in, size áo hay đơn hàng?<br/>Gửi lời nhắn cho Nếp tại đây nhé.</p></div>}
      {messages.map(message => <article data-message key={message.id} className={`support-message ${message.senderRole === (admin ? 'admin' : 'customer') ? 'own' : ''}`}><small>{message.senderRole === 'admin' ? 'Nếp · Hỗ trợ' : admin ? thread?.customer.name : 'Bạn'}</small><p>{message.text}</p><time dateTime={message.createdAt}>{stamp(message.createdAt)}</time></article>)}
    </div>
    {loadError && <div className="support-error" role="alert">{loadError}<button className="support-retry" onClick={() => reload.current()}><RefreshCw size={12}/>Thử lại</button></div>}
    {actionError && <p className="support-error" role="alert">{actionError}</p>}
    {thread?.status === 'resolved' && <p className="support-caption">Bạn có thể nhắn tiếp để mở lại cuộc trò chuyện.</p>}
    <form className="support-composer" onSubmit={event => void submit(event)}><label className="support-sr-only" htmlFor={composerId}>Nội dung tin nhắn</label><textarea ref={composer} id={composerId} rows={2} maxLength={2000} value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder={admin ? "Trả lời khách hàng…" : "Viết lời nhắn cho Nếp…"}/><div><small>{text.length}/2000 · {admin ? 'Khách hàng sẽ đọc được tin nhắn này' : 'Lịch sử được lưu trong tài khoản'}</small><button disabled={busy || !text.trim()} aria-label="Gửi tin nhắn"><Send size={17}/>{busy ? 'Đang gửi…' : 'Gửi'}</button></div></form>
  </div>;
}
