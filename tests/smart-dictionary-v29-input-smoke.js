const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={window:{},console,document:{readyState:'loading',addEventListener(){},getElementById(){return null},documentElement:{}},MutationObserver:function(){this.observe=()=>{}}}; vm.createContext(ctx);
const dir=path.join(__dirname,'../js/mg-dict');
for(const f of ['dictionary-actions.js','dictionary-works.js','dictionary-01.js','dictionary-02.js','dictionary-03.js','dictionary-04.js','dictionary-05.js','smart-search.js']) vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
(function(){
  const S=ctx.window.MG_SMART_DICT;
  function assert(name,ok){if(!ok)throw new Error('FAIL '+name);console.log('OK '+name)}
  if(!S)throw new Error('MG_SMART_DICT missing');
  assert('corpus=500000',S.count()===500000);
  assert('single letter v',S.suggest('в',15).length>0);
  assert('single letter p',S.suggest('п',15).some(x=>/покраска/i.test(x)));
  assert('infinitive восстановить',S.suggest('восстановить',15).includes('восстановление'));
  assert('context покраска п',S.suggest('покраска п',15).some(x=>/пластик/i.test(x)));
  assert('typo металоконструкция',S.suggest('металоконструкция',15).some(x=>/металлоконструкция/i.test(x)));
  assert('context задний м',S.suggest('задний м',15).some(x=>/маятник/i.test(x)));
  assert('context задний ба',S.suggest('задний ба',15).some(x=>/багажник/i.test(x)));
  assert('typo пакос',S.suggest('пакос',15)[0].toLocaleLowerCase('ru')==='покос');
  assert('typo покос трави',S.suggest('покос трави',15)[0].toLocaleLowerCase('ru')==='травы');
  assert('typo погрузка мусара',S.suggest('погрузка мусара',15)[0].toLocaleLowerCase('ru')==='мусор');
  assert('verb убрат мусор',S.suggest('убрат мусор',15)[0].toLocaleLowerCase('ru')==='мусор');
  assert('transposition демонтирвоать',S.suggest('демонтирвоать',15)[0].toLocaleLowerCase('ru')==='демонтаж');
  assert('object маятника',S.suggest('маятника',15)[0].toLocaleLowerCase('ru')==='маятник');
  assert('no false action for object',S.actionCanon('маятника')===null);
  console.log('smart dictionary v32 OK');
})();
