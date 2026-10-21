import { useEffect, useRef, type ReactNode } from 'react';
import { X, Search } from 'lucide-react';
import { orderLabels, paymentLabels } from '../../lib/api';
import type { Order } from '../../lib/types';

export function Drawer({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    ref.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; trigger?.focus(); };
  }, []);
  return <dialog className="admin-drawer" ref={ref} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header className="admin-drawer-header"><div><span className="admin-eyebrow">NẾP FORM / QUẢN TRỊ</span><h2>{title}</h2></div><button className="admin-icon" onClick={onClose} aria-label="Đóng cửa sổ"><X size={20}/></button></header>
    <div className="admin-drawer-content">{children}</div>
  </dialog>;
}
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="admin-search"><Search size={18}/><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/></label>;
}
export function Status({ order, payment = false }: { order: Order; payment?: boolean }) {
  const status = payment ? order.paymentStatus : order.status;
  return <span className={`admin-status admin-status-${status}`}><i/>{payment ? paymentLabels[order.paymentStatus] : orderLabels[order.status]}</span>;
}
export function Empty({ children }: { children: ReactNode }) { return <div className="admin-empty">{children}</div>; }
export function ErrorMessage({ message }: { message: string }) { return message ? <p className="admin-error" role="alert">{message}</p> : null; }
export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="admin-page-title"><div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'Không thể lưu thay đổi. Bạn thử lại nhé.';
