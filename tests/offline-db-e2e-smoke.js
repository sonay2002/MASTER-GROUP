const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync('js/offline-db.js','utf8');
const records=new Map();
let reloads=0;
let hasStore=false;
const db={
  objectStoreNames:{contains(name){return hasStore;}},
  createObjectStore(){hasStore=true;return {};},
  transaction(){
    const tx={error:null};
    tx.objectStore=()=>({
      put(record){records.set(record.key,record);queueMicrotask(()=>tx.oncomplete&&tx.oncomplete());},
      delete(key){records.delete(String(key));queueMicrotask(()=>tx.oncomplete&&tx.oncomplete());},
      clear(){records.clear();queueMicrotask(()=>tx.oncomplete&&tx.oncomplete());},
      get(key){const req={};queueMicrotask(()=>{req.result=records.get(String(key))||undefined;req.onsuccess&&req.onsuccess();});return req;},
      getAll(){const req={};queueMicrotask(()=>{req.result=Array.from(records.values());req.onsuccess&&req.onsuccess();});return req;}
    });
    return tx;
  }
};
const indexedDB={open(){const req={};queueMicrotask(()=>{req.result=db;if(!hasStore&&req.onupgradeneeded)req.onupgradeneeded();if(req.onsuccess)req.onsuccess();});return req;}};
function makeStorage(seed={}){
  class Storage {
    constructor(){this.map=new Map(Object.entries(seed));}
    get length(){return this.map.size;}
    key(i){return Array.from(this.map.keys())[i]??null;}
    getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null;}
    setItem(k,v){this.map.set(String(k),String(v));}
    removeItem(k){this.map.delete(String(k));}
    clear(){this.map.clear();}
  }
  return new Storage();
}
function boot(localStorage,sessionStorage){
  const document={
    documentElement:{classList:{add(){},remove(){}}},
    head:{appendChild(){}},
    createElement(){return {textContent:''};}
  };
  const window={localStorage,document,indexedDB,dispatchEvent(){},addEventListener(){}};
  const navigator={storage:{persist:async()=>true}};
  const location={reload(){reloads++;}};
  const context={window,document,navigator,location,localStorage,sessionStorage,indexedDB,Storage:localStorage.constructor,console,Promise,Map,Set,Date,JSON,String,Number,Array,Object,Error,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}}};
  vm.runInNewContext(source,context,{filename:'offline-db.js'});
  return window.MGOfflineDB;
}
const check=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message)};
(async()=>{
  const key='master_group_estimates_v8';
  const value=JSON.stringify([{id:'estimate-1',client:'Saved client'}]);
  records.set(key,{key,value,savedAt:1});

  // First boot: data must recover from IndexedDB and ignore empty startup defaults.
  let ls=makeStorage();let dbApi=boot(ls,makeStorage());
  ls.setItem(key,'[]');
  await dbApi.ready;
  check(ls.getItem(key)===value,'missing local data is restored from IndexedDB, not replaced by boot defaults');
  check(reloads===1,'application reload is requested after synchronous-storage recovery');

  // Second boot: an already restored record must not be overwritten by startup defaults.
  ls=makeStorage({[key]:value});dbApi=boot(ls,makeStorage());
  ls.setItem(key,'[]');
  await dbApi.ready;
  check(ls.getItem(key)===value,'existing restored data survives the next startup cycle');
  check(dbApi.eligible('master_group_deleted_estimates_v1')&&dbApi.eligible('master_group_session_recovery_v1')&&dbApi.eligible('master_group_sync_conflicts_v1')&&dbApi.eligible('master_group_payments_v1')&&dbApi.eligible('mg_ai_personal_terms_v1')&&dbApi.eligible('mg_counter'),'trash, recovery, conflicts, finance, AI vocabulary and estimate counter are backed up');

  // A deliberate delete must delete the IndexedDB mirror as well.
  ls.removeItem(key);
  await new Promise(resolve=>setTimeout(resolve,0));
  check(!records.has(key),'removeItem also removes the IndexedDB backup');

  // Clearing local storage must not leave an old backup that resurrects deleted data.
  ls.setItem(key,value);
  await new Promise(resolve=>setTimeout(resolve,0));
  ls.clear();
  await new Promise(resolve=>setTimeout(resolve,0));
  check(records.size===0,'clear removes IndexedDB backups');

  ls=makeStorage();dbApi=boot(ls,makeStorage());await dbApi.ready;
  check(ls.getItem(key)===null,'deleted data is not resurrected on a later launch');
  console.log('Offline DB end-to-end smoke: 6 scenarios passed');
})().catch(e=>{console.error(e);process.exit(1);});
