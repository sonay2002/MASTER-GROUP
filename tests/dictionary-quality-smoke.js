const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../js/mg-dictionary-service.js','utf8');
const store=new Map();const window={MGCatalog:{data:[]}};
const context={window,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},console,Date,JSON,String,Number,Math,Map,Set,Array,Object,RegExp,Promise,Blob,Response,DecompressionStream,globalThis:{}};
vm.createContext(context);vm.runInContext(source,context,{filename:'mg-dictionary-service.js'});
const examples=[
 ['штробовка канала канализацыи','Штробление канала канализации'],
 ['покрас стен','Покраска стен'],
 ['свeрл дырк бет','Сверление отверстия в бетоне'],
 ['montare faianta baie','Укладка плитки в ванной комнате'],
 ['reparatie acoperis','Ремонт крыши'],
 ['spalat curte','Мойка территории'],
 ['покрасить стену на кухне','Покраска стен на кухне'],
 ['укладка плитки в ванной','Укладка плитки в ванной комнате'],
 ['установить смеситель','Установка смесителя'],
 ['замена крана','Замена смесителя'],
 ['устранить протечку','Устранение протечки'],
 ['установка розеток','Установка розеток'],
 ['монтаж забора','Установка забора'],
 ['покраска потолка','Покраска потолка'],
 ['шпаклевка стен','Шпаклевка стен'],
 ['curatare teren','Уборка территории'],
 ['montare robinet','Установка смесителя'],
 ['taiere copaci','Спил деревьев']
];
for(const [text,expected] of examples){
 const result=window.MG_DICTIONARY.suggestServiceName({text,direction:'Строительные работы',selectedServices:[]});
 assert.strictEqual(result.corrected,expected,`${text} should become ${expected}; got ${result.corrected}`);
 assert.strictEqual(result.offline,true);
}
assert.strictEqual(typeof window.MG_DICTIONARY.prepare,'function','expanded dictionary loader is connected');
assert.strictEqual(window.MG_DICTIONARY.getStatus().remoteInference,false);
console.log('Dictionary quality smoke tests passed');
