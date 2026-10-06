// Master Group v33 AI-like fuzzy dictionary smoke test.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},console,document:{readyState:'loading',addEventListener(){},getElementById(){return null},documentElement:{}},MutationObserver:function(){this.observe=()=>{}}};vm.createContext(ctx);
const dir=path.join(__dirname,'../js/mg-dict');
for(const f of ['dictionary-actions.js','dictionary-works.js','dictionary-01.js','dictionary-02.js','dictionary-03.js','dictionary-04.js','dictionary-05.js','smart-search.js'])
  vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
const D=ctx.window.MG_SMART_DICT;
if(D.count()!==500000) throw Error('Expected 500000 corpus entries, got '+D.count());
function has(q,w){return D.suggest(q,60).some(x=>String(x).toLocaleLowerCase('ru')===w.toLocaleLowerCase('ru'))}
const cases=[
 ['п','покраска'],['покраска п','пластик'],['штробление','штробление'],
 ['металлоконструкция','металлоконструкция'],['металоконструкция','металлоконструкция'],
 ['металаконструкцыя','металлоконструкция'],['металаканструкцыя','металлоконструкция'],
 ['металлоконструкция з','задний маятник'],['покраска пласт','пластик'],
 ['маятнек','маятник'],['сварка м','металлоконструкция'],['пакос','покос'],
 ['пакос трави','травы'],['погрузка мусара','мусор'],['убрат мусор','мусор'],
 ['демонтирвоать','демонтаж'],['дэмонтаж','демонтаж'],['гидроизолцыя','гидроизоляция'],
 ['падключение','подключение'],['сверлиние','сверление'],['устанвка','установка'],
 ['уставнка','установка'],['пакраска','покраска'],['провадка','прокладка'],
 ['задни маятнек','задний маятник']
];
for(const [q,w] of cases)
  if(!has(q,w)) throw Error(`Search failed: ${q} -> ${w}; got ${D.suggest(q,10).join(', ')}`);
const correctionCases=[
 ['пакос трави','Покос травы'],
 ['демонтирвоать металоконструкцыя','Демонтаж металлоконструкция'],
 ['уставнка труб','Установка труб']
];
for(const [q,w] of correctionCases){
  const got=D.correctText(q);
  if(got.toLocaleLowerCase('ru')!==w.toLocaleLowerCase('ru')) throw Error(`Correction failed: ${q} -> ${w}; got ${got}`);
}
console.log('smart dictionary v33 OK; corpus=',D.count(),'vocabulary=',D.vocabulary());
