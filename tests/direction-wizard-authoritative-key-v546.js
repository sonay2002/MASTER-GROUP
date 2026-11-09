const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const win={addEventListener(){}};
const doc={readyState:'loading',addEventListener(){}};
const ctx={window:win,document:doc,console,setTimeout,clearTimeout,MutationObserver:function(){},requestAnimationFrame(){}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js','mg-icons-v208.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js','wizard-v518.js'),'utf8'),ctx);
const render=win.MGWizardIcons518.svg;
for(const [key,name] of [
 ['metal','Металлоконструкции'],['welding','Сварочные работы'],
 ['water','Водоснабжение'],['plumbing','Сантехника'],
 ['sewer','Канализация'],['fence','Заборы и ограждения'],
 ['aircon','Кондиционирование'],['ventilation','Вентиляция']
]){
 const html=render(key,name);
 const asset=key==='welding'?'metal':key;
 const version=['clean','landscape','flooring','roof'].includes(asset)?561:560;
 assert(html.includes(`/icons/direction-approved/${asset}.png?v=${version}`),`${name} should use ${asset}.png?v=${version}`);
}
console.log('v562 wizard uses the audited image asset for every explicit catalog icon key: PASS');
