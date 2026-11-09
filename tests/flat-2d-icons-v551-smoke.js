const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const keys=['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir=path.join(root,'icons','direction-approved');
for(const k of keys){
 const s=fs.readFileSync(path.join(dir,k+'.svg'),'utf8');
 assert(s.startsWith('<svg') && s.includes('viewBox="0 0 160 160"'),k+' SVG dimensions');
 assert(!/[А-Яа-яЁё]{3,}/.test(s),k+' must not contain embedded labels');
}
const files=['js/mg-icons-v208.js','js/wizard-v518.js','js/estimate-ui.js','js/new-direction-icon-picker-v211.js'];
for(const f of files){const s=fs.readFileSync(path.join(root,f),'utf8');assert(s.includes('.svg?v=551'),f+' must load SVG assets');assert(!s.includes('.png?v='),f+' stale PNG URL');}
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes('master-group-v551-flat-2d-icons'));
assert.strictEqual([...sw.matchAll(/"\.\/icons\/direction-approved\/[a-z]+\.svg\?v=551"/g)].length,24);
const css=fs.readFileSync(path.join(root,'css','wizard-v518.css'),'utf8');
const block=css.slice(css.lastIndexOf('/* v551 — consistent flat 2D direction pictograms'));
assert(block.includes('width:60px!important') && block.includes('object-fit:contain!important'));
console.log('v551 24 flat 2D SVGs, clean labels, 60px centered layout and precache: PASS');
