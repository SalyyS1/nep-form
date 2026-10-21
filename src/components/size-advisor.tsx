import { useState } from 'react';
import { Ruler, ArrowRight } from 'lucide-react';
import { SHIRT_SIZE_CHART, suggestShirtSize } from '../../shared/size-guide.mjs';
import { Dialog } from './ui';
import type { Product } from '../lib/types';

interface Props { product: Product; color: string; selectedSize: string; onApply: (size: string) => void; remainingStock?: (size: string) => number }
export function SizeAdvisor({ product, color, selectedSize, onApply, remainingStock }: Props) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState('');
  const [showChart, setShowChart] = useState(false);
  const canSuggest = product.isCustomBase || ['ao-thun', 'so-mi', 'hoodie', 'ao-khoac'].includes(product.category);
  if (!canSuggest) return null;
  const heightValue = Number(height.trim().replace(',', '.')), weightValue = Number(weight.trim().replace(',', '.'));
  const suggestion = height.trim() && weight.trim() ? suggestShirtSize(heightValue, weightValue, product.sizes) : null;
  const available = suggestion?.size ? (remainingStock ? remainingStock(suggestion.size) : product.variants.find(variant => variant.size === suggestion.size && variant.color === color)?.stock ?? 0) : 0;
  function close() { setOpen(false); setHeight(''); setWeight(''); }
  return <><button type="button" className="text-link size-advisor-trigger" onClick={() => setOpen(true)}><Ruler size={16} />Chưa biết chọn size?</button>
    <Dialog open={open} onClose={close} title="Tìm size áo của bạn" className="size-advisor-dialog"><p className="size-advisor-intro">Nhập hai số đo, Nếp gợi ý size cho <strong>{product.name}</strong>.</p>
      <div className="size-advisor-inputs"><label className="form-field">Chiều cao (cm)<input className="input" type="text" inputMode="decimal" maxLength={6} autoComplete="off" value={height} placeholder="Ví dụ: 168" onChange={event => setHeight(event.target.value)} /></label><label className="form-field">Cân nặng (kg)<input className="input" type="text" inputMode="decimal" maxLength={6} autoComplete="off" value={weight} placeholder="Ví dụ: 58" onChange={event => setWeight(event.target.value)} /></label></div>
      <div className="size-advisor-result" role="status" aria-live="polite">{!suggestion ? <p>Điền chiều cao và cân nặng để xem gợi ý.</p> : suggestion.size ? <><div className="size-advisor-result-heading"><span>Nếp gợi ý</span><strong>{suggestion.size}</strong></div><p>{suggestion.reason}</p><p className="size-advisor-stock">{available > 0 ? `Màu ${color} còn ${available} áo size ${suggestion.size}.` : `Màu ${color} hiện hết size ${suggestion.size}. Thử chọn màu khác hoặc liên hệ shop nhé.`}</p><button type="button" className="button full-width" disabled={available <= 0} onClick={() => { onApply(suggestion.size!); close(); }}>{selectedSize === suggestion.size ? `Giữ size ${suggestion.size}` : `Chọn size ${suggestion.size}`}<ArrowRight size={16} /></button></> : <p>{suggestion.reason}</p>}</div>
      <p className="size-advisor-note">Gợi ý tham khảo theo bảng demo, chưa thay thế số đo từng mẫu áo. Phom {product.fit.toLowerCase()} có thể cho độ rộng khác nhau. Hai số đo chỉ dùng trong hộp thoại này.</p>
      <button type="button" className="text-link" aria-expanded={showChart} onClick={() => setShowChart(!showChart)}>{showChart ? 'Ẩn bảng size tham khảo' : 'Xem bảng size tham khảo'}</button>
      {showChart && <div className="size-guide-table"><table><thead><tr><th>Size</th><th>Cao (cm)</th><th>Nặng (kg)</th></tr></thead><tbody>{SHIRT_SIZE_CHART.filter(row => product.sizes.includes(row.size)).map(row => <tr key={row.size}><td>{row.size}</td><td>{row.height.join('–')}</td><td>{row.weight.join('–')}</td></tr>)}</tbody></table></div>}
    </Dialog>
  </>;
}
