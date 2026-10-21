import { readFileSync } from 'node:fs';
import { BUILTIN_FONTS } from '../shared/builtin-font-catalog.mjs';
import { registerBuiltinFont } from '../shared/builtin-font-runtime.mjs';

// Server previews always have all local fonts. Browser loads only used SVG font data.
for (const font of BUILTIN_FONTS.filter(font => font.value.startsWith('builtin:'))) {
  const id = font.value.slice(8);
  const data = readFileSync(new URL(`../public/fonts/studio/${id}.woff2`, import.meta.url)).toString('base64');
  registerBuiltinFont(font.value, `@font-face{font-family:nep-builtin-${id};font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${data}) format('woff2');}`);
}
