import type { DesignProject } from '../../../shared/custom-types';
import { createTemplateLayers, DESIGN_TEMPLATES } from '../../../shared/design-template-catalog.mjs';

const showcaseIds = ['own', 'retro-slow', 'afterhours', 'cat-day', 'wildflower', 'weekend'];
const styleNames: Record<string, string> = { minimal: 'Tối giản', retro: 'Retro', street: 'Đường phố', cute: 'Dễ thương', nature: 'Thiên nhiên', travel: 'Du lịch' };
export const homeTemplates = showcaseIds.map(id => {
  const template = DESIGN_TEMPLATES.find(item => item.id === id)!;
  return { ...template, styleName: styleNames[template.style] };
});
export function homeTemplateProject(id: string): DesignProject {
  const template = homeTemplates.find(item => item.id === id)!;
  let layerId = 0;
  return { version: 1, name: template.name, productId: 'custom-classic', color: 'Kem', size: 'M', faces: {
    front: { area: 'medium', layers: createTemplateLayers(id, () => `${id}-front-${layerId++}`) },
    back: { area: 'large', layers: createTemplateLayers(id, () => `${id}-back-${layerId++}`) },
  } };
}
// Register the catalog's embedded font CSS once before rendering the SVG previews.
export const homeTemplateFontProject = homeTemplateProject('own');
homeTemplateFontProject.faces.front.layers = homeTemplates.flatMap(template => {
  let layerId = 0;
  return createTemplateLayers(template.id, () => `font-${template.id}-${layerId++}`);
});

export const shirtColors = [{ name: 'Kem', hex: '#ede8dd' }, { name: 'Đen', hex: '#292b28' }, { name: 'Xanh rêu', hex: '#89927e' }];
export function homeDesign(dark = false): DesignProject {
  const ink = dark ? '#f1ece0' : '#644535';
  return { version: 1, name: 'Chậm một nhịp', productId: 'custom-classic', color: 'Kem', size: 'M', faces: {
    front: { area: 'medium', layers: [
      { id: 'first-line', kind: 'text', text: 'chậm', fontFamily: 'serif', fontWeight: 400, x: 49, y: 84, width: 202, height: 69, rotation: -5, fill: ink, opacity: 1 },
      { id: 'second-line', kind: 'text', text: 'một nhịp.', fontFamily: 'serif', fontWeight: 400, x: 29, y: 150, width: 242, height: 57, rotation: -5, fill: ink, opacity: 1 },
      { id: 'signature', kind: 'text', text: 'CỨ LÀ MÌNH. / NẾP STUDIO', fontFamily: 'Be Vietnam Pro', fontWeight: 400, x: 60, y: 238, width: 180, height: 13, rotation: 0, fill: ink, opacity: 1 },
    ] },
    back: { area: 'large', layers: [
      { id: 'back-text', kind: 'text', text: 'CỨ LÀ\nMÌNH.', fontFamily: 'Be Vietnam Pro', fontWeight: 700, x: 35, y: 90, width: 230, height: 115, rotation: 0, fill: ink, opacity: 1 },
      { id: 'back-caption', kind: 'text', text: 'VỪA VẶN THEO CÁCH RIÊNG.', fontFamily: 'Be Vietnam Pro', fontWeight: 400, x: 50, y: 235, width: 200, height: 14, rotation: 0, fill: ink, opacity: 1 },
    ] },
  } };
}
export function blankHomeDesign() { const project = homeDesign(); project.faces.front.layers = []; project.faces.back.layers = []; return project; }
