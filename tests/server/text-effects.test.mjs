import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { renderArtworkSvg, renderLayerSvg } from '../../shared/custom-core.mjs';
import { normalizedTextEffects } from '../../shared/text-effects.mjs';
import { validateTextEffects } from '../../server/text-effects-validation.mjs';

const layer = {id:'áo-1',kind:'text',text:'NẾP CỦA MÌNH',x:20,y:20,width:260,height:80,fill:'#20201e',fontFamily:'Be Vietnam Pro',fontWeight:700,opacity:1,rotation:0};
const project = item => ({name:'Hiệu ứng chữ',faces:{front:{area:'medium',layers:[item]},back:{area:'medium',layers:[]}}});
const effects = normalizedTextEffects({curve:65,outlineWidth:2,outlineColor:'#fff5e5',shadow:{enabled:true,color:'#9a482e',opacity:.8,blur:2,offsetX:4,offsetY:5}});
test('plain legacy geometry stays unchanged; outline and shadow change raster pixels', async () => {
  const plain = renderLayerSvg(layer);
  assert.match(plain,/x="130" y="68"/); assert.match(plain,/font-size="64"/); assert.doesNotMatch(plain,/textPath|feDropShadow|paint-order/);
  // Sharp/librsvg does not render textPath; the real Chromium browser suite checks curve pixels.
  const variants = [undefined,{...effects,curve:0},{...effects,curve:0,outlineWidth:0},{...effects,curve:0,shadow:{...effects.shadow,enabled:false}}];
  const hashes = new Set();
  for (const textEffects of variants) {
    const svg = renderArtworkSvg(project({...layer,textEffects}));
    const png = await sharp(Buffer.from(svg)).resize(450,540).png().toBuffer();
    assert.ok(png.length>500); hashes.add(png.toString('base64'));
    assert.doesNotMatch(renderLayerSvg({...layer,textEffects}),/NaN|Infinity/);
  }
  assert.equal(hashes.size,variants.length,'Outline and shadow must change rendered pixels');
  const combined = renderLayerSvg({...layer,textEffects:effects});
  assert.match(combined,/paint-order="stroke fill"/); assert.match(combined,/stroke-width="4"/);
  assert.match(combined,/<textPath href="#nep-text-/); assert.match(combined,/<feDropShadow dx="4" dy="5"/);
});
test('multiline curves use safe collision-free local references and escape text', () => {
  const input = {...layer,text:'Nếp <riêng>\nDòng thứ hai',textEffects:effects};
  const svg = renderLayerSvg({...input,id:'a b'})+renderLayerSvg({...input,id:'a-b'});
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,6); assert.equal(new Set(ids).size,6); assert.match(svg,/Nếp &lt;riêng&gt;/);
  const malicious = renderLayerSvg({...input,id:'x"/><script>alert(1)</script>'});
  assert.doesNotMatch(malicious,/<script>|alert\(1\)/);
  assert.equal((svg.match(/<textPath /g)||[]).length,4);
  for (const curve of [-100,100]) assert.doesNotMatch(renderLayerSvg({...layer,width:1,height:1,textEffects:{...effects,curve}}),/NaN|Infinity/);
});
test('effect validation enforces bounded numeric data and colors, compatible partial/defaults', () => {
  assert.deepEqual(validateTextEffects({}),normalizedTextEffects());
  assert.equal(validateTextEffects({curve:-100,outlineWidth:10,shadow:{blur:12,offsetX:-20,offsetY:20,opacity:1}}).curve,-100);
  for (const value of [null,[],1,{curve:'60'},{curve:101},{curve:NaN},{outlineWidth:-1},{outlineWidth:11},{outlineColor:'url(https://evil.test)'},{shadow:null},{shadow:[]},{shadow:{enabled:'yes'}},{shadow:{offsetX:21}},{shadow:{offsetY:-21}},{shadow:{blur:13}},{shadow:{opacity:1.1}},{shadow:{color:'#fff" onload="x'}}]) assert.throws(()=>validateTextEffects(value),error=>error.status===400 && error.code==='INVALID_TEXT_EFFECTS');
});
