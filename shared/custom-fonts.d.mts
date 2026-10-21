import type { DesignFont } from './custom-types';
export const FONT_FILE_LIMIT: number;
export const FONT_TOTAL_LIMIT: number;
export const FONT_COUNT_LIMIT: number;
export const FONT_ID_PATTERN: RegExp;
export const FONT_DATA_PATTERN: RegExp;
export function fontCssFamily(value?: string): string;
export function customFontStyles(fonts?: DesignFont[]): string;
