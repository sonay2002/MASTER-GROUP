/* Node smoke test for the pure offline/conflict engine. */
const fs=require('fs'),vm=require('vm');
const store={};const sandbox={window:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../js/offline-engine.js','utf8'),sandbox);
const E=sandbox.window.MGSyncEngine;
if(E.decide({id:'1',_syncUpdatedAt:10},{id:'1',_cloudUpdatedAt:20},false)!=='remote')throw Error('remote newest');
if(E.decide({id:'1',_syncUpdatedAt:30},{id:'1',_cloudUpdatedAt:20},false)!=='local')throw Error('local newest');
if(E.decide({id:'1',_syncUpdatedAt:10},{id:'1',_cloudUpdatedAt:20},true)!=='local')throw Error('dirty local wins');
if(E.decide({id:'1',_syncUpdatedAt:10},{id:'1',_deleted:true,_deletedAt:20},false)!=='remote')throw Error('remote delete');
E.enqueue('estimate','a');E.enqueue('estimate','a');if(E.pending()!==1)throw Error('dedupe');
E.fail('estimate','a',{code:'network/offline'});if(E.pending()!==1)throw Error('retry queue');
E.remove('estimate','a');if(E.pending()!==0)throw Error('remove');
console.log('offline-engine-smoke: OK');
