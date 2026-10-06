const fs=require('fs/promises');
const vm=require('vm');
const root=require('path').join(__dirname,'..');
(async()=>{
  const context={console,TextEncoder,DecompressionStream,Response,URL,setTimeout,clearTimeout};
  context.window={};
  context.fetch=async(url)=>{
    const u=String(url).replace(/^\.\//,'');
    const data=await fs.readFile(require('path').join(root,u));
    return new Response(data,{status:200});
  };
  vm.createContext(context);
  vm.runInContext(await fs.readFile(require('path').join(root,'js/mg-dictionary-10m.js'),'utf8'),context);
  vm.runInContext(await fs.readFile(require('path').join(root,'js/mg-ai-service.js'),'utf8'),context);
  const dict=context.window.MG_DICTIONARY_10M; const ai=context.window.MG_AI_SERVICE;
  if(dict.entryCount!==10000000)throw new Error('Dictionary API count mismatch');
  const expected=[
    ['креплние','крепление'],['мотра','мотора'],['рам','рама'],['устанвка','установка'],['раковн','раковина'],
    ['сбрка','сборка'],['двигател','двигатель'],['уклдк','укладка'],['кафла','кафель'],['ваной','ванной'],
    ['убрть','убрать'],['интелект','интеллект'],['искуственный','искусственный']
  ];
  for(const [bad,good] of expected){const rows=await dict.searchToken(bad); if(!rows.some(x=>x.text===good))throw new Error(`${bad} not retrieved as ${good}`);}
  const cases={
    'креплние мотра':'Крепление мотора',
    'креплние мотра к рам':'Крепление мотора к раме',
    'устанвка раковн':'Установка раковины',
    'сбрка двигател':'Сборка двигателя',
    'уклдк кафла ваной':'Укладка кафеля в ванной комнате',
    'убрть корни дерева':'Удаление корней дерева',
    'интелект':'Интеллект'
  };
  for(const [good,expectedGood] of [['корни','корни'],['мотора','мотора'],['раме','раме']]){const rows=await dict.searchToken(good);if(!rows.some(x=>x.text===expectedGood))throw new Error(`legitimate form changed: ${good}`);}
  for(const [input,expectedOut] of Object.entries(cases)){
    const r=await ai.suggestServiceName({text:input});
    if(r.corrected!==expectedOut)throw new Error(`${input} => ${r.corrected}; expected ${expectedOut}`);
    if(r.dictionaryUsed!==true)throw new Error(`Dictionary stage not used for ${input}`);
    if(!r.changed)throw new Error(`No change flagged for ${input}`);
  }
  console.log('AI 10M dictionary RAG smoke: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
