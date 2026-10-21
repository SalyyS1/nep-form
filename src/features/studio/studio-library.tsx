import { ImagePlus, LayoutTemplate, Shapes, Type, Upload } from 'lucide-react';
import type { DesignFont, DesignLayer, DesignProject, DesignSide } from '../../../shared/custom-types';
import { useRef, useState } from 'react';
import { StudioTextComposer } from './studio-text-composer';
import { StudioStickerBrowser } from './studio-sticker-browser';
import { StudioTemplateBrowser } from './studio-template-browser';
import '../../styles/studio-library.css';

interface Props { add: (kind: DesignLayer['kind'], patch?: Partial<DesignLayer>) => void; template: (layers: DesignLayer[], replace: boolean) => boolean; project: DesignProject; side: DesignSide; color: string; upload: (file: File) => Promise<void>; busy: boolean; fonts: DesignFont[]; uploadFont: (file: File) => Promise<DesignFont> }
export function StudioLibrary({ add, template, upload, busy, fonts, uploadFont, project, side, color }: Props) {
  const [tab, setTab] = useState('templates'); const file = useRef<HTMLInputElement>(null);
  return <div className="studio-library">
    <div className="studio-tool-tabs" role="tablist" aria-label="Thư viện thiết kế">{[
      ['templates', 'Mẫu', LayoutTemplate], ['text', 'Chữ', Type], ['shapes', 'Hình', Shapes], ['upload', 'Tải lên', Upload],
    ].map(([id, label, Icon]) => { const ToolIcon = Icon as typeof Type; return <button key={id as string} role="tab" aria-selected={tab === id} onClick={() => setTab(id as string)}><ToolIcon size={20} /><span>{label as string}</span></button>; })}</div>
    <div className="studio-library-content" role="tabpanel">
      {tab === 'templates' && <StudioTemplateBrowser project={project} side={side} color={color} busy={busy} apply={template} />}
      {tab === 'text' && <><StudioTextComposer fonts={fonts} add={add} uploadFont={uploadFont} busy={busy} /><h2>Chữ của bạn.</h2><p>Một câu nói, một cái tên, hay một điều bạn tin.</p><button className="button full-width" onClick={() => add('text')}><Type size={18} />Thêm chữ</button><div className="studio-text-presets"><button onClick={() => add('text', { text: 'CỨ LÀ MÌNH.', fontWeight: 700 })}>CỨ LÀ MÌNH.</button><button onClick={() => add('text', { text: 'Chậm một nhịp.', fontFamily: 'serif' })}>Chậm một nhịp.</button><button onClick={() => add('text', { text: 'made by me.', fontFamily: 'monospace', fontWeight: 400 })}>made by me.</button></div></>}
      {tab === 'shapes' && <><StudioStickerBrowser add={add} busy={busy} /><StudioTextComposer fonts={fonts} add={add} uploadFont={uploadFont} busy={busy} /></>}
      {tab === 'upload' && <><h2>Đưa ý tưởng lên áo.</h2><p>Tải logo hoặc ảnh của bạn. PNG nền trong suốt sẽ hợp với áo hơn.</p><button className="studio-upload-zone" onClick={() => file.current?.click()} disabled={busy}><ImagePlus size={36} strokeWidth={1.3} /><strong>{busy ? 'Đang xử lý ảnh…' : 'Chọn ảnh từ máy'}</strong><span>PNG, JPG, WebP · tối đa 10 MB/ảnh gốc</span></button><p className="field-help">Ảnh được thu gọn để thử thiết kế. Tổng ảnh trong một thiết kế tối đa 2 MB. Chỉ dùng nội dung bạn có quyền sử dụng.</p></>}
      <input ref={file} className="studio-file-input" type="file" aria-label="Tải logo hoặc ảnh" accept="image/png,image/jpeg,image/webp" onChange={event => { const selected = event.target.files?.[0]; if (selected) void upload(selected); event.target.value = ''; }} />
    </div>
  </div>;
}
