import { fail } from './common.mjs';
import { normalizedTextEffects } from '../shared/text-effects.mjs';

export function validateTextEffects(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400,'Hiệu ứng chữ không hợp lệ.','INVALID_TEXT_EFFECTS');
  const numeric = (value,min,max) => value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max);
  const color = value => value === undefined || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value));
  if (!numeric(input.curve,-100,100) || !numeric(input.outlineWidth,0,10) || !color(input.outlineColor)) fail(400,'Độ cong hoặc viền chữ không hợp lệ.','INVALID_TEXT_EFFECTS');
  if (input.shadow !== undefined) {
    const shadow = input.shadow;
    if (!shadow || typeof shadow !== 'object' || Array.isArray(shadow) || (shadow.enabled !== undefined && typeof shadow.enabled !== 'boolean') || !color(shadow.color) || !numeric(shadow.opacity,0,1) || !numeric(shadow.blur,0,12) || !numeric(shadow.offsetX,-20,20) || !numeric(shadow.offsetY,-20,20)) fail(400,'Đổ bóng chữ không hợp lệ.','INVALID_TEXT_EFFECTS');
  }
  return normalizedTextEffects(input);
}
