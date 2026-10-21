import { STICKERS } from './sticker-catalog.mjs';
import { STICKER_PATHS } from './sticker-paths.mjs';
import { FONT_STYLE } from './custom-font-data.mjs';
import { SHIRT_MOCKUPS } from './shirt-mockup-data.mjs';
import { customFontStyles } from './custom-fonts.mjs';
import { renderTextSvg } from './text-svg.mjs';
import { builtinFontStyles } from './builtin-font-runtime.mjs';
export const DEFAULT_PRICING = Object.freeze({ version: 1, text: 35000, shape: 55000, image: 65000, areas: { small: 0, medium: 25000, large: 45000 }, extraLayer: 8000 });
export const SHAPES = STICKERS.map(sticker => sticker.id);
export const SIDE_LABELS = { front: 'Mặt trước', back: 'Mặt sau' };
export const AREA_LABELS = { small: 'Nhỏ · 15 × 18 cm', medium: 'Vừa · 22 × 26 cm', large: 'Lớn · 28 × 34 cm' };
export const PRINT_REGIONS = {
  small: { x: 225, y: 195, width: 150, height: 180 },
  medium: { x: 190, y: 175, width: 220, height: 264 },
  large: { x: 160, y: 160, width: 280, height: 336 },
};
export function calculateCustomPrice(project, basePrice, pricing = DEFAULT_PRICING) {
  const lines = [];
  for (const face of ['front', 'back']) {
    const design = project.faces[face];
    const visible = design.layers.filter(layer => !layer.hidden);
    if (!visible.length) continue;
    const typeFee = Math.max(...visible.map(layer => pricing[layer.kind]));
    lines.push({ face, label: `${SIDE_LABELS[face]} · nội dung in`, amount: typeFee });
    if (pricing.areas[design.area]) lines.push({ face, label: `${SIDE_LABELS[face]} · khổ ${AREA_LABELS[design.area].split(' · ')[0].toLowerCase()}`, amount: pricing.areas[design.area] });
    if (visible.length > 1 && pricing.extraLayer) lines.push({ face, label: `${SIDE_LABELS[face]} · ${visible.length - 1} lớp thêm`, amount: (visible.length - 1) * pricing.extraLayer });
  }
  const surcharge = lines.reduce((sum, line) => sum + line.amount, 0);
  return { basePrice, surcharge, unitPrice: basePrice + surcharge, lines };
}
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const color = value => /^#[0-9a-f]{6}$/i.test(value) ? value : '#20201e';
export function renderLayerSvg(layer) {
  if (layer.hidden) return '';
  const w = Math.max(1, number(layer.width, 100)), h = Math.max(1, number(layer.height, 60));
  let content = '';
  if (layer.kind === 'text') {
    content = renderTextSvg(layer, w, h);
  } else if (layer.kind === 'shape') content = `<svg width="${w}" height="${h}" viewBox="0 0 100 100" overflow="visible">${STICKER_PATHS[layer.shape] ?? STICKER_PATHS.star}</svg>`;
  else if (layer.kind === 'image' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(layer.src ?? '')) content = `<image width="${w}" height="${h}" href="${escapeXml(layer.src)}" preserveAspectRatio="xMidYMid meet"/>`;
  return `<g transform="translate(${number(layer.x)} ${number(layer.y)}) rotate(${number(layer.rotation)} ${w / 2} ${h / 2})" fill="${color(layer.fill)}" color="${color(layer.fill)}" opacity="${Math.min(1, Math.max(0, number(layer.opacity, 1)))}">${content}</g>`;
}
export function renderArtworkSvg(project, face = 'front') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1080" viewBox="0 0 300 360"><title>${escapeXml(project.name)} — ${SIDE_LABELS[face]}</title><style>${projectFontStyles(project, face)}</style>${project.faces[face].layers.map(renderLayerSvg).join('')}</svg>`;
}
function projectFontStyles(project, face) {
  const used = new Set(project.faces[face].layers.filter(layer => layer.kind === 'text' && !layer.hidden).map(layer => layer.fontFamily));
  return FONT_STYLE + builtinFontStyles(used) + customFontStyles(project.fonts);
}
export function renderShirtSvg(project, colorHex = '#f4f0e6', face = 'front') {
  const region = PRINT_REGIONS[project.faces[face].area];
  const garment = color(colorHex);
  const texture = SHIRT_MOCKUPS[face];
  // The same print coordinates serve Studio hit targets and private order previews.
  // An alpha mask supplies garment shape; its normalized weave multiplies the chosen color.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="680" viewBox="0 0 600 680" role="img"><title>${escapeXml(project.name)} — ${SIDE_LABELS[face]}</title><style>${projectFontStyles(project, face)}</style><defs><mask id="garment-alpha" mask-type="alpha" x="0" y="0" width="600" height="680"><image href="${texture}" width="600" height="680" preserveAspectRatio="xMidYMid meet"/></mask><filter id="cotton-light" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="1.13"/><feFuncG type="linear" slope="1.15"/><feFuncB type="linear" slope="1.18"/></feComponentTransfer></filter></defs><g mask="url(#garment-alpha)" style="isolation:isolate"><rect width="600" height="680" fill="${garment}"/><image href="${texture}" width="600" height="680" preserveAspectRatio="xMidYMid meet" filter="url(#cotton-light)" style="mix-blend-mode:multiply"/></g><svg x="${region.x}" y="${region.y}" width="${region.width}" height="${region.height}" viewBox="0 0 300 360" overflow="hidden"><g opacity=".94">${project.faces[face].layers.map(renderLayerSvg).join('')}</g></svg></svg>`;
}
export function svgDataUrl(svg) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
