const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const key of keys){
  const file=path.join(dir,key+'.png');
  assert(fs.existsSync(file),`Missing ${key}.png`);
  const bytes=fs.readFileSync(file);
  assert(bytes.length>10000,`Unexpectedly small source crop: ${key}`);
  assert(bytes.readUInt32BE(16)===512 && bytes.readUInt32BE(20)===512,`Wrong size: ${key}`);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes("master-group-v546-user-provided-3d-icons"));
const cached=[...sw.matchAll(/"\.\/icons\/direction-approved\/([^"]+\.png\?v=546)"/g)].map(m=>m[1]);
assert.strictEqual(cached.length,24,'All 24 icon files must be precached');
assert.strictEqual(new Set(cached).size,24,'Precache must include each icon exactly once');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const ref of ['mg-icons-v208.js?v=546','new-direction-icon-picker-v211.js?v=546','wizard-v518.js?v=546']) assert(html.includes(ref),`Missing cache-busted script ${ref}`);
console.log('v546 uploaded 3D icon assets and service-worker cache: PASS');
