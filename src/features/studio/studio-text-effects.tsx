import { useState } from 'react';
import type { DesignLayer, TextEffects, TextShadow } from '../../../shared/custom-types';
import { normalizedTextEffects } from '../../../shared/text-effects.mjs';
import '../../styles/studio-text-effects.css';

interface Props { layer: DesignLayer; update: (patch: Partial<DesignLayer>) => void }
interface RangeProps { label: string; value: number; min: number; max: number; step?: number; disabled?: boolean; unit?: string; change: (value: number) => void }
function EffectNumber({ label, value, min, max, step = 1, disabled, change }: RangeProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input className="input" type="number" aria-label={label} min={min} max={max} step={step} value={draft ?? value} disabled={disabled} onFocus={() => setDraft(String(value))} onChange={event => {
    const next = event.target.value; setDraft(next);
    if (next.trim() && Number.isFinite(Number(next)) && Number(next) >= min && Number(next) <= max) change(Number(next));
  }} onBlur={() => { const next = draft?.trim() ? Number(draft) : value; change(Number.isFinite(next) ? Math.min(max,Math.max(min,next)) : value); setDraft(null); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}
function EffectRange({ label, value, min, max, step = 1, disabled, unit = '', change }: RangeProps) {
  const set = (next: string) => { const number = Number(next); if (Number.isFinite(number)) change(Math.min(max,Math.max(min,number))); };
  return <div className="studio-effect-range"><label>{label}<input type="range" aria-label={label} min={min} max={max} step={step} value={value} disabled={disabled} onChange={event => set(event.target.value)} /></label><div><EffectNumber label={`${label} chính xác`} min={min} max={max} step={step} value={value} disabled={disabled} change={change} /><span>{unit}</span></div></div>;
}
export function StudioTextEffects({ layer, update }: Props) {
  const effects = normalizedTextEffects(layer.textEffects), locked = layer.locked;
  function change(patch: Partial<TextEffects>) { update({ textEffects: { ...effects, ...patch } }); }
  function shadow(patch: Partial<TextShadow>) { change({ shadow: { ...effects.shadow, ...patch } }); }
  return <section className="studio-text-effects" aria-label="Hiệu ứng chữ"><div className="studio-section-heading"><h3>Hiệu ứng chữ</h3><button type="button" className="text-link" disabled={locked} onClick={() => update({ textEffects: normalizedTextEffects() })}>Đặt lại hiệu ứng</button></div>
    <div className="studio-curve-presets" role="group" aria-label="Kiểu uốn chữ">{[{name:'Thẳng',value:0},{name:'Cong lên',value:65},{name:'Cong xuống',value:-65}].map(item => <button type="button" key={item.name} disabled={locked} aria-pressed={item.value === 0 ? effects.curve === 0 : item.value > 0 ? effects.curve > 0 : effects.curve < 0} onClick={() => change({curve:item.value})}>{item.name}</button>)}</div>
    <EffectRange label="Độ cong chữ" value={effects.curve} min={-100} max={100} disabled={locked} unit="%" change={curve => change({curve})} /><p className="studio-effect-help">Âm: cong xuống · Dương: cong lên. Mỗi dòng chữ uốn riêng trong vùng chữ đang có.</p>
    <div className="studio-effect-block"><label className="checkbox-line"><input type="checkbox" checked={effects.outlineWidth > 0} disabled={locked} onChange={event => change({outlineWidth:event.target.checked ? 2 : 0})} />Viền chữ</label>{effects.outlineWidth > 0 && <><label className="studio-color-field">Màu viền<input type="color" aria-label="Màu viền chữ" value={effects.outlineColor} disabled={locked} onChange={event => change({outlineColor:event.target.value})} /><span>{effects.outlineColor.toUpperCase()}</span></label><EffectRange label="Độ dày viền" value={effects.outlineWidth} min={0} max={10} step={.5} disabled={locked} change={outlineWidth => change({outlineWidth})} /></>}</div>
    <div className="studio-effect-block"><label className="checkbox-line"><input type="checkbox" checked={effects.shadow.enabled} disabled={locked} onChange={event => shadow({enabled:event.target.checked})} />Đổ bóng chữ</label>{effects.shadow.enabled && <><label className="studio-color-field">Màu bóng<input type="color" aria-label="Màu bóng chữ" value={effects.shadow.color} disabled={locked} onChange={event => shadow({color:event.target.value})} /><span>{effects.shadow.color.toUpperCase()}</span></label><EffectRange label="Độ đậm bóng" value={Math.round(effects.shadow.opacity * 100)} min={0} max={100} disabled={locked} unit="%" change={opacity => shadow({opacity:opacity / 100})} /><EffectRange label="Độ mờ bóng" value={effects.shadow.blur} min={0} max={12} step={.5} disabled={locked} change={blur => shadow({blur})} /><div className="studio-field-pair"><label className="form-field">Lệch ngang<EffectNumber label="Bóng lệch ngang" min={-20} max={20} value={effects.shadow.offsetX} disabled={locked} change={offsetX => shadow({offsetX})} /></label><label className="form-field">Lệch dọc<EffectNumber label="Bóng lệch dọc" min={-20} max={20} value={effects.shadow.offsetY} disabled={locked} change={offsetY => shadow({offsetY})} /></label></div></>}</div>
    <p className="studio-effect-help">Xem trực tiếp trên áo. Viền và bóng thuộc cùng lớp chữ, không thêm phí lớp.</p>
  </section>;
}
