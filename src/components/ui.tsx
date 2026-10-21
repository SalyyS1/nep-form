import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dialog({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  return <dialog ref={ref} className={`dialog ${className}`} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-label={title}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Đóng"><X size={20} /></button></div>{children}
  </dialog>;
}
export function Quantity({ value, onChange, max = 99, disabled = false }: { value: number; onChange: (value: number) => void; max?: number; disabled?: boolean }) {
  return <div className="quantity"><button aria-label="Giảm số lượng" onClick={() => onChange(value - 1)} disabled={disabled || value <= 1}><Minus size={14} /></button><span>{value}</span><button aria-label="Tăng số lượng" onClick={() => onChange(value + 1)} disabled={disabled || value >= max}><Plus size={14} /></button></div>;
}
export function EmptyState({ title, text, to = '/cua-hang', action = 'Khám phá sản phẩm' }: { title: string; text: string; to?: string; action?: string }) {
  return <div className="empty-state"><ShoppingBag size={35} strokeWidth={1.3} /><h2>{title}</h2><p>{text}</p><Link className="button" to={to}>{action}<ArrowRight size={17} /></Link></div>;
}
export function ErrorText({ children }: { children: ReactNode }) { return children ? <p className="error-text" role="alert">{children}</p> : null; }
