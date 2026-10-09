const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../js/mg-dictionary-service.js','utf8');
const store=new Map();const window={MGCatalog:{data:[]}};
const context={window,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},console,Date,JSON,String,Number,Math,Map,Set,Array,Object,RegExp,Promise};
vm.createContext(context);vm.runInContext(source,context,{filename:'mg-dictionary-service.js'});
assert.ok(window.MG_DICTIONARY,'dictionary API should exist');
assert.equal(window.MG_DICTIONARY.getStatus().remoteInference,false);
assert.equal(window.MG_DICTIONARY.getStatus().apiKeyRequired,false);
for(const text of ['монтаж плитки','покос травы на участке','штробовка канала канализацыи','montare faianta']){
 const r=window.MG_DICTIONARY.suggestServiceName({text,direction:'Строительные работы',selectedServices:[]});
 assert.ok(r&&typeof r.corrected==='string','result should be returned for '+text);
 assert.equal(r.offline,true);assert.equal(r.dictionaryUsed,true);
}
assert.equal(window.MG_DICTIONARY.rememberCorrection('тест опечатка','Тест исправления'),true);
assert.equal(window.MG_DICTIONARY.suggestServiceName({text:'тест опечатка'}).corrected,'Тест исправления');
const backup=window.MG_DICTIONARY.exportPersonalTerms();
assert.ok(window.MG_DICTIONARY.importPersonalTerms(backup).ok);
assert.ok(!/openrouter|Qwen3|LanguageModel|transformers|onnx-community/i.test(source),'dictionary source must not include AI provider/model integration');
console.log('Dictionary-only service smoke tests passed');
