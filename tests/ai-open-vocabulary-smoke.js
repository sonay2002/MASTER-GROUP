const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const context={window:{MGCatalog:{data:[
  {name:'Отделочные работы',services:[{name:'Укладка плитки',unit:'м²'},{name:'Покраска стен',unit:'м²'}]},
  {name:'Сантехника',services:[{name:'Монтаж труб',unit:'м'},{name:'Установка раковины',unit:'шт'}]}
]}},console,setTimeout,clearTimeout,Promise,JSON,String,Number,Map,Object,Array,Error,Set,Math};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
 const cases={
  'крепл мотора':'Крепление мотора',
  'крепление мотор':'Крепление мотора',
  'fixare motor':'Фиксация мотора',
  'prindere motor':'Крепление мотора',
  'kreplenie motora':'Крепление мотора',
  'фиксац генератора':'Фиксация генератора',
  'сверл дырк':'Сверление отверстия',
  'сверление бетона':'Сверление бетона',
  'неизвестная новая услуга':'Неизвестная новая услуга',
  'что-то совершенно новое':'Что то совершенно новое',
  'montare faianta baie':'Укладка плитки в ванной комнате',
  'задний богашек':'Задний багажник',
  'покрас стен':'Покраска стен'
 };
 for(const [input,expected] of Object.entries(cases)){
   const r=await context.window.MG_AI_SERVICE.suggestServiceName({text:input,direction:''});
   if(!r?.corrected)throw new Error('No result: '+input);
   if(r.offline!==true||!['master-local-ai-open-v4','master-ai-with-10m-memory','master-semantic-brain-v408','master-semantic-brain-v410','openrouter-gemma4-free-brain','native-local-ai','local-llm-qwen3-0.6b'].includes(r.engine))throw new Error('Not autonomous: '+input);
   if(r.corrected!==expected)throw new Error(`${input} => ${r.corrected}; expected ${expected}`);
 }
 console.log('AI open-vocabulary smoke: PASS');
})();
