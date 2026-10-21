import { create } from 'fontkit';
import { fail, string } from './common.mjs';
import { FONT_COUNT_LIMIT, FONT_DATA_PATTERN, FONT_FILE_LIMIT, FONT_ID_PATTERN, FONT_TOTAL_LIMIT } from '../shared/custom-fonts.mjs';

export function validateCustomFonts(input = []) {
  if (!Array.isArray(input) || input.length > FONT_COUNT_LIMIT) fail(400, 'Mỗi thiết kế tối đa 3 phông riêng.', 'INVALID_FONT');
  let total = 0;
  const ids = new Set();
  return input.map(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !FONT_ID_PATTERN.test(value.id) || ids.has(value.id)) fail(400, 'Mã phông không hợp lệ hoặc bị trùng.', 'INVALID_FONT');
    ids.add(value.id);
    if (typeof value.dataUrl !== 'string' || value.dataUrl.length > Math.ceil(FONT_FILE_LIMIT / 3) * 4 + 40) fail(400, 'Mỗi phông tối đa 512 KB.', 'INVALID_FONT');
    const match = value.dataUrl.match(FONT_DATA_PATTERN);
    if (!match) fail(400, 'Chỉ nhận phông TTF, OTF, WOFF hoặc WOFF2.', 'INVALID_FONT');
    const bytes = Buffer.from(match[2], 'base64'); total += bytes.length;
    if (bytes.toString('base64') !== match[2] || bytes.length < 32 || bytes.length > FONT_FILE_LIMIT || total > FONT_TOTAL_LIMIT) fail(400, 'Dữ liệu phông không hợp lệ; tổng phông tối đa 1 MB.', 'INVALID_FONT');
    const signature = bytes.toString('ascii', 0, 4);
    const correct = { ttf: bytes.readUInt32BE(0) === 0x00010000, otf: signature === 'OTTO', woff: signature === 'wOFF', woff2: signature === 'wOF2' };
    if (!correct[match[1]]) fail(400, 'Nội dung không khớp định dạng phông.', 'INVALID_FONT');
    try {
      if (match[1].startsWith('woff') && (bytes.readUInt32BE(8) !== bytes.length || bytes.readUInt32BE(16) < 32 || bytes.readUInt32BE(16) > 8 * 1024 * 1024 || bytes.readUInt16BE(12) < 1 || bytes.readUInt16BE(12) > 128)) throw new Error('Invalid font container');
      const font = create(bytes);
      if (!Number.isInteger(font.numGlyphs) || font.numGlyphs < 2 || font.numGlyphs > 32768 || !font.characterSet.length || !Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) throw new Error('Invalid font metrics');
      // Force lazy cmap/layout/outline reads rather than trusting only the file signature.
      const run = font.layout('Nếp áo ABC 0123');
      if (!run.glyphs.length) throw new Error('Empty font');
      for (const glyph of run.glyphs) glyph.path.toSVG();
    } catch { fail(400, 'Không đọc được phông chữ. Hãy chọn file phông hợp lệ.', 'INVALID_FONT'); }
    return { id: value.id, name: string(value.name, 'Tên phông', 100), dataUrl: value.dataUrl };
  });
}
