import { useState, type FormEvent } from 'react';
import { api, ApiError, send } from '../../lib/api';
import type { Product, Variant } from '../../lib/types';
import { ErrorMessage, errorText } from './admin-shared';
import { ProductImagePicker } from './product-image-picker';
import { isoToVietnamInput, vietnamInputToIso } from './vietnam-date-time';

const slugify = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function ProductEditor({ product, categories, onSaved, onCancel }: { product?: Product; categories: [string, string][]; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || categories[0]?.[0] || 'ao-thun');
  const [categoryLabel, setCategoryLabel] = useState(product?.categoryLabel || categories[0]?.[1] || 'Áo thun');
  const [price, setPrice] = useState(product?.price || 0);
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() ?? '');
  const [saleStartsAt, setSaleStartsAt] = useState(isoToVietnamInput(product?.saleStartsAt));
  const [saleEndsAt, setSaleEndsAt] = useState(isoToVietnamInput(product?.saleEndsAt));
  const [description, setDescription] = useState(product?.description || '');
  const [material, setMaterial] = useState(product?.material || '');
  const [fit, setFit] = useState(product?.fit || '');
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [imagesBusy, setImagesBusy] = useState(false);
  const [sizes, setSizes] = useState(product?.sizes.join(', ') || 'S, M, L, XL');
  const [colors, setColors] = useState(product?.colors.map(color => `${color.name} | ${color.hex}`).join('\n') || 'Trắng | #f6f4ed\nĐen | #252525');
  const [variants, setVariants] = useState<Variant[]>(product?.variants || []);
  const [active, setActive] = useState(product?.isActive ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [demo, setDemo] = useState(product?.isDemo ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function readDimensions() {
    const nextSizes = [...new Set(sizes.split(',').map(value => value.trim()).filter(Boolean))];
    const nextColors = colors.split('\n').map(line => { const [name, hex] = line.split('|').map(value => value.trim()); return { name, hex: hex || '#252525' }; }).filter(color => color.name);
    return { nextSizes, nextColors };
  }
  function buildVariants() {
    const { nextSizes, nextColors } = readDimensions();
    setVariants(nextColors.flatMap(color => nextSizes.map(size => variants.find(item => item.color === color.name && item.size === size) || { id: `v-${crypto.randomUUID()}`, color: color.name, size, stock: 0 })));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (imagesBusy) { setError('Chờ ảnh xử lý xong trước khi lưu sản phẩm.'); return; }
    const nextSalePrice = salePrice === '' ? null : Number(salePrice);
    if (nextSalePrice !== null && (!Number.isSafeInteger(nextSalePrice) || nextSalePrice <= 0 || nextSalePrice >= price)) { setError('Giá SALE phải là số đồng nguyên, lớn hơn 0 và thấp hơn giá bán.'); return; }
    let nextSaleStartsAt: string | null = null;
    let nextSaleEndsAt: string | null = null;
    try {
      if (nextSalePrice !== null) {
        nextSaleStartsAt = vietnamInputToIso(saleStartsAt); nextSaleEndsAt = vietnamInputToIso(saleEndsAt);
        if (nextSaleStartsAt && nextSaleEndsAt && nextSaleStartsAt >= nextSaleEndsAt) throw new Error('Giờ kết thúc SALE phải sau giờ bắt đầu.');
      }
    } catch (reason) { setError(errorText(reason)); return; }
    const { nextSizes, nextColors } = readDimensions();
    const nextImages = images;
    if (!nextSizes.length || !nextColors.length || !nextImages.length) { setError('Thêm ít nhất một ảnh, một màu và một size.'); return; }
    if (nextColors.some(color => !/^#[0-9a-f]{6}$/i.test(color.hex))) { setError('Mã màu cần có định dạng #RRGGBB, ví dụ #252525.'); return; }
    const nextVariants = nextColors.flatMap(color => nextSizes.map(size => variants.find(item => item.color === color.name && item.size === size) || { id: `v-${crypto.randomUUID()}`, color: color.name, size, stock: 0 }));
    const payload = { name: name.trim(), slug: product?.slug || slugify(name), category: slugify(category), categoryLabel: categoryLabel.trim(), price, salePrice: nextSalePrice, saleStartsAt: nextSaleStartsAt, saleEndsAt: nextSaleEndsAt, description, material, fit, images: nextImages, colors: nextColors, sizes: nextSizes, variants: nextVariants, stock: nextVariants.reduce((sum, item) => sum + item.stock, 0), isActive: active, featured, isDemo: demo, ...(product ? { expectedVersion: product.version ?? 1 } : {}) };
    setBusy(true);
    try { await api(product ? `/admin/products/${product.id}` : '/admin/products', send(product ? 'PATCH' : 'POST', payload)); await onSaved(); }
    catch (reason) { setError(reason instanceof ApiError && reason.status === 409 ? `${errorText(reason)} Nội dung bạn nhập vẫn được giữ. Hãy sao chép phần cần giữ, đóng cửa sổ, chọn Làm mới dữ liệu rồi mở lại sản phẩm để xem tồn kho hiện tại trước khi lưu.` : errorText(reason)); }
    finally { setBusy(false); }
  }
  return <form className="admin-form" onSubmit={event => void submit(event)}>
    <section className="admin-form-group"><h3>Thông tin sản phẩm</h3><label>Tên sản phẩm<input required maxLength={160} value={name} onChange={event => setName(event.target.value)}/></label><div className="admin-form-grid"><label>Danh mục<select value={category} onChange={event => { setCategory(event.target.value); setCategoryLabel(categories.find(c => c[0] === event.target.value)?.[1] || event.target.value); }}>{categories.map(([id,label]) => <option key={id} value={id}>{label}</option>)}{!categories.length && <option value="ao-thun">Áo thun</option>}</select></label><label>Giá bán (đ)<input type="number" required min={1} step={1} value={price} onChange={event => setPrice(Number(event.target.value))}/></label></div><label>Mô tả<textarea required rows={4} value={description} onChange={event => setDescription(event.target.value)}/></label><div className="admin-form-grid"><label>Chất liệu<input required value={material} onChange={event => setMaterial(event.target.value)}/></label><label>Phom dáng<input required value={fit} onChange={event => setFit(event.target.value)}/></label></div></section>
    <section className="admin-form-group"><h3>Giá SALE</h3><label>Giá SALE (đ)<input type="number" min={1} step={1} max={price - 1} value={salePrice} disabled={busy} onChange={event => { setSalePrice(event.target.value); if (!event.target.value) { setSaleStartsAt(''); setSaleEndsAt(''); } }}/><small>Để trống để tắt SALE. Mã giảm giá vẫn áp dụng trên tiền hàng sau SALE.</small></label><div className="admin-form-grid"><label>Bắt đầu (giờ Việt Nam)<input type="datetime-local" value={saleStartsAt} disabled={busy || !salePrice} onChange={event => setSaleStartsAt(event.target.value)}/><small>Để trống để bắt đầu ngay.</small></label><label>Kết thúc (giờ Việt Nam)<input type="datetime-local" value={saleEndsAt} disabled={busy || !salePrice} onChange={event => setSaleEndsAt(event.target.value)}/><small>Để trống để không giới hạn thời gian.</small></label></div></section>
    <section className="admin-form-group"><h3>Hình ảnh</h3><fieldset className="admin-image-fieldset" disabled={busy}><ProductImagePicker images={images} onChange={setImages} onBusyChange={setImagesBusy}/></fieldset></section>
    <section className="admin-form-group"><h3>Màu, size & tồn kho</h3><label>Size<input required value={sizes} onChange={event => setSizes(event.target.value)}/><small>Phân cách bằng dấu phẩy: S, M, L, XL.</small></label><label>Màu sắc<textarea required rows={3} value={colors} onChange={event => setColors(event.target.value)}/><small>Mỗi dòng: tên màu | mã màu. Ví dụ: Trắng | #f6f4ed.</small></label><button type="button" className="admin-button admin-button-secondary" onClick={buildVariants}>Cập nhật danh sách biến thể</button><small>Đổi màu hoặc size rồi cập nhật danh sách để nhập tồn kho.</small>{variants.length > 0 && <div className="admin-variants">{variants.map((variant, index) => <label key={variant.id}><span>{variant.color} / {variant.size}</span><input aria-label={`Tồn kho ${variant.color} size ${variant.size}`} type="number" min={0} step={1} required value={variant.stock} onChange={event => setVariants(previous => previous.map((item, i) => i === index ? { ...item, stock: Number(event.target.value) } : item))}/></label>)}</div>}</section>
    <section className="admin-form-group"><h3>Hiển thị</h3><label className="admin-check"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/>Đang bán trong cửa hàng</label><label className="admin-check"><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)}/>Sản phẩm nổi bật</label><label className="admin-check"><input type="checkbox" checked={demo} onChange={event => setDemo(event.target.checked)}/>Đánh dấu sản phẩm mẫu</label></section>
    <ErrorMessage message={error}/><div className="admin-form-actions"><button type="button" className="admin-button admin-button-secondary" disabled={imagesBusy || busy} onClick={onCancel}>Hủy</button><button className="admin-button" disabled={busy || imagesBusy}>{busy ? 'Đang lưu…' : imagesBusy ? 'Đang xử lý ảnh…' : product ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button></div>
  </form>;
}
