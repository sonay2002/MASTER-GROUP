/* Durable conflict-vault smoke test. */
const fs=require('fs'),vm=require('vm');
const store={};
const sandbox={window:{},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../js/offline-engine.js','utf8'),sandbox);
const E=sandbox.window.MGSyncEngine;
const local={id:'estimate-1',number:'MG-0001',total:1200,_serverRevision:2};
const remote={id:'estimate-1',number:'MG-0001',total:1500,_serverRevision:3};
if(!E.putConflict({id:'estimate-1',local,remote,remoteRevision:3}))throw Error('conflict was not stored');
const saved=E.getConflict('estimate-1');
if(!saved||saved.local.total!==1200||saved.remote.total!==1500||saved.remoteRevision!==3)throw Error('both conflict versions were not retained');
E.putConflict({id:'estimate-1',local:{...local,total:1300},remote,remoteRevision:3});
if(E.conflicts().length!==1||E.getConflict('estimate-1').local.total!==1300)throw Error('conflict update was not deduplicated');
if(!E.removeConflict('estimate-1')||E.getConflict('estimate-1'))throw Error('conflict was not removed');
console.log('offline-conflict-resolution-smoke: PASS');
