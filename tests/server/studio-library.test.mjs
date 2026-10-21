import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import '../../server/builtin-fonts.mjs';
import { STICKERS } from '../../shared/sticker-catalog.mjs';
import { STUDIO_STYLES, matchesStudioSearch } from '../../shared/studio-style-catalog.mjs';
import { DESIGN_TEMPLATES, createTemplateLayers, recolorTemplateLayers } from '../../shared/design-template-catalog.mjs';
import { isBuiltinFont } from '../../shared/builtin-font-catalog.mjs';
import { renderArtworkSvg, renderLayerSvg } from '../../shared/custom-core.mjs';

test('48 original sticker IDs render valid self-contained vectors, with eight per style and legacy IDs', async () => {
  assert.equal(STICKERS.length,48); assert.equal(new Set(STICKERS.map(item => item.id)).size,48);
  assert.deepEqual(STICKERS.slice(0,6).map(item => item.id),['star','heart','flower','bolt','smile','circle']);
  for (const style of STUDIO_STYLES) assert.equal(STICKERS.filter(item => item.style === style.id).length,8);
  for (const sticker of STICKERS) {
    assert.ok(sticker.path,sticker.id); assert.doesNotMatch(sticker.path,/<script|onload=|href=|url\(/i);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${renderLayerSvg({id:'x',kind:'shape',shape:sticker.id,x:0,y:0,width:100,height:100,fill:'#9b475c',opacity:1,rotation:0})}</svg>`;
    const rendered = await sharp(Buffer.from(svg)).resize(100,100).png().toBuffer();
    assert.ok(rendered.length > 200,sticker.id);
    assert.match(svg,/color="#9b475c"/);
  }
});
test('24 templates render editable bounded layers, four per style, independent IDs and recoloring', async () => {
  assert.equal(DESIGN_TEMPLATES.length,24); assert.equal(new Set(DESIGN_TEMPLATES.map(item => item.id)).size,24);
  for (const style of STUDIO_STYLES) assert.equal(DESIGN_TEMPLATES.filter(item => item.style === style.id).length,4);
  for (const template of DESIGN_TEMPLATES) {
    const layers = createTemplateLayers(template.id), other = createTemplateLayers(template.id);
    assert.ok(layers.length >=2 && layers.length <= 20); assert.equal(new Set([...layers,...other].map(item => item.id)).size,layers.length * 2);
    for (const layer of layers) {
      assert.ok(layer.x >=0 && layer.y >=0 && layer.x+layer.width <=300 && layer.y+layer.height <=360,template.id);
      if (layer.kind === 'shape') assert.ok(STICKERS.some(item => item.id === layer.shape));
      else assert.ok(isBuiltinFont(layer.fontFamily) || ['serif','monospace'].includes(layer.fontFamily),layer.fontFamily);
    }
    const project = {version:1,name:template.name,faces:{front:{area:'medium',layers},back:{area:'medium',layers:[]}}};
    assert.ok((await sharp(Buffer.from(renderArtworkSvg(project))).resize(150,180).png().toBuffer()).length>200,template.id);
    const edited = recolorTemplateLayers(layers,['#123456','#654321']);
    assert.ok(edited.every(layer => ['#123456','#654321'].includes(layer.fill)));
    assert.equal(edited[0].id,layers[0].id); assert.notEqual(edited[0],layers[0]);
  }
  assert.deepEqual(createTemplateLayers('missing'),[]);
  assert.ok(matchesStudioSearch(STICKERS.find(item => item.id === 'butterfly'),'buom buom','nature'));
  assert.ok(matchesStudioSearch(STICKERS.find(item => item.id === 'flame'),'duong pho','street'));
});
