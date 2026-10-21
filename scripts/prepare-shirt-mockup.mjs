import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Asset-sheet integration only: preserve the supplied garment pixels and alpha.
const source = process.argv[2];
if (!source) throw new Error('Pass the front/back transparent mockup sheet path.');
const metadata = await sharp(source).metadata();
const half = Math.floor(metadata.width / 2);
const sources = {};
for (const [index, side] of ['front', 'back'].entries()) {
  const file = resolve(`public/images/nep-cotton-${side}-v2.webp`);
  await sharp(source).extract({ left: index * half, top: 0, width: half, height: metadata.height }).resize({ width: 600 }).webp({ quality: 85, alphaQuality: 100 }).toFile(file);
  sources[side] = `data:image/webp;base64,${readFileSync(file).toString('base64')}`;
}
writeFileSync('shared/shirt-mockup-data.mjs', '// Generated garment cutouts; see data/shirt-mockup-manifest.json.\nexport const SHIRT_MOCKUPS = ' + JSON.stringify(sources) + ';\n');
console.log('Prepared two transparent garment cutouts and self-contained SVG sources.');
