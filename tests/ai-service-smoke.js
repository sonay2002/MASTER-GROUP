const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../js/mg-ai-service.js'), 'utf8');
let dictionaryCalls=0;
const context = {
  window: {MGCatalog:{data:[{name:'Отделочные работы',services:[{name:'Укладка плитки',unit:'м²'}]}]},MG_DICTIONARY_10M:{suggest:async()=>{dictionaryCalls++;return {changed:true,corrected:'Крепление плитка',suggestions:[{text:'Крепление плитка'}]}}}},
  console,
  setTimeout,
  clearTimeout,
  JSON,
  String,
  Number,
  Map,
  Object,
  Array,
  Error,
  Set,
  Math,
  Promise,
  document:{},
  location:{origin:'https://example.github.io'},
  localStorage:(()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})(),
  fetch:async (_url,opts)=>{
    const body=JSON.parse(opts.body);
    const msg=String(body.messages?.find(x=>x.role==='user')?.content||'');
    const input=(msg.match(/Исходный текст:\s*(.*)$/m)||[])[1]||'';
    const map={
      'укладк кафел':'Укладка кафеля',
      'крепление плитка':'Крепление плитки',
      'крепление пластика':'Крепление пластика',
      'montare faianta baie':'montare faianta baie',
      'убрть корни дерева':'Убрать корни дерева',
      'покос травы участок':'Покос травы на участке',
      'устанвка раковн':'Установка раковины',
      'старая плитка в baie':'Старая плитка в baie',
      'покрас стен':'Покрась стены',
      'schimbare teava apa':'schimbare teava apa',
      'Задняя багажник':'Задний багажник',
      'задний багажник':'опорная ось',
      'фиксац генератора':'Фиксация генератора',
      'ремнт двгателя':'Ремонт двигателя',
      'задний маятник':'Ремонт заднего моста'
    };
    const text=map[input]||input;
    return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({suggestions:[{text,note:'OpenRouter AI smoke mock',confidence:.99}]})}}]})};
  }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(source, context, {filename:'mg-ai-service.js'});

if (!context.window.MG_AI_SERVICE) throw new Error('MG_AI_SERVICE missing');
if (context.window.MG_AI_SERVICE.version !== 'v426-ai-only') throw new Error('Unexpected AI service version');
if (context.window.MG_AI_SERVICE.getStatus().remoteApi !== true) throw new Error('OpenRouter API must be enabled');
context.window.MG_AI_SERVICE.setOpenRouterKey('sk-or-v1-test');

(async () => {
  const cases = [
    ['укладк кафел', 'Укладка кафеля'],
    ['крепление плитка', 'Крепление плитки'],
    ['крепление пластика', 'Крепление пластика'],
    ['montare faianta baie', 'montare faianta baie'],
    ['убрть корни дерева', 'Убрать корни дерева'],
    ['покос травы участок', 'Покос травы на участке'],
    ['устанвка раковн', 'Установка раковины'],
    ['старая плитка в baie', 'Старая плитка в baie'],
    ['покрас стен', 'Покрась стены'],
    ['schimbare teava apa', 'schimbare teava apa'],
    ['Задняя багажник', 'Задний багажник'],
    ['задний багажник', 'Задний багажник'],
    ['фиксац генератора', 'Фиксация генератора'],
    ['ремнт двгателя', 'Ремонт двигателя'],
    ['задний маятник', 'Задний маятник']
  ];
  for (const [input, expected] of cases) {
    const result = await context.window.MG_AI_SERVICE.suggestServiceName({text: input, direction: 'Клининг участка'});
    if (!result?.corrected) throw new Error(`No correction for: ${input}`);
    if (input === 'задний багажник' && /опорн|ось/i.test(result.corrected||'')) throw new Error(`Recognized object was replaced: ${result.corrected}`);
    if (input === 'задний маятник' && /мост/i.test(result.corrected||'')) throw new Error(`Unknown object was replaced: ${result.corrected}`);
    if (result?.engine !== 'openrouter-gemma4-free-brain' && !['задний маятник','задний багажник'].includes(input)) throw new Error(`Unexpected engine for: ${input}: ${result.engine}`);
        if (input === 'укладк кафел' && result.corrected !== expected) throw new Error(`Unexpected correction: ${result.corrected}`);
    if (input === 'montare faianta baie' && /установк|монтаж|ремонт/i.test(result.corrected)) throw new Error(`The proofreader invented a service: ${result.corrected}`);
  }
  if(dictionaryCalls!==0)throw new Error(`Dictionary fallback must be disabled, called ${dictionaryCalls} times`);
  console.log('AI OpenRouter smoke OK');
})();
