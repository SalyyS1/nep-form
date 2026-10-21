import type { TextEffects, TextShadow } from './custom-types';
export const DEFAULT_TEXT_EFFECTS: Readonly<TextEffects>;
export function normalizedTextEffects(input?: Partial<Omit<TextEffects,'shadow'>> & { shadow?: Partial<TextShadow> }): TextEffects;
