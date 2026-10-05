// Master Group smart dictionary smoke test (Node, no DOM required).
const fs=require('fs'), vm=require('vm');
const ctx={window:{},console}; vm.createContext(ctx);
for(const f of ['js/mg-dict/dictionary-actions.js','js/mg-dict/dictionary-works.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const actions=new Set(ctx.window.MG_DICTIONARY_ACTIONS||[]);
const works=ctx.window.MG_DICTIONARY_WORKS||[];
const corpusFiles=["js/mg-dict/dictionary-01.js", "js/mg-dict/dictionary-02.js", "js/mg-dict/dictionary-03.js"];
for(const f of corpusFiles) vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const corpus=ctx.window.MG_MASTER_SERVICE_ALL||[];
const corpusSecond=new Set(corpus.map(x=>{const i=String(x).indexOf(' ');return i>0?String(x).slice(i+1).trim().split(/\s+/)[0]:''}).filter(Boolean));
const links=ctx.window.MG_DICTIONARY_ACTION_WORKS||{};
function low(x){return String(x||'').toLocaleLowerCase('ru');}
function pref(list,p){return [...new Set(list.map(String))].filter(x=>low(x).startsWith(low(p))).slice(0,60)}
function second(action,p){return pref([...(links[low(action)]||[]),...works,...corpusSecond],p)}
if(![...actions].some(x=>low(x)==='покраска')) throw Error('Покраска отсутствует в действиях');
if(![...corpusSecond].some(x=>low(x)==='пластик')) throw Error('Пластик не найден в общем корпусе');
if(!pref([...actions],'п').some(x=>low(x)==='покраска')) throw Error('Покраска не находится по первой букве');
if(!second('Покраска','п').some(x=>low(x)==='пластик')) throw Error('Пластик не доступен после действия');
if(!ctx.window.MG_DICTIONARY_ACTIONS.includes('штробление')) throw new Error('штробление action missing');
if(!ctx.window.MG_DICTIONARY_ACTION_WORKS['штробление']?.some(x=>String(x).toLocaleLowerCase('ru').includes('стен'))) throw new Error('штробление → стена relation missing');
console.log('actions:', actions.size, 'works:', works.length, 'corpus:', corpus.length, 'global second-token candidates:', corpusSecond.size, 'OK');
