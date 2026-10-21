import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCustomFonts } from '../../server/custom-font-validation.mjs';
import { customFontStyles, fontCssFamily } from '../../shared/custom-fonts.mjs';

const ttf = await readFile(new URL('../../public/fonts/lora-italic-400.ttf', import.meta.url));
const woff2 = await readFile(new URL('../../public/fonts/be-vietnam-pro-400.woff2', import.meta.url));
const font = (buffer = ttf, format = 'ttf', id = 'my-font') => ({ id, name: 'Phông riêng', dataUrl: `data:font/${format};base64,${buffer.toString('base64')}` });
test('real TTF and WOFF2 parse and generate self-contained safe CSS families', () => {
  const fonts = validateCustomFonts([font(), font(woff2, 'woff2', 'vietnamese')]);
  assert.equal(fonts.length, 2);
  assert.ok(customFontStyles(fonts).includes(ttf.toString('base64')));
  assert.ok(customFontStyles(fonts).includes('font-family:nep-custom-vietnamese'));
  assert.equal(fontCssFamily('custom:my-font'), 'nep-custom-my-font');
  assert.equal(fontCssFamily('custom:x;}body{display:none'), 'Be Vietnam Pro');
  assert.equal(customFontStyles([{ ...font(), id: undefined }]), '');
});
test('fonts reject malformed containers, mismatched MIME, unsafe IDs and resource excess', () => {
  const invalid = [null, {}, [{ ...font(), id: undefined }], [{ ...font(), id: 'x;}body{color:red' }], [font(), font()], [font(ttf, 'woff2')], [font(Buffer.alloc(60))], [font(Buffer.alloc(513 * 1024))], Array.from({ length: 4 }, (_, i) => font(ttf, 'ttf', `font-${i}`))];
  const truncated = woff2.subarray(0, 40);
  invalid.push([font(truncated, 'woff2')]);
  const expanded = Buffer.from(woff2); expanded.writeUInt32BE(32 * 1024 * 1024, 16);
  invalid.push([font(expanded, 'woff2')]);
  // Valid sfnt bytes with padding exceed the combined budget even below the per-file cap.
  const padded = Buffer.concat([ttf, Buffer.alloc(Math.max(0, 400 * 1024 - ttf.length))]);
  invalid.push(Array.from({ length: 3 }, (_, i) => font(padded, 'ttf', `font-${i}`)));
  for (const input of invalid) assert.throws(() => validateCustomFonts(input), error => error.status === 400 && error.code === 'INVALID_FONT');
});
