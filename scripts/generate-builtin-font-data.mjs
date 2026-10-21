import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { BUILTIN_FONTS } from '../shared/builtin-font-catalog.mjs';

const manifest = JSON.parse(readFileSync(new URL('../data/studio-font-manifest.json', import.meta.url), 'utf8'));
const data = Object.fromEntries(manifest.fonts.map(font => {
  if (!BUILTIN_FONTS.some(value => value.value === `builtin:${font.id}`)) throw new Error(`Unknown font ${font.id}`);
  const bytes = readFileSync(new URL(`../public${font.path}`, import.meta.url));
  return [`builtin:${font.id}`, `@font-face{font-family:nep-builtin-${font.id};font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');}`];
}));
mkdirSync(new URL('../shared/builtin-font-data/', import.meta.url), { recursive: true });
for (const [value, css] of Object.entries(data)) writeFileSync(new URL(`../shared/builtin-font-data/${value.slice(8)}.mjs`, import.meta.url), '// Generated from licensed local font assets.\nexport default ' + JSON.stringify(css) + ';\n');
writeFileSync(new URL('../src/styles/builtin-fonts.css', import.meta.url), manifest.fonts.map(font => `@font-face{font-family:nep-builtin-${font.id};font-style:normal;font-weight:400;font-display:swap;src:url('${font.path}') format('woff2')}`).join('\n') + '\n');
console.log(`Generated ${manifest.fonts.length} bundled font styles.`);
