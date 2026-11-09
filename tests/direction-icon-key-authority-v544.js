'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const window={};
const context={window,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js','mg-icons-v208.js'),'utf8'),context);
const pairs=[
 ['clean','Клининг и уборка'],['camera','Видеонаблюдение'],['metal','Металлоконструкции'],
 ['plumbing','Сантехника'],['construction','Строительство'],['electrical','Электрика'],
 ['excavator','Земляные работы'],['fence','Заборы и ограждения'],['finishing','Отделочные работы'],
 ['flooring','Напольные покрытия'],['heating','Отопление'],['landscape','Благоустройство и ландшафт'],
 ['masonry','Кладочные работы'],['paint','Малярные работы'],['sewer','Канализация'],
 ['transport','Перевозки и вывоз'],['roof','Кровельные работы'],['ventilation','Вентиляция'],
 ['water','Водоснабжение'],['welding','Сварочные работы'],['window','Окна и двери'],
 ['aircon','Кондиционирование'],['tools','Инструмент и оборудование'],['other','Прочие работы и услуги']
];
for(const [key,name] of pairs){
 const resolved=window.MGIconKey(key,name);
 if(resolved!==key) throw new Error(`${name}: explicit ${key} overridden as ${resolved}`);
 const p=path.join(root,'icons','direction-approved',`${key}.png`);
 if(!fs.existsSync(p)) throw new Error(`Missing image ${key}.png`);
}
console.log('24 explicit direction icon keys preserved; all image files present: PASS');
