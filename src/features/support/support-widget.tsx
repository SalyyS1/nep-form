import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, ArrowUpRight, History } from 'lucide-react';
import { Dialog } from '../../components/ui';
import { useStore } from '../../lib/store-context';
import { api } from '../../lib/api';
import { SupportConversation } from './support-conversation';
import { SupportPopupInbox } from './support-popup-inbox';
import { SupportPopupSignin } from './support-popup-signin';
import type { SupportThread } from './support-types';

const historyPath = '/tai-khoan/ho-tro';

export function SupportWidget() {
  const { data } = useStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const launcher = useRef<HTMLButtonElement>(null);
  const user = data?.user;
  const userId = user?.id;
  const role = user?.role;
  const historyOpen = location.pathname.replace(/\/$/, '') === historyPath;
  const visible = open && !historyOpen;

  useEffect(() => { setUnread(0); }, [userId, role]);
  useEffect(() => {
    if (!userId || role !== 'customer' || visible || historyOpen) return;
    let active = true;
    let fetching = false;
    const controller = new AbortController();
    async function load() {
      if (document.hidden || fetching) return;
      fetching = true;
      try {
        const result = await api<{ thread: SupportThread | null }>('/support', { signal: controller.signal });
        if (active) setUnread(result.thread?.customerUnread ?? 0);
      } catch { /* Opening the conversation shows connection errors. */ }
      finally { fetching = false; }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false; controller.abort(); clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [userId, role, visible, historyOpen]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  }

  if (historyOpen) return null;
  return <>
    <button ref={launcher} className={`support-launcher ${location.pathname === '/thiet-ke' ? 'support-launcher-studio' : ''}`} aria-label="Chat hỗ trợ Nếp" aria-haspopup="dialog" aria-expanded={visible} onClick={() => setOpen(true)}>
      <MessageCircle size={21}/><span>Hỏi Nếp</span>{unread > 0 && <b aria-label={`${unread} tin chưa đọc`}>{unread > 99 ? '99+' : unread}</b>}
    </button>
    <Dialog open={visible} onClose={close} title={role === 'admin' ? 'Hộp thư hỗ trợ' : 'Trò chuyện cùng Nếp'} className="support-dialog">
      {user?.role === 'customer' ? <>
        <SupportConversation key={user.id} root="/support" active={visible} autoFocus onChanged={() => setUnread(0)}/>
        <Link className="support-history-link" onClick={() => setOpen(false)} to={historyPath}><History size={15}/>Xem lịch sử trong tài khoản<ArrowUpRight size={15}/></Link>
      </> : user?.role === 'admin' ? <>
        <SupportPopupInbox key={user.id} active={visible}/>
        <Link className="support-history-link" onClick={() => setOpen(false)} to="/quan-tri/ho-tro"><History size={15}/>Mở hộp thư đầy đủ<ArrowUpRight size={15}/></Link>
      </> : visible ? <SupportPopupSignin active={visible} onNavigate={() => setOpen(false)}/> : null}
    </Dialog>
  </>;
}
