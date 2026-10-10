const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/estimate-core.js','utf8');
const els={};
function makeEl(id){
  const el={id,hidden:true,value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},
    classList:{toggle(){},add(){},remove(){}},focus(){},setSelectionRange(){},
    querySelector(sel){ if(sel==='[data-ai-apply]') return els.aiMain; return null; },
    querySelectorAll(){return[];},setAttribute(){},removeAttribute(){}};
  els[id]=el; return el;
}
els.directionServiceQuickInput=makeEl('directionServiceQuickInput');
els.directionServiceAiSuggestion=makeEl('directionServiceAiSuggestion');
els.aiMain={textContent:'',disabled:false,dataset:{}};
els.directionServiceAiAlternatives=makeEl('directionServiceAiAlternatives');
els.directionServiceAiStatus=makeEl('directionServiceAiStatus');
const listeners={};
const document={addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn);},getElementById(id){return els[id]||makeEl(id);},querySelector(){return null;},querySelectorAll(){return[];}};
const state={directions:[{name:'Сантехника',items:[]}],activeDirection:0,pendingDirectionName:null};
let calls=0;
const context={
  window:{
    MGStorage:{KEY:'k',OLD:'o',DRAFTS:'d',get(){},set(){},saved(){return[]},persist(){return true},drafts(){return[]},persistDrafts(){}},
    MGState:state,
    MGCatalog:{data:[{name:'Сантехника',services:[]}],cats:[],svc:[],save(){}},
    MGEstimate:{allItems(){return[]},total(){return 0},normalizeDirections(x){return x},allItemsFromEstimate(){return[]}},
    MGEstimateUI:{init(){},renderCats(){},renderDirectionServiceModal(){},renderServiceDirections(){},renderServices(){},renderItems(){},renderReview(){},renderCalcDirectionPicker(){},renderCalcPicker(){},renderReview(){}},
    MG_AI_SERVICE:{async suggestServiceName({text}){calls++; await new Promise(r=>setTimeout(r,text==='первое слово'?500:15)); return {corrected:text==='первое слово'?'Первое слово — старый результат':'Второе слово — актуальный результат',suggestions:[{text:'x'}],engine:'master-local-ai-open-v4',offline:true};}}
  },
  document,console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,Date,Intl,location:{},navigator:{},crypto:{randomUUID(){return 'x'}}
};
context.window.window=context.window;context.window.document=document;context.window.scrollTo=()=>{};context.window.crypto=context.crypto;context.window.navigator=context.navigator;context.window.location=context.location;
vm.createContext(context);vm.runInContext(source,context,{filename:'estimate-core.js'});
(async()=>{
  els.directionServiceQuickInput.value='первое слово';
  for(const fn of (listeners.input||[])) fn({target:els.directionServiceQuickInput});
  await new Promise(r=>setTimeout(r,650));
  if(els.directionServiceAiSuggestion.hidden) throw new Error('AI card should stay visible while analyzing');
  els.directionServiceQuickInput.value='второе слово';
  for(const fn of (listeners.input||[])) fn({target:els.directionServiceQuickInput});
  await new Promise(r=>setTimeout(r,700));
  if(els.aiMain.textContent!=='Второе слово — актуальный результат') throw new Error('Stale AI result overwrote current input');
  context.window.__mgResetServiceAi();
  await new Promise(r=>setTimeout(r,100));
  if(els.directionServiceAiSuggestion.hidden) throw new Error('Reset incorrectly hid persistent AI card');
  if(calls<2) throw new Error('Expected both test requests to run');
  console.log('AI UI race smoke: PASS');
})();
