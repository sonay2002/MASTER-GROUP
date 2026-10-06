const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const context={window:{MGCatalog:{data:[]}},console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise};
context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context);
if(context.window.MG_AI_SERVICE.version!=='v414-openrouter-gemma4-fast') throw new Error('Version mismatch');
const st=context.window.MG_AI_SERVICE.getStatus();
if(st.remoteApi!==true||st.remoteHost!==true) throw new Error('OpenRouter API must be available');
console.log('AI remote brain integration smoke: OK');
