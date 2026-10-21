import { useState } from 'react';
import { STICKERS } from '../../../shared/sticker-catalog.mjs';
import { matchesStudioSearch, STUDIO_STYLES } from '../../../shared/studio-style-catalog.mjs';
import { renderLayerSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignLayer } from '../../../shared/custom-types';
import { makeLayer } from './studio-project';
import { StudioLibraryFilters } from './studio-library-filters';

export function StudioStickerBrowser({ add, busy }: { add: (kind: DesignLayer['kind'], patch?: Partial<DesignLayer>) => void; busy: boolean }) {
  const [query, setQuery] = useState(''); const [style, setStyle] = useState(''); const [shown, setShown] = useState(12);
  const filtered = STICKERS.filter(item => matchesStudioSearch(item, query, style));
  return <><h2>Ghép thành dấu riêng.</h2><p>48 sticker, 6 phong cách. Chọn rồi đổi màu, xoay và phối cùng chữ.</p><StudioLibraryFilters label="Tìm sticker" query={query} style={style} onQuery={value => { setQuery(value); setShown(12); }} onStyle={value => { setStyle(value); setShown(12); }} /><div className="studio-library-results">{filtered.length} sticker{style ? ` · ${STUDIO_STYLES.find(item => item.id === style)?.label}` : ''}</div><div className="studio-shape-grid studio-sticker-gallery">
    {filtered.slice(0, shown).map(sticker => { const fill = STUDIO_STYLES.find(item => item.id === sticker.style)!.color; return <button type="button" disabled={busy} key={sticker.id} aria-label={sticker.name} onClick={() => add('shape', { shape: sticker.id, x: 75, width: 150, height: 150, fill })}><img alt="" loading="lazy" src={svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">${renderLayerSvg(makeLayer('shape', { shape: sticker.id, x: 20, y: 20, width: 110, height: 110, fill }))}</svg>`)} /><span>{sticker.name}</span></button>; })}
    {!filtered.length && <p className="studio-library-empty">Chưa có sticker khớp từ khóa. Thử tên khác hoặc chọn Tất cả nhé.</p>}
    {shown < filtered.length && <button type="button" className="studio-library-more" onClick={() => setShown(shown + 12)}>Xem thêm {Math.min(12, filtered.length - shown)} sticker</button>}
  </div></>;
}
