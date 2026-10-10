const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(__dirname + '/../js/estimate-core.js', 'utf8');
const store = new Map(), elements = {};
function el(id) {
  if (elements[id]) return elements[id];
  const x = {id, hidden:false, value:'', textContent:'', innerHTML:'', disabled:false, dataset:{}, style:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}}, focus(){},setSelectionRange(){},setAttribute(){},
    querySelector(){return null},querySelectorAll(){return []}};
  elements[id] = x; return x;
}
['client','phone','address','document','toast','mode','flowNote','editor','editorDefaultTop','calcEditorTop','step1','step3','step4','step5','count','sum','saved'].forEach(el);
const localStorage = {getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,String(v));},removeItem(k){store.delete(k);}};
const state = {screen:'editor',step:2,id:null,directions:[{name:'Сантехника',items:[{id:'item-1',name:'Установка раковины',qty:1,unit:'шт',price:100}]}],activeDirection:0,pendingDirectionName:null,estimate:null};
const key='master_group_estimates_v8';
const storage={KEY:key,OLD:'old',DRAFTS:'drafts',get(k){return localStorage.getItem(k)},saved(){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return[]}},persist(a){localStorage.setItem(key,JSON.stringify(a));return true},drafts(){return[]},persistDrafts(){}};
const document={addEventListener(){},getElementById:el,querySelector(){return null},querySelectorAll(){return []}};
const context={window:{MGStorage:storage,MGState:state,MGCatalog:{data:[],cats:[],svc:[],save(){}},MGEstimate:{allItems(){return state.directions.flatMap(d=>d.items||[])},total(){return state.directions.flatMap(d=>d.items||[]).reduce((n,x)=>n+(Number(x.qty)||0)*(Number(x.price)||0),0)},normalizeDirections(x){return x?.directions||[]},allItemsFromEstimate(e){return e?.items||[]}},MGEstimateUI:{init(){},renderCats(){},renderDirectionServiceModal(){},renderServiceDirections(){},renderServices(){},renderItems(){},renderReview(){},openDirectionServiceModal(){},closeDirectionServiceModal(){}},MG_AI_SERVICE:{async suggestServiceName({text}){return {corrected:text,suggestions:[{text}],engine:'local',offline:true}}},MGEstimateTemplates:{get(){return 'template1'}},MGDataModel:{normalizeEstimate(e){return e}},__mgAllocateEstimateNumber:async()=>null,__mgCloudSaveEstimate:async()=>false},document,console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,Date,Intl,localStorage,sessionStorage:localStorage,crypto:{randomUUID(){return 'estimate-new-1'}},navigator:{},location:{},addEventListener(){},scrollTo(){}};
context.window.window=context.window;context.window.document=document;context.window.localStorage=localStorage;context.window.crypto=context.crypto;context.window.addEventListener=context.addEventListener;context.window.scrollTo=context.scrollTo;context.window.__mgToast=()=>{};
vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  await context.window.MGAppCore.create();
  let rows=JSON.parse(localStorage.getItem(key)||'[]');
  if(rows.length!==1)throw new Error('A new estimate was not saved when the cloud allocator returned null');
  if(rows[0].number!=='MG-0001'||rows[0]._localNumberPending!==true)throw new Error('Offline temporary estimate number/marker missing');
  if(state.id!=='estimate-new-1')throw new Error('Local estimate state was not retained');
  // Saving an offline-created estimate again must preserve the pending cloud-number marker.
  state.directions[0].items[0].price=125;
  await context.window.MGAppCore.create();
  rows=JSON.parse(localStorage.getItem(key)||'[]');
  if(rows[0]._localNumberPending!==true||rows[0].total!==125)throw new Error('Editing an offline estimate lost its sync marker or changes');
  console.log('Offline estimate create/update smoke: PASS');
})().catch(err=>{console.error(err);process.exit(1)});
