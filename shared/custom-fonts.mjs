import { isBuiltinFont } from './builtin-font-catalog.mjs';
export const FONT_FILE_LIMIT = 512 * 1024;
export const FONT_TOTAL_LIMIT = 1024 * 1024;
export const FONT_COUNT_LIMIT = 3;
export const FONT_ID_PATTERN = /^[a-z0-9-]{1,80}$/i;
export const FONT_DATA_PATTERN = /^data:font\/(ttf|otf|woff|woff2);base64,([A-Za-z0-9+/]+={0,2})$/;
export function fontCssFamily(value) {
  if (['Be Vietnam Pro', 'serif', 'monospace'].includes(value)) return value;
  if (isBuiltinFont(value)) return `nep-builtin-${value.slice(8)}`;
  if (typeof value === 'string' && value.startsWith('custom:') && FONT_ID_PATTERN.test(value.slice(7))) return `nep-custom-${value.slice(7)}`;
  return 'Be Vietnam Pro';
}
export function customFontStyles(fonts = []) {
  const formats = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
  return (Array.isArray(fonts) ? fonts : []).filter(font => font && typeof font.id === 'string' && FONT_ID_PATTERN.test(font.id) && typeof font.dataUrl === 'string' && FONT_DATA_PATTERN.test(font.dataUrl)).map(font => {
    const type = font.dataUrl.match(FONT_DATA_PATTERN)[1];
    return `@font-face{font-family:nep-custom-${font.id};src:url(${font.dataUrl}) format('${formats[type]}');font-style:normal;font-weight:100 900;}`;
  }).join('');
}
