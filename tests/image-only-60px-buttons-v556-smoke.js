const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const wizard=fs.readFileSync(path.join(root,'js','wizard-v518.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const a=wizard.indexOf('function renderCats() {');
const b=wizard.indexOf('function row(name, unit, on)',a);
assert(a>=0 && b>a);
const renderer=wizard.slice(a,b);
assert(renderer.includes('class="mg-direction-card'));
assert(renderer.includes('class="mg-direction-art'));
assert(renderer.includes('data-wz-dir='));
assert(!renderer.includes('wz-dir-t'),'separate label must not render');
assert(!renderer.includes('mg-direction-count'),'count badge must not render');
assert(wizard.includes("t.closest('[data-wz-dir]')"),'selection click handler preserved');
const block=css.slice(css.lastIndexOf('/* v556 — final direction buttons'));
for(const rule of ['flex:0 0 60px!important','width:60px!important','height:60px!important','background:transparent!important','border:0!important','box-shadow:none!important','object-fit:fill!important']){
 assert(block.includes(rule),`missing ${rule}`);
}
assert(html.includes('css/wizard-v518.css?v=556'));
assert(html.includes('js/wizard-v518.js?v=556'));
assert(sw.includes('master-group-v556-image-only-60px-buttons'));
const cached=[...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=556"/g)];
assert.strictEqual(cached.length,24);
const dir=path.join(root,'icons','direction-approved');
for(const key of ['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other']){
 const b=fs.readFileSync(path.join(dir,key+'.png'));
 assert.strictEqual(b.readUInt32BE(16),256,`${key} width`);
 assert.strictEqual(b.readUInt32BE(20),256,`${key} height`);
}
console.log('v556: 24 full original tiles in 60×60 image-only buttons, no grey shell or extra label: PASS');
