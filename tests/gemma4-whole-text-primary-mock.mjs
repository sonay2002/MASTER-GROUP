import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const source=fs.readFileSync(new URL('../js/mg-ai-service.js',import.meta.url),'utf8')
  .replace(/const LOCAL_LLM_CDN='[^']+';/,"const LOCAL_LLM_CDN='mock';")
  .replace("mod=await import(LOCAL_LLM_CDN);","mod=globalThis.__mockTransformers;");

const processor=async()=>({input_ids:{dims:[1,4]}});
processor.tokenizer={};
processor.apply_chat_template=()=>'<prompt>';
processor.batch_decode=()=>['Разборка и сборка квадроцикла'];
const mock={
  env:{useBrowserCache:true,allowRemoteModels:true},
  AutoProcessor:{from_pretrained:async()=>processor},
  Qwen3_5ForConditionalGeneration:{from_pretrained:async()=>({async generate(){return {slice(){return [];}}}})}
};
const context={
  __mockTransformers:mock,
  window:{MGCatalog:{data:[]},dispatchEvent(){}},
  document:{},
  navigator:{gpu:{async requestAdapter(){return {};}}},
  CustomEvent:class{},
  console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,TextEncoder,Response,URL
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context);
const ai=context.window.MG_AI_SERVICE;
await ai.warmupLocalLlm();
const r=await ai.suggestServiceName({text:'разборко зборка квадрашкла'});
assert.equal(r.corrected,'Разборка и сборка квадроцикла');
assert.equal(r.engine,'local-llm-qwen3.5-2b-whole-text');
assert.equal(r.localInference,true);
assert.equal(r.remoteInference,false);
console.log('Qwen3.5 whole-text primary mock: PASS');
