const fs=require('fs/promises');const vm=require('vm');const path=require('path');
(async()=>{
 const root=path.join(__dirname,'..');
 const context={console,TextEncoder,DecompressionStream,Response,URL,setTimeout,clearTimeout};
 context.window={MGCatalog:{data:[{name:'Автомобильные услуги',services:[{name:'Установка багажника',unit:'шт'},{name:'Ремонт заднего багажника',unit:'шт'},{name:'Замена бампера',unit:'шт'}]}]}};
 context.fetch=async url=>{const u=String(url).replace(/^\.\//,'');const data=await fs.readFile(path.join(root,u));return new Response(data,{status:200});};
 vm.createContext(context);
 vm.runInContext(await fs.readFile(path.join(root,'js/mg-dictionary-10m.js'),'utf8'),context);
 vm.runInContext(await fs.readFile(path.join(root,'js/mg-ai-service.js'),'utf8'),context);
 const ai=context.window.MG_AI_SERVICE;
 const a=await ai.suggestServiceName({text:'багажник'});
 if(!a.suggestions.some(x=>/багажник/i.test(x.text))) throw new Error('No phrase-memory candidates for single word');
 if(!a.suggestions.some(x=>/установка багажника/i.test(x.text))) throw new Error('No useful action+object phrase retrieved');
 const b=await ai.suggestServiceName({text:'задняя багажник'});
 if(b.corrected!=='Задний багажник') throw new Error('Agreement failed: '+b.corrected);
 console.log('Reverse phrase-memory smoke: PASS');
 console.log(JSON.stringify({single:a.suggestions.slice(0,5),agreement:b.corrected},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
