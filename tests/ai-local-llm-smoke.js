const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const context={window:{MGCatalog:{data:[]}},console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise};
context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context);
if(context.window.MG_AI_SERVICE.version!=='v381-local-llm-qwen3') throw new Error('Version mismatch');
const st=context.window.MG_AI_SERVICE.getStatus();
if(st.remoteInference!==false||st.remoteApi!==false||st.remoteHost!==false) throw new Error('AI must not use remote inference/API');
console.log('AI local LLM integration smoke: OK');
