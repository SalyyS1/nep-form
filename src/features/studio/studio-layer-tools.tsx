import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, Trash2, Unlock } from 'lucide-react';
import type { DesignFont, DesignLayer } from '../../../shared/custom-types';
import { FontPicker } from '../../components/font-picker';
import { StudioTextEffects } from './studio-text-effects';

interface Props { layer: DesignLayer; fonts?: DesignFont[]; update: (patch: Partial<DesignLayer>) => void; duplicate: () => void; remove: () => void; reorder: (direction: number) => void }
export function LayerInspector({ layer, fonts = [], update, duplicate, remove, reorder }: Props) {
  return <section className="studio-layer-inspector">
    <div className="studio-section-heading"><h2>Chỉnh lớp</h2><span>{layer.kind === 'text' ? 'Chữ' : layer.kind === 'shape' ? 'Hình' : 'Ảnh tải lên'}</span></div>
    {layer.kind === 'text' && <><label className="form-field">Nội dung<textarea aria-label="Nội dung chữ" className="input" value={layer.text || ''} maxLength={180} rows={3} disabled={layer.locked} onChange={event => update({ text: event.target.value })} /></label>
      <FontPicker value={layer.fontFamily || 'Be Vietnam Pro'} onChange={fontFamily => update({ fontFamily })} sample={layer.text} fonts={fonts} disabled={layer.locked} label="Kiểu chữ" /><label className="form-field">Độ đậm<select className="input" value={layer.fontWeight} disabled={layer.locked} onChange={event => update({ fontWeight: Number(event.target.value) })}><option value="700">Đậm</option><option value="400">Thường</option></select></label></>}
    {layer.kind !== 'image' && <label className="studio-color-field">Màu in<input type="color" aria-label="Màu in" value={layer.fill} disabled={layer.locked} onChange={event => update({ fill: event.target.value })} /><span>{layer.fill.toUpperCase()}</span></label>}
    {layer.kind === 'text' && <StudioTextEffects layer={layer} update={update} />}
    <div className="studio-field-pair"><label className="form-field">Rộng<input className="input" type="number" min={20} max={300 - layer.x} value={Math.round(layer.width)} disabled={layer.locked} onChange={event => { const width = Math.max(20, Math.min(300 - layer.x, Number(event.target.value))); update({ width, height: Math.min(360 - layer.y, layer.height * width / layer.width) }); }} /></label><label className="form-field">Xoay · độ<input className="input" type="number" min={-180} max={180} value={Math.round(layer.rotation)} disabled={layer.locked} onChange={event => update({ rotation: Math.max(-180, Math.min(180, Number(event.target.value))) })} /></label></div>
    <label className="form-field">Độ trong suốt · {Math.round(layer.opacity * 100)}%<input type="range" min="10" max="100" value={layer.opacity * 100} disabled={layer.locked} onChange={event => update({ opacity: Number(event.target.value) / 100 })} /></label>
    <div className="studio-align"><button onClick={() => update({ x: (300 - layer.width) / 2 })} disabled={layer.locked}>Căn giữa ngang</button><button onClick={() => update({ y: (360 - layer.height) / 2 })} disabled={layer.locked}>Căn giữa dọc</button></div>
    <div className="studio-layer-actions">
      <button className="icon-button" title="Nhân bản" aria-label="Nhân bản lớp" onClick={duplicate}><Copy size={18} /></button>
      <button className="icon-button" title="Đưa lên trước" aria-label="Đưa lớp lên trước" onClick={() => reorder(1)}><ArrowUp size={18} /></button>
      <button className="icon-button" title="Đưa ra sau" aria-label="Đưa lớp ra sau" onClick={() => reorder(-1)}><ArrowDown size={18} /></button>
      <button className="icon-button" aria-label={layer.hidden ? 'Hiện lớp' : 'Ẩn lớp'} onClick={() => update({ hidden: !layer.hidden })}>{layer.hidden ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      <button className="icon-button" aria-label={layer.locked ? 'Mở khóa lớp' : 'Khóa lớp'} onClick={() => update({ locked: !layer.locked })}>{layer.locked ? <Lock size={18} /> : <Unlock size={18} />}</button>
      <button className="icon-button danger" aria-label="Xóa lớp" onClick={remove}><Trash2 size={18} /></button>
    </div>
  </section>;
}
