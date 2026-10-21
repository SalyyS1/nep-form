import { useMemo, useState } from 'react';
import { DESIGN_TEMPLATES, createTemplateLayers, type StudioTemplate } from '../../../shared/design-template-catalog.mjs';
import { matchesStudioSearch, STUDIO_STYLES } from '../../../shared/studio-style-catalog.mjs';
import { renderArtworkSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignLayer, DesignProject, DesignSide } from '../../../shared/custom-types';
import { StudioLibraryFilters } from './studio-library-filters';
import { useBuiltinDesignFonts } from './use-builtin-design-fonts';
import { StudioTemplatePreview } from './studio-template-preview';

interface Props { project: DesignProject; side: DesignSide; color: string; busy: boolean; apply: (layers: DesignLayer[], replace: boolean) => boolean }
function TemplateCard({ template, open, busy }: { template: StudioTemplate; open: () => void; busy: boolean }) {
  const project = useMemo<DesignProject>(() => ({ version: 1, name: template.name, productId: '', color: '', size: '', faces: { front: { area: 'medium', layers: createTemplateLayers(template.id) }, back: { area: 'medium', layers: [] } } }), [template]);
  const fonts = useBuiltinDesignFonts(project);
  return <button type="button" className="studio-template-card" aria-label={template.name} onClick={open} disabled={busy}><span className="studio-template-art" style={{background:template.background}}><img loading="lazy" src={svgDataUrl(renderArtworkSvg(project))} alt="" /><span className="studio-template-open">{fonts.loading ? 'Đang tải chữ…' : 'Xem & chỉnh'}</span></span><span className="studio-template-card-caption"><strong>{template.name}</strong><small>{STUDIO_STYLES.find(item => item.id === template.style)?.label} · {template.layers.length} lớp</small></span></button>;
}
export function StudioTemplateBrowser({ project, side, color, busy, apply }: Props) {
  const [query, setQuery] = useState(''); const [style, setStyle] = useState(''); const [shown, setShown] = useState(8); const [selected, setSelected] = useState<StudioTemplate | null>(null);
  const filtered = DESIGN_TEMPLATES.filter(item => matchesStudioSearch(item, query, style));
  return <><h2>Chọn một nét, sửa thành mình.</h2><p>24 mẫu áo có sẵn. Xem trước, đổi chữ và màu rồi đưa lên áo.</p><StudioLibraryFilters label="Tìm mẫu thiết kế" query={query} style={style} onQuery={value => { setQuery(value); setShown(8); }} onStyle={value => { setStyle(value); setShown(8); }} /><div className="studio-library-results">{filtered.length} mẫu thiết kế</div><div className="studio-template-gallery">{filtered.slice(0,shown).map(template => <TemplateCard key={template.id} template={template} open={() => setSelected(template)} busy={busy} />)}{!filtered.length && <p className="studio-library-empty">Chưa có mẫu khớp từ khóa. Thử phong cách khác nhé.</p>}{shown < filtered.length && <button type="button" className="studio-library-more" onClick={() => setShown(shown + 8)}>Xem thêm {Math.min(8,filtered.length - shown)} mẫu</button>}</div>{selected && <StudioTemplatePreview key={selected.id} template={selected} project={project} side={side} color={color} busy={busy} close={() => setSelected(null)} apply={apply} />}</>;
}
