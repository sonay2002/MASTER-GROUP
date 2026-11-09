const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const wizard=fs.readFileSync(path.join(root,'js','wizard-v518.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const a=wizard.indexOf('function renderCats() {');
const b=wizard.indexOf('function row(name, unit, on)',a);
assert(a>=0 && b>a,'renderCats function must exist');
const renderer=wizard.slice(a,b);
assert(renderer.includes('class="mg-direction-card'),'new direction card button is rendered');
assert(renderer.includes('class="mg-direction-rail"'),'new rail is rendered');
assert(renderer.includes('data-wz-dir='));
assert(!renderer.includes('class="wz-dir '),'old direction button markup must be removed');
assert(!renderer.includes('wz-dir-t'),'separate caption below full-card image must not be rendered');
assert(wizard.includes("t.closest('[data-wz-dir]')"),'delegated selection handler must remain');
const style=css.slice(css.lastIndexOf('/* v554 — rebuilt direction selector'));
for(const rule of ['flex:0 0 112px!important','width:112px!important','height:112px!important','overflow-x:auto!important','scroll-snap-type:x mandatory!important','object-fit:contain!important','outline:3px solid #1675d1!important']){
 assert(style.includes(rule),`missing new button style: ${rule}`);
}
assert(html.includes('css/wizard-v518.css?v=554'));
assert(html.includes('js/wizard-v518.js?v=554'));
assert(sw.includes('master-group-v554-rebuilt-direction-buttons'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.png\?v=554"/g)].length,24);
const dir=path.join(root,'icons','direction-approved');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
for(const key of keys){
 const p=path.join(dir,key+'.png'); assert(fs.existsSync(p),`missing image ${key}`);
 const bytes=fs.readFileSync(p); assert.strictEqual(bytes.readUInt32BE(16),256); assert.strictEqual(bytes.readUInt32BE(20),256);
}
console.log('v554 rebuilt direction buttons, original card images, click handling and cache: PASS');
