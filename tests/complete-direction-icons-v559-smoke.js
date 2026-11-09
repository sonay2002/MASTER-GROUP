const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of keys){
 const p=path.join(dir,k+'.png');assert(fs.existsSync(p),`missing ${k}`);
 const b=fs.readFileSync(p);
 assert.strictEqual(b.readUInt32BE(16),256,`${k} width`);
 assert.strictEqual(b.readUInt32BE(20),256,`${k} height`);
 assert.strictEqual(b[25],6,`${k} must retain transparent RGBA pixels`);
}
const runtime=['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js'];
for(const f of runtime){
 const s=fs.readFileSync(path.join(root,f),'utf8');
 assert(s.includes('.png?v=559'),`${f} loads the refreshed icon assets`);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes('master-group-v559-complete-direction-icons'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=559"/g)].length,24);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('mg-icons-v208.js?v=559'));
assert(html.includes('wizard-v518.js?v=559'));
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
assert(css.includes('flex:0 0 60px!important'));
assert(css.includes('height:60px!important'));
assert(css.includes('background:transparent!important'));
console.log('v559: 24 complete transparent icon assets, 60px image controls and cache refs: PASS');
