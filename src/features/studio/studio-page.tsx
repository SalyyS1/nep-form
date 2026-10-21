import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, Eye, Grid2X2, Layers, Minus, Plus, Redo2, Save, ShoppingBag, Undo2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productPrice } from '../../../shared/product-pricing.mjs';
import { ProductPrice } from '../../components/product-price';
import { AREA_LABELS, DEFAULT_PRICING, SIDE_LABELS, calculateCustomPrice, renderArtworkSvg, renderShirtSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignLayer, DesignProject, DesignRecord, DesignSide, PrintArea } from '../../../shared/custom-types';
import { useStore } from '../../lib/store-context';
import type { Product } from '../../lib/types';
import { api, money, send } from '../../lib/api';
import { Dialog, EmptyState, ErrorText, Quantity } from '../../components/ui';
import { DRAFT_KEY, makeLayer, prepareUpload, readDraft } from './studio-project';
import { useDesignHistory } from './use-design-history';
import { StudioCanvas } from './studio-canvas';
import { StudioLibrary } from './studio-library';
import { LayerInspector } from './studio-layer-tools';
import { readFontUpload } from './font-upload';
import { SizeAdvisor } from '../../components/size-advisor';
import { useBuiltinDesignFonts } from './use-builtin-design-fonts';

export default function StudioPage() {
  const { data } = useStore();
  const bases = data?.products.filter(product => product.isCustomBase && product.isActive) || [];
  if (!bases.length) return <EmptyState title="Xưởng đang chuẩn bị phôi áo." text="Thử tải lại trang sau một chút nhé." to="/" action="Về trang chủ" />;
  return <StudioEditor products={bases} />;
}
function StudioEditor({ products }: { products: Product[] }) {
  const { data, refresh, notify, cart } = useStore();
  const navigate = useNavigate(); const [search] = useSearchParams();
  const history = useDesignHistory(() => readDraft(products));
  const { project, commit } = history;
  const builtinFonts = useBuiltinDesignFonts(project);
  const [side, setSide] = useState<DesignSide>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100); const [guides, setGuides] = useState(true);
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const [preview, setPreview] = useState(false); const [quantity, setQuantity] = useState(1);
  const [draftSaved, setDraftSaved] = useState(false);
  const [panel, setPanel] = useState<'library' | 'settings'>('library');
  const product = products.find(value => value.id === project.productId) || products[0];
  const hex = product.colors.find(value => value.name === project.color)?.hex || '#f4f0e6';
  const face = project.faces[side]; const layer = face.layers.find(value => value.id === selectedId);
  const price = calculateCustomPrice(project, productPrice(product), data?.customPricing || DEFAULT_PRICING);
  const variantStock = product.variants.find(value => value.size === project.size && value.color === project.color)?.stock || 0;
  const inCart = cart.filter(item => item.productId === product.id && item.size === project.size && item.color === project.color).reduce((sum, item) => sum + item.quantity, 0);
  const stock = Math.max(0, variantStock - inCart);
  const hasArt = Object.values(project.faces).some(value => value.layers.some(item => !item.hidden));
  const designId = search.get('ban-thiet-ke');
  useEffect(() => {
    if (!designId) return;
    let active = true;
    api<{ design: DesignRecord }>(`/custom/designs/${encodeURIComponent(designId)}`).then(({ design }) => {
      if (active) { history.commit(design.project); setSelectedId(null); notify('Đã mở thiết kế đã lưu.'); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
    // A saved design is loaded once per URL; subsequent edits belong to the current draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(project)); setDraftSaved(true); }
      catch { setDraftSaved(false); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [project]);
  function changeProject(patch: Partial<DesignProject>) { commit({ ...project, ...patch }); }
  function changeLayers(layers: DesignLayer[], usePreview = false) {
    const next = { ...project, faces: { ...project.faces, [side]: { ...face, layers } } };
    if (usePreview) history.preview(next); else commit(next);
  }
  function updateLayer(patch: Partial<DesignLayer>, usePreview = false) {
    if (selectedId) changeLayers(face.layers.map(value => value.id === selectedId ? { ...value, ...patch } : value), usePreview);
  }
  function add(kind: DesignLayer['kind'], patch: Partial<DesignLayer> = {}) {
    if (face.layers.length >= 20) { setError('Mỗi mặt áo tối đa 20 lớp.'); return; }
    const next = makeLayer(kind, patch); changeLayers([...face.layers, next]); setSelectedId(next.id); setError('');
  }
  function template(input: DesignLayer[], replace: boolean) {
    const layers = input.map(layer => ({ ...layer, id: crypto.randomUUID() }));
    const next = replace ? layers : [...face.layers, ...layers];
    if (!layers.length || next.length > 20) { setError('Mỗi mặt áo tối đa 20 lớp. Hãy thay thiết kế mặt này hoặc xóa bớt lớp trước khi thêm mẫu.'); return false; }
    changeLayers(next); setSelectedId(layers[0].id); setError(''); return true;
  }
  async function upload(file: File) {
    setBusy('upload'); setError('');
    try {
      const { src, ratio } = await prepareUpload(file);
      const bytes = [...project.faces.front.layers, ...project.faces.back.layers].reduce((sum, item) => sum + ((item.src?.split(',')[1]?.length || 0) * .75), src.split(',')[1].length * .75);
      if (bytes > 2 * 1024 * 1024) throw new Error('Tổng ảnh vượt 2 MB. Hãy giảm số ảnh hoặc dùng ảnh nhẹ hơn.');
      const width = Math.min(220, 220 * ratio), height = width / ratio;
      add('image', { src, x: (300 - width) / 2, y: 50, width, height });
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa tải được ảnh.'); }
    finally { setBusy(''); }
  }
  async function uploadFont(file: File) {
    setBusy('font');
    try {
      const font = await readFontUpload(file, project.fonts || []);
      // Merge with the latest draft; typing while FontFace loads must not lose edits.
      commit(current => ({ ...current, fonts: [...(current.fonts || []), font] }));
      return font;
    } finally { setBusy(''); }
  }
  function duplicate() {
    if (!layer) return;
    add(layer.kind, { ...layer, id: crypto.randomUUID(), locked: false, x: Math.min(300 - layer.width, layer.x + 10), y: Math.min(360 - layer.height, layer.y + 10) });
  }
  function remove() { if (layer) { changeLayers(face.layers.filter(value => value.id !== layer.id)); setSelectedId(null); } }
  function reorder(direction: number) {
    const index = face.layers.findIndex(value => value.id === selectedId), next = index + direction;
    if (index < 0 || next < 0 || next >= face.layers.length) return;
    const layers = [...face.layers]; [layers[index], layers[next]] = [layers[next], layers[index]]; changeLayers(layers);
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]') || preview || !!busy || document.querySelector('dialog[open]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) history.redo(); else history.undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); history.redo(); }
      else if (layer && !layer.locked) {
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
        const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (move) { event.preventDefault(); const step = event.shiftKey ? 10 : 1; updateLayer({ x: Math.max(0, Math.min(300 - layer.width, layer.x + move[0] * step)), y: Math.max(0, Math.min(360 - layer.height, layer.y + move[1] * step)) }); }
      }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });
  function download() {
    const url = URL.createObjectURL(new Blob([renderArtworkSvg(project, side)], { type: 'image/svg+xml' }));
    const link = document.createElement('a'); link.href = url; link.download = `nep-thiet-ke-${side}.svg`; link.click(); URL.revokeObjectURL(url);
  }
  async function persist(action: 'save' | 'cart') {
    if (builtinFonts.loading) { notify('Đang tải phông Việt, thử lại sau một chút nhé.'); return; }
    setError('');
    if (!data?.user) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(project)); }
      catch { setError('Chưa lưu được bản nháp trên máy. Hãy giảm dung lượng ảnh trước khi đăng nhập.'); return; }
      notify('Đăng nhập để lưu thiết kế và đặt áo. Bản nháp đã giữ trên máy.');
      navigate('/dang-nhap?tiep=%2Fthiet-ke'); return;
    }
    setBusy(action);
    try {
      if (action === 'save') { await api('/custom/designs', send('POST', { project })); notify('Đã lưu vào Thiết kế của tôi.'); }
      else { await api('/custom/cart', send('POST', { project, quantity })); await refresh(); notify('Đã thêm áo vào giỏ hàng.'); navigate('/gio-hang'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được thiết kế.'); }
    finally { setBusy(''); }
  }
  return <div className="studio-page">
    <a className="skip-link" href="#studio-canvas">Đến vùng thiết kế</a>
    <header className="studio-header"><Link to="/" className="studio-back" aria-label="Về trang chủ"><ArrowLeft size={19} /><span className="brand">nếp<span>studio</span><i /></span></Link><label className="studio-project-name"><input aria-label="Tên thiết kế" maxLength={80} value={project.name} onChange={event => changeProject({ name: event.target.value })} /><span><Check size={12} />{draftSaved ? 'Bản nháp trên máy' : 'Đang giữ bản nháp'}</span></label><div className="studio-header-actions"><button className="button-secondary" onClick={() => void persist('save')} disabled={!!busy}><Save size={17} /><span>{busy === 'save' ? 'Đang lưu…' : 'Lưu thiết kế'}</span></button><Link className="icon-button" to="/gio-hang" aria-label={`Giỏ hàng ${cart.reduce((sum, value) => sum + value.quantity, 0)} sản phẩm`}><ShoppingBag size={20} /></Link></div></header>
    <main className="studio-workspace">
      <div className="studio-mobile-tabs"><button className={panel === 'library' ? 'active' : ''} onClick={() => setPanel('library')}>1. Thêm thiết kế</button><button className={panel === 'settings' ? 'active' : ''} onClick={() => setPanel('settings')}>2. Chọn áo & đặt</button></div>
      <aside className={`studio-left ${panel === 'library' ? 'mobile-active' : ''}`} aria-label="Thư viện và lớp thiết kế"><StudioLibrary project={project} side={side} color={hex} add={add} template={template} upload={upload} busy={!!busy} fonts={project.fonts || []} uploadFont={uploadFont} />
        <section className="studio-layers"><div className="studio-section-heading"><h2><Layers size={16} />Các lớp · {SIDE_LABELS[side].toLowerCase()}</h2><span>{face.layers.length}/20</span></div>{!face.layers.length && <p>Chưa có lớp nào. Thêm chữ, hình hoặc ảnh để bắt đầu nhé.</p>}{[...face.layers].reverse().map((value, index) => <button key={value.id} className={`studio-layer-row ${value.id === selectedId ? 'active' : ''}`} onClick={() => { setSelectedId(value.id); setPanel('settings'); }}><span>{value.kind === 'text' ? 'T' : value.kind === 'image' ? '▧' : '✦'}</span><strong>{value.kind === 'text' ? value.text || 'Chữ trống' : value.kind === 'image' ? 'Ảnh tải lên' : 'Hình minh họa'}</strong><small>{value.hidden ? 'Ẩn' : value.locked ? 'Khóa' : face.layers.length - index}</small></button>)}</section>
      </aside>
      <section className="studio-stage" id="studio-canvas" aria-label="Bản xem trước áo"><div className="studio-stage-toolbar"><div className="studio-face-tabs">{(['front', 'back'] as DesignSide[]).map(value => <button key={value} className={side === value ? 'active' : ''} onClick={() => { setSide(value); setSelectedId(null); }}>{SIDE_LABELS[value]}{project.faces[value].layers.some(item => !item.hidden) && <i />}</button>)}</div><div><button className="icon-button" aria-label="Hoàn tác" title="Hoàn tác · Ctrl Z" onClick={history.undo} disabled={!history.canUndo || !!busy}><Undo2 size={18} /></button><button className="icon-button" aria-label="Làm lại" title="Làm lại · Ctrl Shift Z" onClick={history.redo} disabled={!history.canRedo || !!busy}><Redo2 size={18} /></button></div></div>
        <div className="studio-canvas-wrap">{(builtinFonts.loading || builtinFonts.error) && <span className="studio-font-status" role="status">{builtinFonts.error || 'Đang tải phông Việt…'}</span>}<span className="studio-canvas-watermark" aria-hidden="true">nếp riêng.</span><StudioCanvas project={project} side={side} color={hex} zoom={zoom} guides={guides} selectedId={selectedId} select={setSelectedId} onPreview={value => { const next = face.layers.map(item => item.id === value.id ? value : item); changeLayers(next, true); }} onDragStart={history.beginDrag} onDragEnd={history.endDrag} /></div>
        <div className="studio-canvas-caption"><span>{AREA_LABELS[face.area]}<small>Vùng nét đứt là khổ in · kéo để di chuyển</small></span><div><button className={`icon-button ${guides ? 'active' : ''}`} aria-label="Bật/tắt lưới căn chỉnh" aria-pressed={guides} onClick={() => setGuides(!guides)}><Grid2X2 size={17} /></button><button className="icon-button" aria-label="Thu nhỏ" disabled={zoom <= 70} onClick={() => setZoom(zoom - 10)}><Minus size={17} /></button><span>{zoom}%</span><button className="icon-button" aria-label="Phóng to" disabled={zoom >= 130} onClick={() => setZoom(zoom + 10)}><Plus size={17} /></button></div></div>
        <div className="studio-stage-note"><span>01 — Bạn tạo ý tưởng.</span><span>02 — Nếp đưa lên áo.</span></div>
      </section>
      <aside className={`studio-right ${panel === 'settings' ? 'mobile-active' : ''}`} aria-label="Tùy chọn áo và giá">
        <section className="studio-product-options"><div className="studio-section-heading"><h1>Áo của bạn.</h1><span>Phôi unisex</span></div><label className="form-field">Phom áo<select className="input" value={product.id} onChange={event => { const next = products.find(value => value.id === event.target.value)!; changeProject({ productId: next.id, color: next.colors.some(value => value.name === project.color) ? project.color : next.colors[0].name, size: next.sizes.includes(project.size) ? project.size : next.sizes[0] }); }} >{products.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label><div className="studio-option-label">Màu áo <span>{project.color}</span></div><div className="studio-swatches">{product.colors.map(value => <button key={value.name} aria-label={`Áo màu ${value.name}`} aria-pressed={project.color === value.name} className={project.color === value.name ? 'active' : ''} onClick={() => changeProject({ color: value.name })} style={{ background: value.hex }}>{project.color === value.name && <Check size={16} style={{ color: value.hex.toLowerCase() === '#20201e' || value.name.toLowerCase().includes('đen') ? '#fff' : '#20201e' }} />}</button>)}</div><div className="studio-option-label">Size <span>{stock > 0 ? `Còn ${stock} áo` : 'Tạm hết'}</span></div><div className="studio-size-list">{product.sizes.map(value => <button key={value} className={project.size === value ? 'active' : ''} onClick={() => changeProject({ size: value })}>{value}</button>)}</div><SizeAdvisor product={product} color={project.color} selectedSize={project.size} onApply={size => { changeProject({ size }); setQuantity(1); }} remainingStock={size => Math.max(0, (product.variants.find(value => value.size === size && value.color === project.color)?.stock || 0) - cart.filter(item => item.productId === product.id && item.size === size && item.color === project.color).reduce((sum, item) => sum + item.quantity, 0))} /><label className="form-field">Khổ in · {SIDE_LABELS[side].toLowerCase()}<select className="input" value={face.area} onChange={event => changeProject({ faces: { ...project.faces, [side]: { ...face, area: event.target.value as PrintArea } } })}>{Object.entries(AREA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>
        {layer && <LayerInspector fonts={project.fonts} layer={layer} update={updateLayer} duplicate={duplicate} remove={remove} reorder={reorder} />}
        <section className="studio-price"><div className="studio-section-heading"><h2>Giá áo & phí in</h2>{data?.mode === 'local' && <span>Giá thử nghiệm</span>}</div><div><span>Phôi áo</span><strong><ProductPrice product={product} /></strong></div>{price.lines.map((line, index) => <div key={index}><span>{line.label}</span><strong>{money(line.amount)}</strong></div>)}{!hasArt && <p>Chưa có phụ phí in. Thêm thiết kế để tính giá.</p>}<div className="studio-price-total"><span>Mỗi chiếc</span><strong>{money(price.unitPrice)}</strong></div><div className="studio-quantity-row"><span>Số lượng</span><Quantity value={quantity} max={Math.min(99, stock)} disabled={!!busy || stock === 0} onChange={setQuantity} /></div><div className="studio-price-subtotal"><span>Tạm tính · chưa gồm giao hàng</span><strong>{money(price.unitPrice * quantity)}</strong></div><ErrorText>{error}</ErrorText><button className="button-secondary full-width" onClick={() => setPreview(true)}><Eye size={18} />Xem trước hai mặt</button><button className="button full-width" onClick={() => void persist('cart')} disabled={!!busy || !hasArt || stock < quantity}>{busy === 'cart' ? 'Đang thêm…' : 'Thêm áo vào giỏ'}<ArrowRight size={18} /></button><p className="field-help">Bản xem trước 2D giúp bạn kiểm tra bố cục. Màu và kích thước in thực tế cần được shop xác nhận. Phụ phí tính riêng cho mỗi mặt có in.</p></section>
      </aside>
    </main>
    <Dialog open={preview} onClose={() => setPreview(false)} title="Xem trước hai mặt áo" className="studio-preview-dialog"><div className="studio-preview-grid">{(['front', 'back'] as DesignSide[]).map(value => <figure key={value}><img src={svgDataUrl(renderShirtSvg(project, hex, value))} alt={SIDE_LABELS[value]} /><figcaption>{SIDE_LABELS[value]} · {project.faces[value].layers.filter(item => !item.hidden).length ? 'Có in' : 'Áo trơn'}</figcaption></figure>)}</div><p>{project.name} · {product.name} · {project.color} / {project.size}</p><div className="studio-preview-actions"><button className="button-secondary" onClick={download}><Download size={17} />Tải SVG {SIDE_LABELS[side].toLowerCase()}</button><button className="button" onClick={() => setPreview(false)}>Tiếp tục thiết kế</button></div></Dialog>
  </div>;
}
