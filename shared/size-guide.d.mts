export interface SizeChartRow { size: string; height: [number, number]; weight: [number, number] }
export interface SizeSuggestion { size: string | null; reason: string; kind: 'invalid' | 'outside' | 'unavailable' | 'check' | 'match' }
export const SHIRT_SIZE_CHART: SizeChartRow[];
export function suggestShirtSize(height: number, weight: number, sizes: string[]): SizeSuggestion;
