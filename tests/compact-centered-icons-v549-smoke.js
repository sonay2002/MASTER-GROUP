const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const block=css.slice(css.lastIndexOf('/* v549 — compact, centered direction thumbnails'));
assert(block.includes('width:60px!important'));
assert(block.includes('height:60px!important'));
assert(block.includes('object-fit:contain!important'));
assert(block.includes('object-position:center center!important'));
assert(block.includes('flex:0 0 76px!important'));
assert(block.includes('grid-template-columns:repeat(6,minmax(0,1fr))'));
assert(block.includes('display:none!important'));
assert(html.includes('css/wizard-v518.css?v=549'));
assert(html.includes('js/wizard-v518.js?v=549'));
assert(sw.includes('master-group-v549-centered-compact-icons'));
const iconDir=path.join(root,'icons','direction-approved');
for(const key of ['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other']){
 const p=path.join(iconDir,key+'.png'); assert(fs.existsSync(p),`missing ${key}`);
 const b=fs.readFileSync(p); assert(b.readUInt32BE(16)===256 && b.readUInt32BE(20)===256,`not whole source tile ${key}`);
}
const cached=[...sw.matchAll(/"\.\/icons\/direction-approved\/[^"]+\.png\?v=549"/g)];
assert.strictEqual(cached.length,24,'All 24 icons must be in the v549 precache');
console.log('v549 compact 60px centered icons, mobile swipe rail, and 24 image assets: PASS');
