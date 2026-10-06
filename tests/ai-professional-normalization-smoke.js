const fs=require('fs'), vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const context={
 window:{MGCatalog:{data:[]}}, console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,
 document:{},location:{origin:'https://example.github.io'},
 localStorage:(()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})(),
 fetch:async (_url,opts)=>{
  const body=JSON.parse(opts.body); const msg=String(body.messages?.find(x=>x.role==='user')?.content||'');
  const input=(msg.match(/Исходный текст пользователя:\s*(.*)$/m)||[])[1]||'';
  const map={
    'сборка разборки квадроцикла':'Сборка разборки квадроцикла',
    'разборка сборка квадроцикла':'Разборка сборка квадроцикла',
    'задняя багажник':'Задняя багажник',
    'креплние мотра к рам':'Крепление мотора к раме'
  };
  const text=map[input]||input;
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({suggestions:[{text,note:'mock',confidence:.99}]})}}]})};
 }
};
context.window.window=context.window;
vm.createContext(context); vm.runInContext(source,context,{filename:'mg-ai-service.js'});
context.window.MG_AI_SERVICE.setOpenRouterKey('sk-or-v1-test');
(async()=>{
 const cases=[
  ['сборка разборки квадроцикла','Разборка и сборка квадроцикла'],
  ['разборка сборка квадроцикла','Разборка и сборка квадроцикла'],
  ['задняя багажник','Задний багажник'],
  ['креплние мотра к рам','Крепление мотора к раме']
 ];
 for(const [input,expected] of cases){
  const r=await context.window.MG_AI_SERVICE.suggestServiceName({text:input,direction:'Металлоконструкции и сварка'});
  if(r.corrected!==expected) throw new Error(`${input} => ${r.corrected}; expected ${expected}`);
 }
 console.log('AI professional normalization smoke: PASS');
})();
