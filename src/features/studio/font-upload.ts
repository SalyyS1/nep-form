import type { DesignFont } from '../../../shared/custom-types';
import { FONT_COUNT_LIMIT, FONT_FILE_LIMIT, FONT_TOTAL_LIMIT, fontCssFamily } from '../../../shared/custom-fonts.mjs';

export async function readFontUpload(file: File, fonts: DesignFont[]): Promise<DesignFont> {
  const format = file.name.split('.').pop()?.toLowerCase();
  if (!format || !['ttf', 'otf', 'woff', 'woff2'].includes(format)) throw new Error('Chọn phông TTF, OTF, WOFF hoặc WOFF2.');
  if (fonts.length >= FONT_COUNT_LIMIT) throw new Error('Mỗi thiết kế tối đa 3 phông riêng.');
  if (!file.size || file.size > FONT_FILE_LIMIT) throw new Error('Mỗi file phông tối đa 512 KB.');
  const existingBytes = fonts.reduce((sum, font) => sum + (font.dataUrl.split(',')[1]?.length || 0) * .75, 0);
  if (existingBytes + file.size > FONT_TOTAL_LIMIT) throw new Error('Tổng phông chữ trong một thiết kế tối đa 1 MB.');
  const bytes = await file.arrayBuffer();
  const id = crypto.randomUUID();
  try { await new FontFace(fontCssFamily(`custom:${id}`), bytes).load(); }
  catch { throw new Error('Không đọc được phông chữ. Hãy chọn một file phông hợp lệ.'); }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Chưa đọc được file phông.'));
    reader.onload = () => resolve(`data:font/${format};base64,${String(reader.result).split(',')[1]}`); reader.readAsDataURL(file);
  });
  return { id, name: file.name.slice(0, 100), dataUrl };
}
