import { useState } from 'react';
import { Check, Shirt } from 'lucide-react';
import { createTemplateLayers, recolorTemplateLayers, type StudioTemplate } from '../../../shared/design-template-catalog.mjs';
import { renderArtworkSvg, renderShirtSvg, SIDE_LABELS, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignLayer, DesignProject, DesignSide } from '../../../shared/custom-types';
import { Dialog, ErrorText } from '../../components/ui';
import { useBuiltinDesignFonts } from './use-builtin-design-fonts';

interface Props { template: StudioTemplate; project: DesignProject; side: DesignSide; color: string; busy: boolean; close: () => void; apply: (layers: DesignLayer[], replace: boolean) => boolean }
const palettes = [
  { name: 'Nguyên bản', colors: [] }, { name: 'Mực đen', colors: ['#20201e','#6b6b63'] },
  { name: 'Olive', colors: ['#4f5a40','#9a482e'] }, { name: 'Đất nung', colors: ['#9a482e','#34596d'] },
  { name: 'Mực sáng', colors: ['#f7f5f0','#d6ee72'] },
];
export function StudioTemplatePreview({ template, project, side, color, busy, close, apply }: Props) {
  const [original] = useState(() => createTemplateLayers(template.id));
  const [layers, setLayers] = useState(original); const [palette, setPalette] = useState(0); const [flat, setFlat] = useState(false); const [error, setError] = useState('');
  const preview = { ...project, faces: { ...project.faces, [side]: { ...project.faces[side], layers } } };
  const fonts = useBuiltinDesignFonts(preview);
  const hasLayers = project.faces[side].layers.length > 0;
  function choosePalette(index: number) { const base = layers.map((layer, position) => ({ ...layer, fill: original[position].fill })); setLayers(index ? recolorTemplateLayers(base, palettes[index].colors) : base); setPalette(index); }
  function applyTemplate(replace: boolean) {
    if (layers.some(layer => layer.kind === 'text' && !layer.text?.trim())) { setError('Điền nội dung cho các dòng chữ trước khi dùng mẫu nhé. Bạn có thể xóa lớp sau khi đưa lên áo.'); return; }
    if (apply(layers, replace)) close(); else setError('Mỗi mặt áo tối đa 20 lớp. Chọn Thay thiết kế mặt này hoặc xóa bớt lớp rồi thử lại.');
  }
  return <Dialog open onClose={close} title={template.name} className="studio-template-dialog"><div className="studio-template-preview-layout"><div><div className="studio-template-preview-mode" role="group" aria-label="Kiểu xem mẫu"><button type="button" aria-pressed={!flat} onClick={() => setFlat(false)}><Shirt size={16} />Trên áo</button><button type="button" aria-pressed={flat} onClick={() => setFlat(true)}>Hình in</button></div><div className={`studio-template-large-preview ${flat ? 'is-flat' : ''}`} style={{ background: flat ? template.background : undefined }}><img src={svgDataUrl(flat ? renderArtworkSvg(preview, side) : renderShirtSvg(preview, color, side))} alt={`Mẫu ${template.name} · ${SIDE_LABELS[side].toLowerCase()}`} />{fonts.loading && <span role="status">Đang tải phông mẫu…</span>}</div><p className="field-help">{layers.length} lớp chỉnh riêng · Áp dụng cho {SIDE_LABELS[side].toLowerCase()} đang chọn.</p></div><div className="studio-template-quick-edit"><h3>Chỉnh nhanh thành của bạn.</h3><p>Đổi nội dung và bảng màu. Sau khi dùng mẫu, từng lớp vẫn kéo, xoay và đổi phông được.</p>{layers.map((layer, index) => layer.kind === 'text' && <label className="form-field" key={layer.id}>Dòng chữ {layers.slice(0,index + 1).filter(item => item.kind === 'text').length}<textarea aria-label={`Dòng chữ ${layers.slice(0,index + 1).filter(item => item.kind === 'text').length}`} className="input" rows={2} maxLength={180} value={layer.text} onChange={event => { setLayers(layers.map((item, position) => position === index ? { ...item, text: event.target.value } : item)); setError(''); }} /></label>)}<span className="studio-palette-label">Bảng màu in</span><div className="studio-template-palettes">{palettes.map((item,index) => <button type="button" aria-label={`Bảng màu ${item.name}`} aria-pressed={palette === index} key={item.name} onClick={() => choosePalette(index)}><span style={{background: item.colors[0] || original[0].fill}}>{palette === index && <Check size={12} color={index === 4 ? '#20201e' : '#fff'} />}</span>{item.name}</button>)}</div><ErrorText>{error || fonts.error}</ErrorText><div className="studio-template-use-actions"><button type="button" className="button full-width" disabled={busy || fonts.loading || !!fonts.error} onClick={() => applyTemplate(false)}>{hasLayers ? `Thêm vào ${SIDE_LABELS[side].toLowerCase()}` : 'Dùng mẫu này'}</button>{hasLayers && <button type="button" className="button-secondary full-width" disabled={busy || fonts.loading || !!fonts.error} onClick={() => applyTemplate(true)}>Thay thiết kế mặt này</button>}<p className="field-help">{hasLayers ? 'Thêm mẫu sẽ giữ các lớp cũ. Chọn Thay thiết kế nếu muốn thay riêng mặt đang xem. ' : ''}Có thể hoàn tác ngay sau khi áp dụng.</p></div></div></div></Dialog>;
}
