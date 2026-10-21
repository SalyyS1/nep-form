export const DEFAULT_TEXT_EFFECTS = Object.freeze({ curve: 0, outlineWidth: 0, outlineColor: '#f7f5f0', shadow: Object.freeze({ enabled: false, color: '#20201e', opacity: .35, blur: 3, offsetX: 3, offsetY: 4 }) });
const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min,value)) : fallback;
const hex = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function normalizedTextEffects(input) {
  const value = input && typeof input === 'object' ? input : {}, shadow = value.shadow || {}, base = DEFAULT_TEXT_EFFECTS;
  return { curve: clamp(value.curve,-100,100,base.curve), outlineWidth: clamp(value.outlineWidth,0,10,base.outlineWidth), outlineColor: hex(value.outlineColor,base.outlineColor), shadow: { enabled: shadow.enabled === true, color: hex(shadow.color,base.shadow.color), opacity: clamp(shadow.opacity,0,1,base.shadow.opacity), blur: clamp(shadow.blur,0,12,base.shadow.blur), offsetX: clamp(shadow.offsetX,-20,20,base.shadow.offsetX), offsetY: clamp(shadow.offsetY,-20,20,base.shadow.offsetY) } };
}
