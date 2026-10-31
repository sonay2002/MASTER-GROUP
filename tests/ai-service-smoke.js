const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../js/mg-ai-service.js'), 'utf8');
let dictionaryCalls=0;
const context = {
  window: {__MG_AI_TEST__:{},MGCatalog:{data:[{name:'Отделочные работы',services:[{name:'Укладка плитки',unit:'м²'}]}]},MG_DICTIONARY_10M:{suggest:async()=>{dictionaryCalls++;return {changed:true,corrected:'Крепление плитка',suggestions:[{text:'Крепление плитка'}]}}}},
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
    if(JSON.stringify(body.models)!==JSON.stringify(['openrouter/free','google/gemma-4-26b-a4b-it:free','google/gemma-4-31b-it:free'])) throw new Error('Free model fallback list missing');
    if(body.provider) throw new Error('Provider sorting must remain automatic');
    const msg=String(body.messages?.find(x=>x.role==='user')?.content||'');
    const input=(msg.match(/Исходный текст пользователя:\s*(.*)$/m)||[])[1]||'';
    if(input==='provider error test')return {ok:false,status:502,json:async()=>({error:{message:'Provider returned error',metadata:{provider_name:'Example provider',raw:'upstream timeout'}}})};
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
      'штробовка канала канализацыи':'Штробовка канала канализации',
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
if (context.window.MG_AI_SERVICE.version !== 'v440-offline-fixes') throw new Error('Unexpected AI service version');
if (context.window.MG_AI_SERVICE.getStatus().remoteApi !== true) throw new Error('OpenRouter API must be enabled');
if (context.window.MG_AI_SERVICE.getStatus().localModelOptInRequired !== true) throw new Error('The 570 MB model must require a deliberate download action');
context.window.MG_AI_SERVICE.setOpenRouterKey('sk-or-v1-test');
const compatible=context.window.__MG_AI_TEST__.proofreadCandidateCompatible;
if(typeof compatible!=='function')throw new Error('Proofreader compatibility guard is not testable');
if(!compatible('штробовка канала канализацыи','Штробовка канала канализации'))throw new Error('A spelling correction for the requested example was rejected');
if(compatible('задний багажник','опорная ось'))throw new Error('An unrelated object replacement passed the proofreader guard');
if(compatible('крепление пластика','крепление плитки'))throw new Error('An unrelated material replacement passed the proofreader guard');
const sourceForOrder=source.indexOf('localLlmRepair(input');
const remoteForOrder=source.indexOf('remoteBrainSuggest(input');
if(sourceForOrder<0||remoteForOrder<0||sourceForOrder>remoteForOrder)throw new Error('Local proofreading must precede remote fallback');
if(!source.includes('if(!localLlmAutoEnabled&&!manual)return null'))throw new Error('Local model can start without opt-in');

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
    ['штробовка канала канализацыи', 'Штробовка канала канализации'],
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
  const providerFailure=await context.window.MG_AI_SERVICE.suggestServiceName({text:'provider error test'});
  if(!providerFailure.dictionaryUsed||!providerFailure.aiFallback||!/OPENROUTER_HTTP_502/.test(providerFailure.aiError||'')||!/Example provider/.test(providerFailure.aiError||'')||!/upstream timeout/.test(providerFailure.aiError||'')) throw new Error(`Local fallback/provider diagnostics missing: ${providerFailure.aiError}`);
  if(!context.window.MG_AI_SERVICE.rememberCorrection('штробовка канала канализацыи','Штробовка канала канализации'))throw new Error('Could not save an accepted personal correction');
  const remembered=await context.window.MG_AI_SERVICE.suggestServiceName({text:'штробовка канала канализацыи'});
  if(remembered.engine!=='personal-proofreader-memory'||remembered.corrected!=='Штробовка канала канализации')throw new Error('Saved correction was not reused');
  const backup=context.window.MG_AI_SERVICE.exportPersonalTerms(),restored=context.window.MG_AI_SERVICE.importPersonalTerms(backup);
  if(!restored.ok||restored.count<1)throw new Error('Personal corrections could not be exported and restored');
  if(dictionaryCalls!==0)throw new Error(`Dictionary fallback must be disabled, called ${dictionaryCalls} times`);
  console.log('AI OpenRouter smoke OK');
})();
