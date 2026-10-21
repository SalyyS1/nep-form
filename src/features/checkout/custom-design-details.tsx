import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Eye } from 'lucide-react';
import { Dialog, ErrorText } from '../../components/ui';
import { downloadArtwork } from './download-artwork';
import { money } from '../../lib/api';
import type { CustomSummary, DesignSide } from '../../../shared/custom-types';

const sides: DesignSide[] = ['front', 'back'];
const labels = { front: 'Mặt trước', back: 'Mặt sau' };
export const designPreview = (id: string, side: DesignSide = 'front') => `/api/custom/designs/${encodeURIComponent(id)}/preview/${side}`;

export function DesignThumbnails({ designId, name }: { designId: string; name: string }) {
  const [failed, setFailed] = useState<DesignSide[]>([]);
  return <div className="custom-thumbnails">{sides.map(side => <figure key={side}>{failed.includes(side) ? <div className="custom-preview-failed" role="status">Chưa tải được ảnh</div> : <img src={designPreview(designId, side)} alt={`${name} — ${labels[side]}`} loading="lazy" onError={() => setFailed(current => [...current, side])} />}<figcaption>{labels[side]}</figcaption></figure>)}</div>;
}

export function CustomDesignDetails({ custom, exports = false }: { custom: CustomSummary; exports?: boolean }) {
  const [open, setOpen] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  async function exportSide(side: DesignSide) {
    setDownloading(true); setDownloadError('');
    try { await downloadArtwork(custom.designId, side); }
    catch (error) { setDownloadError(error instanceof Error ? error.message : 'Chưa tải được thiết kế.'); }
    finally { setDownloading(false); }
  }
  return <div className="custom-design-summary"><span className="custom-design-tag">Thiết kế riêng · {custom.name}</span><DesignThumbnails key={custom.designId} designId={custom.designId} name={custom.name} /><button type="button" className="text-link custom-details-trigger" onClick={() => setOpen(true)}><Eye size={14} />Xem thiết kế & chi phí</button>{createPortal(<Dialog open={open} onClose={() => setOpen(false)} title={custom.name} className="custom-preview-dialog"><DesignThumbnails key={custom.designId} designId={custom.designId} name={custom.name} /><div className="custom-price-lines"><div><span>Áo trơn</span><strong>{money(custom.unitPrice - custom.surcharge)}</strong></div>{custom.lines.map((line, index) => <div key={index}><span>{line.label}</span><strong>{money(line.amount)}</strong></div>)}<div><span>Phụ phí in</span><strong>{money(custom.surcharge)}</strong></div><div className="custom-price-total"><span>Giá mỗi áo</span><strong>{money(custom.unitPrice)}</strong></div></div>{exports && <div className="custom-artwork-downloads">{sides.map(side => <a key={side} href={`/api/custom/designs/${encodeURIComponent(custom.designId)}/artwork/${side}`} download={`${custom.designId}-${side}.svg`} aria-disabled={downloading} onClick={event => { event.preventDefault(); if (!downloading) void exportSide(side); }}><Download size={15} />Tải artwork {labels[side].toLowerCase()}</a>)}</div>}<ErrorText>{downloadError}</ErrorText><p className="field-help">Giá hiển thị là giá mỗi áo. Thiết kế trong đơn hàng được lưu cùng thời điểm đặt đơn.</p></Dialog>, document.body)}</div>;
}
