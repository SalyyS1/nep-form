import { useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { BUILTIN_FONTS } from '../../shared/builtin-font-catalog.mjs';
import { customFontStyles, fontCssFamily } from '../../shared/custom-fonts.mjs';
import type { DesignFont } from '../../shared/custom-types';
import '../styles/builtin-fonts.css';
import '../styles/font-picker.css';

interface Props { value: string; onChange: (value: string) => void; sample?: string; fonts?: DesignFont[]; disabled?: boolean; label?: string }
export function FontPicker({ value, onChange, sample, fonts = [], disabled, label = 'Phông chữ' }: Props) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [group, setGroup] = useState('Tất cả');
  const choices = [...BUILTIN_FONTS, ...fonts.map(font => ({ value: `custom:${font.id}`, label: font.name, group: 'Của bạn' })), { value: 'serif', label: 'Serif hệ thống', group: 'Hệ thống' }, { value: 'monospace', label: 'Máy chữ hệ thống', group: 'Hệ thống' }];
  const selected = choices.find(font => font.value === value) || choices[0];
  const visible = choices.filter(font => (group === 'Tất cả' || font.group === group) && font.label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const preview = (sample?.trim() || 'Nếp riêng, chất mình.').slice(0, 65);
  function choose(next: string) { onChange(next); setOpen(false); }
  return <div className="font-picker"><style>{customFontStyles(fonts)}</style><span className="font-picker-label">{label}</span>
    <button type="button" className="font-picker-trigger input" disabled={disabled} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><span><strong>{selected.label}</strong><small>15 phông Việt có sẵn · xem mẫu & chọn</small></span><ChevronDown size={17} /></button>
    {open && <div className="font-picker-panel"><div className="font-picker-search"><Search size={15} /><input aria-label="Tìm phông chữ" placeholder="Tìm tên phông…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="font-picker-filters" aria-label="Nhóm phông chữ">{['Tất cả', 'Hiện đại', 'Nổi bật', 'Cổ điển', 'Viết tay', ...(fonts.length ? ['Của bạn'] : [])].map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div>
      <div className="font-picker-options" role="group" aria-label="Danh sách phông chữ">{visible.map(font => <button type="button" key={font.value} className="font-picker-option" aria-label={`Chọn phông ${font.label}`} aria-pressed={value === font.value} onClick={() => choose(font.value)}><span className="font-picker-option-meta"><span>{font.label}<small>{font.group}</small></span>{value === font.value && <Check size={15} />}</span><span className="font-picker-sample" style={{ fontFamily: fontCssFamily(font.value) }}>{preview}</span></button>)}{!visible.length && <p className="font-picker-empty">Chưa có phông khớp tên này.</p>}</div>
      <p className="font-picker-foot">Mẫu chữ theo nội dung bạn nhập. 15 phông có sẵn hỗ trợ đầy đủ dấu Việt.</p>
    </div>}
  </div>;
}
