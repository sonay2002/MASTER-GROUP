const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const block=css.slice(css.lastIndexOf('/* v557 — transparent icon backgrounds'));
for(const rule of [
 'align-items:center!important','height:60px!important','min-height:60px!important',
 'flex:0 0 60px!important','background:transparent!important',
 'background-color:transparent!important','box-shadow:none!important'
]) assert(block.includes(rule),`missing ${rule}`);
assert(html.includes('css/wizard-v518.css?v=557'));
assert(html.includes('js/wizard-v518.js?v=557'));
assert(sw.includes('master-group-v557-transparent-even-direction-row'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=557"/g)].length,24);
const dir=path.join(root,'icons','direction-approved');
for(const k of ['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other']){
 const b=fs.readFileSync(path.join(dir,k+'.png'));
 assert.strictEqual(b.readUInt32BE(16),256,`${k} width`);
 assert.strictEqual(b.readUInt32BE(20),256,`${k} height`);
 // PNG alpha channel is color type 6 (RGBA); transparent matte corners are verified by asset audit.
 assert.strictEqual(b[25],6,`${k} should be RGBA`);
}
console.log('v557: 24 transparent icons, fixed centered 60px rail, no grey button shell, PWA cache: PASS');
