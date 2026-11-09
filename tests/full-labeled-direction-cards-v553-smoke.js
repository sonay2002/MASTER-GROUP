const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of keys){
  const b=fs.readFileSync(path.join(dir,k+'.png'));
  assert.strictEqual(b.readUInt32BE(16),256,`${k} width`);
  assert.strictEqual(b.readUInt32BE(20),256,`${k} height`);
}
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const block=css.slice(css.lastIndexOf('/* v553 — use the complete supplied labeled cards'));
assert(block.includes('width:112px!important'));
assert(block.includes('height:112px!important'));
assert(block.includes('object-fit:contain!important'));
assert(block.includes('overflow-x:auto!important'));
assert(block.includes('.wz-dir-t') && block.includes('display:none!important'));
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('css/wizard-v518.css?v=553'));
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes("master-group-v553-full-labeled-direction-cards"));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=553"/g)].length,24);
assert(sw.includes('const isApprovedIcon = /\\/icons\\/direction-approved\\/[^/]+\\.png$/i.test(url.pathname);'));
for(const f of ['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js']){
  assert(fs.readFileSync(path.join(root,f),'utf8').includes('.png?v=553'),`${f} should render full tiles`);
}
console.log('v553: 24 full original cards, 112px centered horizontal rail, no external labels, PWA cache: PASS');
