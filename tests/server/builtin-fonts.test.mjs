import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { create } from 'fontkit';
import { BUILTIN_FONTS } from '../../shared/builtin-font-catalog.mjs';

const letters = 'ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ';
test('all 15 bundled typefaces contain complete Vietnamese upper/lower glyphs and license files', async () => {
  assert.equal(BUILTIN_FONTS.length, 15);
  for (const entry of BUILTIN_FONTS) {
    const builtin = entry.value.startsWith('builtin:');
    const path = builtin ? `studio/${entry.value.slice(8)}.woff2` : 'be-vietnam-pro-400.woff2';
    const font = create(await readFile(new URL(`../../public/fonts/${path}`, import.meta.url)));
    for (const character of letters + letters.toLowerCase()) assert.ok(font.hasGlyphForCodePoint(character.codePointAt(0)), `${entry.label}: ${character}`);
    assert.ok(font.layout('Nếp riêng, chất mình.').glyphs.every(glyph => glyph.id > 0), entry.label);
    const license = await readFile(new URL(`../../public/fonts/${builtin ? `studio/${entry.value.slice(8)}-ofl.txt` : 'OFL.txt'}`, import.meta.url), 'utf8');
    assert.match(license, /SIL OPEN FONT LICENSE/i);
  }
});
