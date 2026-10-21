import type { DesignLayer } from './custom-types';
export interface StudioTemplate { id: string; name: string; style: string; background: string; tags: string; layers: Omit<DesignLayer,'id'|'opacity'>[] }
export const DESIGN_TEMPLATES: StudioTemplate[];
export function createTemplateLayers(id: string, makeId?: () => string): DesignLayer[];
export function recolorTemplateLayers(layers: DesignLayer[], palette: string[]): DesignLayer[];
