const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const catalog=[
{name:'Сантехнические работы',services:[{name:'Монтаж труб'},{name:'Установка сантехники'},{name:'Поиск и устранение протечки'},{name:'Демонтаж сантехники'}]},
{name:'Установка видеонаблюдения',services:[{name:'Установка камеры'},{name:'Настройка видеорегистратора'},{name:'Прокладка кабеля'}]},
{name:'Отделочные работы',services:[{name:'Укладка плитки'},{name:'Покраска стен'},{name:'Шпаклевка стен'}]},
{name:'Металлоконструкции и сварка',services:[{name:'Изготовление металлоконструкции'},{name:'Сварочные работы'},{name:'Монтаж металлоконструкции'},{name:'Покраска металла'}]}
];
const context={window:{MGCatalog:{data:catalog}},console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
 const cases=[
  ['багажник',/^(Установка|Монтаж|Ремонт|Замена|Демонтаж|Покраска) багажника$/],
  ['богажник',/багажник/],
  ['задняя багажник',/^Задний багажник$/],
  ['креплние мотра',/^Крепление мотора$/],
  ['креплние мотра к рам',/^Крепление мотора к раме$/],
  ['штробавко канала канализации',/^Штробление канала канализации$/],
  ['штробавко стен',/^Штробление стен$/],
  ['устанвка раковн',/^Установка раковины$/],
  ['уклдк кафла ваной',/^Укладка плитки в ванной комнате$/],
  ['покраска стена кухня',/^Покраска стен на кухне$/],
  ['вывоз строй мусор',/^Вывоз строительного мусора$/],
  ['сантехика',/сантехники$/]
 ];
 for(const [input,rx] of cases){
  const r=await context.window.MG_AI_SERVICE.suggestServiceName({text:input});
  if(!rx.test(r.corrected)) throw new Error(`${input} => ${r.corrected}`);
  if(!r.suggestions?.length) throw new Error(`no suggestions: ${input}`);
  if(r.suggestions.some(x=>/Травы канализац|Травы/i.test(x.text))) throw new Error(`garbage candidate for ${input}`);
  console.log('PASS',input,'=>',r.corrected,'|',r.suggestions.map(x=>x.text).join(' || '));
 }
 const bad=await context.window.MG_AI_SERVICE.suggestServiceName({text:'устанвка раковн'});
 if(bad.suggestions.some(x=>/камер/i.test(x.text))) throw new Error('irrelevant camera suggestion leaked');
 const bad2=await context.window.MG_AI_SERVICE.suggestServiceName({text:'покраска стена кухня'});
 if(bad2.suggestions.some(x=>/металл/i.test(x.text))) throw new Error('irrelevant metal suggestion leaked');
 console.log('WHOLE-TEXT SEMANTIC SMOKE: OK');
})();
