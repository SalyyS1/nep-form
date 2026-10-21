import { useId, useRef, useState } from 'react';
import { api, send } from '../../lib/api';
import { errorText } from './admin-shared';

const maxFileBytes = 4_000_000;
const pinterestHosts = new Set(['pinterest.com', 'www.pinterest.com', 'pin.it', 'i.pinimg.com']);
const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
  reader.readAsDataURL(file);
});

export function ProductImagePicker({ images, onChange, onBusyChange }: { images: string[]; onChange: (images: string[]) => void; onBusyChange: (busy: boolean) => void }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const locked = useRef(false);
  function setWorking(value: boolean) { locked.current = value; setBusy(value); onBusyChange(value); }
  async function upload(files: File[]) {
    if (locked.current || !files.length) return;
    setError(''); setNotice('');
    if (images.length + files.length > 15) { setError('Mỗi sản phẩm tối đa 15 ảnh.'); return; }
    if (files.some(file => file.size > maxFileBytes || !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type))) { setError('Chọn PNG, JPEG, WebP, GIF tĩnh hoặc AVIF; mỗi ảnh tối đa 4 MB.'); return; }
    setWorking(true);
    const next = [...images];
    try {
      for (const file of files) {
        const result = await api<{ url: string }>('/admin/media', send('POST', { dataUrl: await readFile(file) }));
        next.push(result.url); onChange([...next]);
      }
      setNotice(`Đã tải lên ${files.length} ảnh. Lưu sản phẩm để áp dụng.`);
    } catch (reason) { setError(`${errorText(reason)}${next.length > images.length ? ' Các ảnh đã tải lên vẫn được giữ.' : ''}`); }
    finally { setWorking(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function addLink() {
    if (locked.current) return;
    setError(''); setNotice('');
    if (images.length >= 15) { setError('Mỗi sản phẩm tối đa 15 ảnh.'); return; }
    let url: URL;
    try { url = new URL(link.trim()); } catch { setError('Dán liên kết ảnh HTTPS hoặc trang Pinterest.'); return; }
    if (url.protocol !== 'https:' || url.username || url.password) { setError('Liên kết ảnh cần dùng HTTPS và không chứa tài khoản.'); return; }
    if (images.includes(url.href)) { setError('Ảnh này đã có trong danh sách.'); return; }
    if (pinterestHosts.has(url.hostname)) {
      setWorking(true);
      try {
        const result = await api<{ url: string }>('/admin/media', send('POST', { url: url.href }));
        onChange([...images, result.url]); setLink(''); setNotice('Đã nhập ảnh từ Pinterest. Lưu sản phẩm để áp dụng.');
      } catch (reason) { setError(errorText(reason)); }
      finally { setWorking(false); }
    } else {
      onChange([...images, url.href]); setLink(''); setNotice('Đã thêm liên kết. Kiểm tra ảnh xem trước, rồi lưu sản phẩm.');
    }
  }
  function move(index: number, destination: number) {
    const next = [...images]; const [image] = next.splice(index, 1); next.splice(destination, 0, image); onChange(next);
  }
  return <div className="admin-image-picker" aria-busy={busy}>
    <p id={helpId} className="admin-image-help">Tối đa 15 ảnh; 4 MB/ảnh, 6.000 px/cạnh, 16 triệu điểm ảnh. Ảnh đầu tiên là ảnh bìa. Ảnh tải lên được công khai cùng sản phẩm.</p>
    <label className="admin-image-upload">Tải ảnh từ thiết bị<input ref={fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/avif" disabled={busy || images.length >= 15} aria-describedby={helpId} onChange={event => void upload(Array.from(event.target.files || []))}/></label>
    <label>Liên kết ảnh hoặc Pinterest<input type="url" value={link} disabled={busy} placeholder="https://…" onChange={event => setLink(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void addLink(); } }}/></label>
    <small>Liên kết HTTPS khác phải trỏ trực tiếp đến ảnh. Trang Pinterest sẽ được nhập thành ảnh; không hỗ trợ lấy ảnh từ trang web bất kỳ.</small>
    <button type="button" className="admin-button admin-button-secondary" disabled={busy || !link.trim() || images.length >= 15} onClick={() => void addLink()}>Thêm từ liên kết</button>
    <div role="status" aria-live="polite" className="admin-image-help">{busy ? 'Đang xử lý ảnh…' : notice}</div>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {images.length > 0 && <ol className="admin-product-images">{images.map((url, index) => <li key={url}>
      <img src={url} alt={`Ảnh sản phẩm ${index + 1}`} onError={() => setFailedImages(previous => previous.includes(url) ? previous : [...previous, url])}/>
      <div><strong>{index === 0 ? 'Ảnh bìa' : `Ảnh ${index + 1}`}</strong>{failedImages.includes(url) && <small role="status">Không hiển thị được ảnh. Kiểm tra liên kết hoặc tải tệp lên.</small>}
        <div className="admin-image-controls"><button type="button" disabled={busy || index === 0} onClick={() => move(index, 0)} aria-label={`Đặt ảnh ${index + 1} làm ảnh bìa`}>Làm bìa</button><button type="button" disabled={busy || index === 0} onClick={() => move(index, index - 1)} aria-label={`Chuyển ảnh ${index + 1} lên`}>↑</button><button type="button" disabled={busy || index === images.length - 1} onClick={() => move(index, index + 1)} aria-label={`Chuyển ảnh ${index + 1} xuống`}>↓</button><button type="button" disabled={busy} onClick={() => onChange(images.filter((_, position) => position !== index))} aria-label={`Xóa ảnh ${index + 1}`}>Xóa</button></div>
      </div>
    </li>)}</ol>}
  </div>;
}
