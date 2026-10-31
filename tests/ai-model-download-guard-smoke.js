const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(__dirname+'/../js/mg-ai-service.js','utf8');

function createService(seed={}){
  const values=new Map(Object.entries(seed));
  let fetchCalls=0;
  const context={
    window:{},document:{},navigator:{gpu:{}},console,setTimeout,clearTimeout,
    JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,Date,
    location:{origin:'https://example.test'},
    localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},
    fetch:async(_url,opts)=>{
      fetchCalls++;
      const body=JSON.parse(opts.body),msg=String(body.messages?.find(x=>x.role==='user')?.content||'');
      const text=(msg.match(/Исходный текст пользователя:\s*(.*)$/m)||[])[1]||'';
      return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({suggestions:[{text,note:'mock',confidence:.99}]})}}]})};
    }
  };
  context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
  context.window.MG_AI_SERVICE.setOpenRouterKey('sk-or-v1-test');
  return {service:context.window.MG_AI_SERVICE,getFetchCalls:()=>fetchCalls,getPending:()=>values.get('mg_qwen3_local_pending_v1')||null};
}

(async()=>{
  const fresh=createService();
  const first=fresh.service.getStatus();
  if(!first.localModelOptInRequired||first.localLlm!=='not-loaded')throw new Error('Fresh install should not download Qwen automatically');
  const result=await fresh.service.suggestServiceName({text:'штробовка канала канализацыи'});
  if(result.engine!=='openrouter-gemma4-free-brain'||fresh.service.getStatus().localLlm!=='not-loaded')throw new Error('Text entry triggered a local model download');
  if(fresh.getPending())throw new Error('Ordinary text entry left a model download marker');
  if(fresh.getFetchCalls()!==1)throw new Error('Online correction fallback did not run');

  const interrupted=createService({mg_qwen3_local_ready_v1:'1',mg_qwen3_local_pending_v1:'1'});
  const interruptedStatus=interrupted.service.getStatus();
  if(interruptedStatus.localLlm!=='retry-required'||interruptedStatus.localFirst)throw new Error('Interrupted download should require a manual retry');
  const afterReload=await interrupted.service.suggestServiceName({text:'крепление пластика'});
  if(afterReload.engine!=='openrouter-gemma4-free-brain'||interrupted.service.getStatus().localLlm!=='retry-required')throw new Error('App retried interrupted model download automatically');
  if(interrupted.getPending()!=='1')throw new Error('Interrupted model marker was cleared before a manual retry');
  console.log('AI model download guard smoke: PASS');
})().catch(err=>{console.error(err);process.exit(1)});
