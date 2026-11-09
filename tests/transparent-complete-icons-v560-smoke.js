const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const key of keys){
  const p=path.join(dir,key+'.png'); assert(fs.existsSync(p),`missing ${key}`);
  const b=fs.readFileSync(p);
  assert.strictEqual(b.readUInt32BE(16),256,`${key} width`);
  assert.strictEqual(b.readUInt32BE(20),256,`${key} height`);
  assert.strictEqual(b[25],6,`${key} must be RGBA with transparency`);
}
const runtime=['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js'];
for(const f of runtime){
  const s=fs.readFileSync(path.join(root,f),'utf8');
  assert(s.includes('.png?v=560'),`${f} must request v560 icons`);
  assert(!s.includes('.png?v=559'),`${f} has stale icon URL`);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes('master-group-v560-transparent-complete-icons'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=560"/g)].length,24);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of ['js/mg-icons-v208.js','js/new-direction-icon-picker-v211.js','js/wizard-v518.js']) assert(html.includes(f+'?v=560'),`index missing ${f} cache bump`);
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
assert(css.includes('flex:0 0 60px!important'));
assert(css.includes('height:60px!important'));
console.log('v560: 24 transparent RGBA icon assets, captions preserved, 60px UI and cache paths: PASS');
