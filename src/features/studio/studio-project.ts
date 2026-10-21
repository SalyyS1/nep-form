import type { DesignLayer, DesignProject } from '../../../shared/custom-types';
import type { Product } from '../../lib/types';

export const DRAFT_KEY = 'nep-studio-draft-v1';
export function newProject(product: Product): DesignProject {
  return { version: 1, name: 'Chiếc áo của tôi', productId: product.id, color: product.colors[0].name, size: product.sizes.includes('M') ? 'M' : product.sizes[0], faces: { front: { area: 'medium', layers: [] }, back: { area: 'medium', layers: [] } } };
}
export function readDraft(products: Product[]): DesignProject {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (draft?.version === 1 && products.some(product => product.id === draft.productId) && draft.faces?.front?.layers && draft.faces?.back?.layers) return draft;
  } catch { /* An unavailable or outdated draft should not prevent opening the editor. */ }
  return newProject(products[0]);
}
export function makeLayer(kind: DesignLayer['kind'], overrides: Partial<DesignLayer> = {}): DesignLayer {
  return { id: crypto.randomUUID(), kind, x: 40, y: 60, width: 220, height: kind === 'text' ? 60 : 160, rotation: 0, fill: '#20201e', opacity: 1, ...(kind === 'text' ? { text: 'CHẤT RIÊNG', fontFamily: 'Be Vietnam Pro', fontWeight: 700 } : { shape: 'star' }), ...overrides };
}
export async function prepareUpload(file: File): Promise<{ src: string; ratio: number }> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Chọn ảnh PNG, JPG hoặc WebP nhé.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh gốc tối đa 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh dưới 40 triệu điểm ảnh.');
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt chưa hỗ trợ xử lý ảnh.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { src: canvas.toDataURL('image/webp', .88), ratio: bitmap.width / bitmap.height };
  } finally { bitmap.close(); }
}
