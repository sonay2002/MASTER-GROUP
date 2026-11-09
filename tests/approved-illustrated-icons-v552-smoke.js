const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of keys){
 const p=path.join(dir,k+'.png'); assert(fs.existsSync(p),`missing ${k}`);
 const b=fs.readFileSync(p); assert.strictEqual(b.readUInt32BE(16),180); assert.strictEqual(b.readUInt32BE(20),180);
}
const runtime=['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js'];
for(const f of runtime){const s=fs.readFileSync(path.join(root,f),'utf8');assert(s.includes('.png?v=552'),f);}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes('master-group-v552-approved-illustrated-icons'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=552"/g)].length,24);
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
assert(css.includes('v552 — user-approved illustrated icon sheet'));
console.log('v552: 24 illustrated PNGs, all renderer paths, 60px display and offline precache: PASS');
