const fs=require('fs'),vm=require('vm'),assert=require('assert');
let source=fs.readFileSync(__dirname+'/../js/mg-dictionary-service.js','utf8');
source=source.replace("  if(typeof window!=='undefined')window.MG_DICTIONARY=", "  window.__spellcheckTest={indexExpandedText,expandedSpellingCandidate,isKnownExpandedWord};\n  if(typeof window!=='undefined')window.MG_DICTIONARY=");
const store=new Map(),window={MGCatalog:{data:[]}};
const context={window,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},console,Date,JSON,String,Number,Math,Map,Set,Array,Object,RegExp,Promise,Blob,Response,DecompressionStream,globalThis:{}};
vm.createContext(context);vm.runInContext(source,context,{filename:'mg-dictionary-service.js'});
(async()=>{
  const words=['бетон','бетона','бетоне','ванная','ванной','строительный','участке','канализации','покраска','покраске','шпаклевка'].sort();
  await window.__spellcheckTest.indexExpandedText(words.join('\n')+'\n','gzip-forms');
  assert.strictEqual(window.__spellcheckTest.expandedSpellingCandidate('ваной'),'ванной','should find a one-letter omission');
  assert.strictEqual(window.__spellcheckTest.expandedSpellingCandidate('канализацыи'),'канализации','should find a one-letter substitution');
  assert.strictEqual(window.__spellcheckTest.expandedSpellingCandidate('строительный'),null,'known correct word should not be changed');
  assert.strictEqual(window.__spellcheckTest.isKnownExpandedWord('строительный'),true);
  console.log('Expanded spellcheck smoke: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
