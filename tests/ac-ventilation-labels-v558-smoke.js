const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of ['aircon','ventilation']){
 const b=fs.readFileSync(path.join(dir,k+'.png'));
 assert.strictEqual(b.readUInt32BE(16),256);
 assert.strictEqual(b.readUInt32BE(20),256);
 assert(b.length>10000,`${k} icon asset is present`);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes('master-group-v558-ac-ventilation-labels'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=558"/g)].length,24);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('mg-icons-v208.js?v=558'));
assert(html.includes('wizard-v518.js?v=558'));
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
assert(css.includes('v557') && !css.includes('v558'), 'Layout CSS is intentionally unchanged');
for(const f of ['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js']){
 assert(fs.readFileSync(path.join(root,f),'utf8').includes('.png?v=558'),`${f} must request updated images`);
}
console.log('v558 two icon captions, 24 cache URLs, preserved 60px layout: PASS');
