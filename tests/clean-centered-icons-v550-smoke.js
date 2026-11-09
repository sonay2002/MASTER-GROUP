const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const wizard=fs.readFileSync(path.join(root,'js','wizard-v518.js'),'utf8');
const icons=fs.readFileSync(path.join(root,'js','mg-icons-v208.js'),'utf8');
const block=css.slice(css.lastIndexOf('/* v550 — clean 3D artwork'));
assert(block.includes('width:60px!important'));
assert(block.includes('height:60px!important'));
assert(block.includes('object-fit:cover!important'));
assert(block.includes('display:block!important'));
assert(block.includes('font-size:8.5px!important'));
assert(block.includes('flex:0 0 76px!important'));
assert(block.includes('display:flex!important'));
assert(html.includes('css/wizard-v518.css?v=550'));
assert(html.includes('js/wizard-v518.js?v=550'));
assert(sw.includes("master-group-v550-clean-centered-icons"));
const cached=[...sw.matchAll(/"\.\/icons\/direction-approved\/[^"]+\.png\?v=550"/g)];
assert.strictEqual(cached.length,24,'All 24 cleaned icons must be cached');
const names=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of names){
 const b=fs.readFileSync(path.join(dir,k+'.png'));
 assert.strictEqual(b.readUInt32BE(16),160,`${k} width`);
 assert.strictEqual(b.readUInt32BE(20),160,`${k} height`);
}
const win={addEventListener(){}},doc={readyState:'loading',addEventListener(){}};
const ctx={window:win,document:doc,console,setTimeout,clearTimeout,MutationObserver:function(){},requestAnimationFrame(){}};
vm.createContext(ctx);vm.runInContext(icons,ctx);vm.runInContext(wizard,ctx);
for(const k of names){
 const out=win.MGWizardIcons518.svg(k,k);
 assert(out.includes(`/icons/direction-approved/${k}.png?v=550`),`${k} renderer URL`);
}
const labels=wizard.slice(wizard.indexOf('function shortName'),wizard.indexOf('/* ───────────── Step 1',wizard.indexOf('function shortName')));
assert(labels.includes('function shortName'));
assert(wizard.includes("'Благоустройство и ландшафт':'Благоустройство'"));
console.log('v550 label-free centered 60px icons, visible labels, all 24 renderer paths and cache: PASS');
