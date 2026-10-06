// Master Group v35 — severe fuzzy recognition + false-positive regression.
const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},console,document:{readyState:'loading',addEventListener(){},getElementById(){return null},documentElement:{}},MutationObserver:function(){this.observe=()=>{}}};
vm.createContext(ctx);
const dir=path.join(__dirname,'../js/mg-dict');
for(const f of ['dictionary-actions.js','dictionary-works.js','dictionary-01.js','dictionary-02.js','dictionary-03.js','dictionary-04.js','dictionary-05.js','smart-search.js']) vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
const D=ctx.window.MG_SMART_DICT;
const fold=s=>String(s).toLocaleLowerCase('ru').replace(/ё/g,'е');
function expectSuggest(q,w){
  const list=D.suggest(q,15).map(fold);
  if(!list.includes(fold(w))) throw Error(`suggest failed: ${q} -> ${w}; got ${D.suggest(q,15).join(', ')}`);
}

function expectTop(q,w){
  const top=D.suggest(q,1)[0]||'';
  if(fold(top)!==fold(w)) throw Error(`top suggestion failed: ${q} -> ${w}; got ${top}`);
}

function expectCorrect(q,w){
  const got=fold(D.correctText(q));
  if(got!==fold(w)) throw Error(`correct failed: ${q} -> ${w}; got ${D.correctText(q)}`);
}
const severe=[
 ['шпклвк','шпаклёвка'],['шпакевлка','шпаклёвка'],['гдроизолц','гидроизоляция'],
 ['металаконстр','металлоконструкция'],['металокнструкция','металлоконструкция'],['сврак','сварка'],
 ['провдка','проводка'],['отдлка','отделка'],['керамогрнит','керамогранит'],['подклчение','подключение'],
 ['устанвк','установка'],['демонстаж','демонтаж'],['покос трави','травы'],['пакраска','покраска'],
 ['утеплене','утепление'],['канализацыя','канализация'],['водоправод','водопровод'],['бетенирование','бетонирование']
];
for(const [q,w] of severe){expectSuggest(q,w); if(q==='покос трави') expectCorrect(q,'Покос травы'); else expectCorrect(q,w);}
for(const q of ['отделка','проводка','сантехника','электрика','водоснабжение','канализация','металлоконструкция','покраска']){
  if(D.correctText(q)!==q) throw Error(`false correction: ${q} -> ${D.correctText(q)}`);
}
expectSuggest('покраска п','Пластик');
expectTop('покраска п','Пластик');
expectSuggest('задний м','Задний маятник');
expectTop('задний м','Задний маятник');
expectSuggest('металлоконструкция з','Задний маятник');
console.log('smart dictionary v35 fuzzy stress OK; corpus=',D.count(),'vocabulary=',D.vocabulary());
