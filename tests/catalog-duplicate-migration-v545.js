'use strict';
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(__dirname+'/../js/catalog.js','utf8');
const store=new Map();
const raw=[
 {name:'Клининг и уборка',icon:'clean',services:[
  {name:'Вывоз бытового мусора',unit:'рейс'},
  {name:'Вывоз строительного мусора',unit:'рейс'},
  {name:'Вывоз старой мебели',unit:'рейс'},
  {name:'Пользовательская услуга',unit:'шт'}
 ]},
 {name:'Строительство',icon:'construction',services:[{name:'Монтаж перемычек',unit:'шт'}]},
 {name:'Земляные работы',icon:'excavator',services:[{name:'Вывоз грунта',unit:'рейс'}]},
 {name:'Отделочные работы',icon:'finishing',services:[{name:'Грунтование стен',unit:'м²'}]}
];
store.set('master_group_catalog_v1',JSON.stringify(raw));
const localStorage={getItem(k){return store.has(k)?store.get(k):null},setItem(k,v){store.set(k,String(v))},removeItem(k){store.delete(k)}};
const listeners={};
class CustomEvent{constructor(type,opts={}){this.type=type;this.detail=opts.detail}}
const window={localStorage,dispatchEvent(e){(listeners[e.type]||[]).forEach(fn=>fn(e));return true},addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)}};
window.window=window;
const context={window,localStorage,CustomEvent,console,setTimeout,Date,JSON,String,Number,Array,Object,Math};
vm.createContext(context);vm.runInContext(source,context);
const d=window.MGCatalog.data;
const find=n=>d.find(x=>x.name===n);
for(const [from,to,name] of [
 ['Клининг и уборка','Перевозки и вывоз','Вывоз бытового мусора'],
 ['Клининг и уборка','Перевозки и вывоз','Вывоз строительного мусора'],
 ['Клининг и уборка','Перевозки и вывоз','Вывоз старой мебели'],
 ['Строительство','Кладочные работы','Монтаж перемычек'],
 ['Земляные работы','Перевозки и вывоз','Вывоз грунта'],
 ['Отделочные работы','Малярные работы','Грунтование стен']
]){
 if(find(from).services.some(x=>x.name===name))throw new Error(`Duplicate remained in ${from}: ${name}`);
 if(!find(to).services.some(x=>x.name===name))throw new Error(`Canonical service missing in ${to}: ${name}`);
}
if(!find('Клининг и уборка').services.some(x=>x.name==='Пользовательская услуга'))throw new Error('Custom user service was removed');
console.log('Six known duplicate rows migrated to canonical categories; custom service preserved: PASS');
