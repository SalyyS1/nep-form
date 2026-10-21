import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const font = weight => readFileSync(new URL(`../public/fonts/be-vietnam-pro-${weight}.woff2`, import.meta.url)).toString('base64');
const css = [400, 700].map(weight => `@font-face{font-family:Be Vietnam Pro;font-weight:${weight};src:url(data:font/woff2;base64,${font(weight)})}`).join('');
const output = new URL('../shared/custom-font-data.mjs', import.meta.url);
writeFileSync(output, '// Generated from the bundled OFL-licensed Be Vietnam Pro fonts. Keep SVG exports self-contained.\nexport const FONT_STYLE = ' + JSON.stringify(css) + ';\n');
console.log(`Embedded licensed Vietnamese fonts: ${fileURLToPath(output)}`);
