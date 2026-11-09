'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.join(__dirname,'..');
const pairs=[
 ['clean','Клининг и уборка'],['camera','Видеонаблюдение'],['metal','Металлоконструкции'],['plumbing','Сантехника'],
 ['construction','Строительство'],['electrical','Электрика'],['excavator','Земляные работы'],['fence','Заборы и ограждения'],
 ['finishing','Отделочные работы'],['flooring','Напольные покрытия'],['heating','Отопление'],['landscape','Благоустройство и ландшафт'],
 ['masonry','Кладочные работы'],['paint','Малярные работы'],['sewer','Канализация'],['transport','Перевозки и вывоз'],
 ['roof','Кровельные работы'],['ventilation','Вентиляция'],['water','Водоснабжение'],['welding','Сварочные работы'],
 ['window','Окна и двери'],['aircon','Кондиционирование'],['tools','Инструмент и оборудование'],['other','Прочие работы и услуги']
];
const ids=new Map(),dir=path.join(root,'icons','direction-approved');
for(const [key] of pairs){const p=path.join(dir,key+'.png');if(!fs.existsSync(p))throw Error('Missing '+key);const b=fs.readFileSync(p);if(b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('Invalid PNG '+key);const h=crypto.createHash('sha256').update(b).digest('hex');if(ids.has(h)){const pair=[ids.get(h),key].sort().join(':');if(!['aircon:ventilation','metal:welding'].includes(pair))throw Error('Unexpected duplicate '+pair);}else ids.set(h,key);}
const window={};const context={window,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'js','mg-icons-v208.js'),'utf8'),context);
for(const [key,label] of pairs){if(window.MGIconKey(key,label)!==key)throw Error(label+' -> wrong icon');const html=window.MGIconSVG(key,label);if(!html.includes('/'+key+'.png?v=550'))throw Error(label+' renders wrong file');}
for(const [key] of pairs){if(!fs.readFileSync(path.join(dir,key+'.png')).length)throw Error('Empty icon '+key);}
if(!fs.readFileSync(path.join(dir,'clean.png')).length)throw Error('Missing imported reference art');
console.log('24 direction names, user-reference PNG assets and explicit mappings: PASS');
