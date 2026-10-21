import { useRef, useState } from 'react';
import { Type, Upload } from 'lucide-react';
import type { DesignFont, DesignLayer } from '../../../shared/custom-types';
import { customFontStyles, fontCssFamily } from '../../../shared/custom-fonts.mjs';
import { ErrorText } from '../../components/ui';
import { FontPicker } from '../../components/font-picker';

interface Props { fonts: DesignFont[]; add: (kind: DesignLayer['kind'], patch?: Partial<DesignLayer>) => void; uploadFont: (file: File) => Promise<DesignFont>; busy: boolean }
export function StudioTextComposer({ fonts, add, uploadFont, busy }: Props) {
  const [text, setText] = useState(''); const [fontFamily, setFontFamily] = useState('Be Vietnam Pro');
  const [fill, setFill] = useState('#20201e'); const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false); const input = useRef<HTMLInputElement>(null);
  const selectedFont = fontFamily.startsWith('custom:') && !fonts.some(font => `custom:${font.id}` === fontFamily) ? 'Be Vietnam Pro' : fontFamily;
  async function upload(file: File) {
    setError(''); setUploading(true);
    try { const font = await uploadFont(file); setFontFamily(`custom:${font.id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa tải được phông.'); }
    finally { setUploading(false); }
  }
  return <section className="studio-text-composer" aria-label="Tự thêm chữ"><style>{customFontStyles(fonts)}</style><h2>Thêm chữ của bạn</h2><p>Nhập nội dung để thêm lên mặt áo đang chọn.</p>
    <label className="form-field">Chữ muốn in<textarea className="input" aria-label="Chữ muốn in" rows={3} maxLength={180} value={text} placeholder="Ví dụ: Cứ là chính mình" onChange={event => setText(event.target.value)} /></label>
    <FontPicker value={selectedFont} onChange={setFontFamily} sample={text} fonts={fonts} label="Phông chữ mới" />
    <label className="studio-color-field">Màu chữ<input type="color" aria-label="Màu chữ mới" value={fill} onChange={event => setFill(event.target.value)} /><span>{fill.toUpperCase()}</span></label>
    <div className="studio-text-live-preview" style={{ fontFamily: fontCssFamily(selectedFont), color: fill }} aria-label="Xem thử chữ">{text.trim() || 'Chữ của riêng bạn'}</div>
    <button type="button" className="button full-width" disabled={busy || uploading || !text.trim()} onClick={() => { add('text', { text: text.trim(), fontFamily: selectedFont, fontWeight: selectedFont === 'Be Vietnam Pro' || selectedFont === 'serif' || selectedFont === 'monospace' ? 700 : 400 }); setError(''); }}><Type size={17} />Thêm chữ này lên áo</button>
    <div className="studio-custom-font-upload"><h3>Phông riêng của bạn</h3><p>Tải phông từ máy để dùng cho thiết kế này.</p><input ref={input} className="studio-file-input" type="file" aria-label="File phông chữ" accept=".ttf,.otf,.woff,.woff2" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /><button type="button" className="button-secondary full-width" disabled={busy || uploading || fonts.length >= 3} onClick={() => input.current?.click()}><Upload size={16} />{uploading ? 'Đang đọc phông…' : 'Tải phông chữ'}</button><p className="field-help">TTF, OTF, WOFF, WOFF2 · tối đa 512 KB/file, 3 phông/thiết kế. Chỉ dùng phông bạn có quyền sử dụng; không phải phông nào cũng đủ dấu Việt.</p>{fonts.length > 0 && <ul className="studio-font-list">{fonts.map(font => <li key={font.id}>{font.name}</li>)}</ul>}</div>
    <ErrorText>{error}</ErrorText>
  </section>;
}
