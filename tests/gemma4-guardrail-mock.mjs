import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const source=fs.readFileSync(new URL('../js/mg-ai-service.js',import.meta.url),'utf8');
const patched=source
  .replace(/const LOCAL_LLM_CDN='[^']+';/,"const LOCAL_LLM_CDN='mock';")
  .replace("mod=await import(LOCAL_LLM_CDN);","mod=globalThis.__mockTransformers;");

const processor=async()=>({input_ids:{dims:[1,1]}});
processor.tokenizer={};
processor.apply_chat_template=()=>'<prompt>';
processor.batch_decode=async()=>['Травы канализац канализации'];
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
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise,TextEncoder,Response,URL
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(patched,context);
const ai=context.window.MG_AI_SERVICE;
assert.equal(await ai.warmupLocalLlm(),true,'mock Gemma should load');
const bad=await ai.suggestServiceName({text:'абракадабра'});
assert.notEqual(bad.corrected,'Травы канализац канализации','garbage model output must be rejected');
console.log('Qwen3.5 guardrail mock: PASS — malformed model output rejected');
