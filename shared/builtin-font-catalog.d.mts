export interface BuiltinFont { value: string; label: string; group: string }
export const BUILTIN_FONTS: BuiltinFont[];
export function isBuiltinFont(value?: string): boolean;
