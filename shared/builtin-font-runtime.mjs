import { isBuiltinFont } from './builtin-font-catalog.mjs';
const styles = new Map();
export function registerBuiltinFont(value, css) { if (isBuiltinFont(value) && typeof css === 'string') styles.set(value, css); }
export function hasBuiltinFont(value) { return styles.has(value); }
export function builtinFontStyles(values) { return [...new Set(values)].map(value => styles.get(value) || '').join(''); }
