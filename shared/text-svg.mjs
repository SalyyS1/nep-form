import { fontCssFamily } from './custom-fonts.mjs';
import { normalizedTextEffects } from './text-effects.mjs';

const xml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[char]);
const rounded = value => Math.round(value * 1000) / 1000;
// Hex-encoded Unicode IDs avoid both XML/CSS injection and collisions from replacing punctuation.
const safeId = value => 'nep-text-' + Array.from(String(value ?? '')).map(char => char.codePointAt(0).toString(16)).join('-');
export function renderTextSvg(layer, width, height) {
  const effects = normalizedTextEffects(layer.textEffects), shadow = effects.shadow;
  const rows = String(layer.text ?? '').split('\n').slice(0,6);
  const id = safeId(layer.id), rowHeight = height / rows.length;
  const sag = Math.abs(effects.curve) / 100 * rowHeight * .48;
  const fontSize = Math.min(effects.curve ? (rowHeight - sag) / 1.35 : height / (rows.length * 1.25),96);
  const font = fontCssFamily(layer.fontFamily);
  const attrs = `text-anchor="middle" font-family="${font}" font-weight="${layer.fontWeight === 400 ? 400 : 700}" font-size="${effects.curve ? rounded(fontSize) : fontSize}"`;
  const paint = effects.outlineWidth ? ` stroke="${effects.outlineColor}" stroke-width="${rounded(effects.outlineWidth * 2)}" stroke-linejoin="round" paint-order="stroke fill"` : '';
  const defs = [];
  const text = rows.map((row,index) => {
    // Keep the legacy text geometry exactly when curve is off, including multiline positioning.
    const length = effects.curve ? rounded(Math.min(width,Array.from(row).length * fontSize * .64)) : Math.min(width,row.length * fontSize * .64);
    if (!effects.curve) return `<text x="${width / 2}" y="${fontSize * (index + .85) * 1.25}" ${attrs}${paint} textLength="${length}" lengthAdjust="spacingAndGlyphs">${xml(row)}</text>`;
    const baseline = index * rowHeight + fontSize * 1.07 + (effects.curve > 0 ? sag : 0);
    const control = baseline + (effects.curve > 0 ? -2 * sag : 2 * sag);
    const pathId = `${id}-line-${index}`;
    defs.push(`<path id="${pathId}" d="M0 ${rounded(baseline)} Q${rounded(width / 2)} ${rounded(control)} ${rounded(width)} ${rounded(baseline)}"/>`);
    // Supply both SVG2 and SVG1 fragment references for browser/editor compatibility.
    return `<text ${attrs}${paint}><textPath href="#${pathId}" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#${pathId}" startOffset="50%" textLength="${length}" lengthAdjust="spacingAndGlyphs">${xml(row)}</textPath></text>`;
  }).join('');
  if (shadow.enabled && shadow.opacity > 0) {
    const pad = effects.outlineWidth + Math.max(Math.abs(shadow.offsetX),Math.abs(shadow.offsetY)) + shadow.blur * 3 + 3;
    defs.push(`<filter id="${id}-shadow" filterUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${width + pad * 2}" height="${height + pad * 2}" color-interpolation-filters="sRGB"><feDropShadow dx="${shadow.offsetX}" dy="${shadow.offsetY}" stdDeviation="${shadow.blur / 2}" flood-color="${shadow.color}" flood-opacity="${shadow.opacity}"/></filter>`);
  }
  return `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}<g${shadow.enabled && shadow.opacity > 0 ? ` filter="url(#${id}-shadow)"` : ''}>${text}</g>`;
}
