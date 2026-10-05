const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},console,document:{readyState:'loading',addEventListener(){},getElementById(){return null},documentElement:{}},MutationObserver:function(){this.observe=()=>{}}}; vm.createContext(ctx);
const dir=path.join(__dirname,'../js/mg-dict');
for(const f of ['dictionary-actions.js','dictionary-works.js','dictionary-01.js','dictionary-02.js','dictionary-03.js','dictionary-04.js','dictionary-05.js','smart-search.js']) vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
const D=ctx.window.MG_SMART_DICT;
if(!D||D.count()!==500000) throw Error('Dictionary load order failed: '+(D&&D.count()));
if(!D.suggest('п',60).some(x=>String(x).toLocaleLowerCase('ru')==='покраска')) throw Error('Prefix search failed after browser load order');
console.log('smart dictionary load order OK; corpus=',D.count());
