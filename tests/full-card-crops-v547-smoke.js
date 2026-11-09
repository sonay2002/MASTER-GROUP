const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const key of keys){
  const file=path.join(dir,key+'.png');
  assert(fs.existsSync(file),`Missing ${key}.png`);
  const b=fs.readFileSync(file);
  assert(b.length>15000,`Image too small / not a full tile: ${key}`);
  assert(b.readUInt32BE(16)===256 && b.readUInt32BE(20)===256,`Expected unscaled 256x256 crop: ${key}`);
}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes("master-group-v549-centered-compact-icons"));
const cached=[...sw.matchAll(/"\.\/icons\/direction-approved\/([^"]+\.png\?v=549)"/g)].map(m=>m[1]);
assert.strictEqual(cached.length,24,'All 24 complete card crops must be precached');
assert.strictEqual(new Set(cached).size,24,'Precache must contain all 24 image paths');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const ref of ['mg-icons-v208.js?v=549','new-direction-icon-picker-v211.js?v=549','wizard-v518.js?v=549']) assert(html.includes(ref),`Missing ${ref}`);
console.log('v549 full-card image crops and cache references: PASS');
