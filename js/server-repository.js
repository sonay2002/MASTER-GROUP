(function(){
  'use strict';
  const auth=()=>window.MGFirebaseClient?.getAuth?.();
  const references=new Map();
  const reference=path=>{const clean=String(path).replace(/^\/+|\/+$/g,'');if(!references.has(clean))references.set(clean,new Reference(clean));return references.get(clean)};
  async function request(path,method='GET',value){
    const response=await fetch(path,{method,credentials:'same-origin',headers:value===undefined?{}:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value),cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(result.error||'Ошибка сервера Acer'),{
      code:response.status===401?'auth/unauthenticated':(response.status===409?'database/conflict':'database/unavailable'),
      status:response.status,currentEstimate:result.currentEstimate||null,currentRevision:result.currentRevision??null
    });
    return result;
  }
  class Snapshot{
    constructor(path,value){this.key=path.split('/').filter(Boolean).pop()||null;this.value=value}
    val(){return this.value}
    exists(){return this.value!==null&&this.value!==undefined}
    forEach(callback){if(!this.value||typeof this.value!=='object')return false;for(const [key,value] of Object.entries(this.value)){if(callback({key,val:()=>value})===true)return true}return false}
  }
  class Reference{
    constructor(path){this.path=path.replace(/^\/+|\/+$/g,'');this.listeners=new Map()}
    child(path){return reference(this.path+'/'+String(path).replace(/^\/+|\/+$/g,''))}
    async once(){const result=await request('/api/tree?'+new URLSearchParams({path:this.path}));return new Snapshot(this.path,result.value??null)}
    async set(value){await request('/api/tree?'+new URLSearchParams({path:this.path}),'PUT',{value})}
    async update(value){await request('/api/tree?'+new URLSearchParams({path:this.path}),'PATCH',{value})}
    async remove(){await request('/api/tree?'+new URLSearchParams({path:this.path}),'DELETE')}
    on(event,callback,onError){
      const entry={event,callback,onError,last:undefined,timer:null};
      const poll=async()=>{try{const snapshot=await this.once();const value=snapshot.val();if(event==='value'){const serialized=JSON.stringify(value);if(serialized!==entry.last){entry.last=serialized;callback(snapshot)}}else if(event==='child_added'||event==='child_changed'||event==='child_removed'){const next=value&&typeof value==='object'?value:{};const previous=entry.last&&typeof entry.last==='object'?entry.last:{};if(entry.last===undefined){if(event==='child_added')Object.entries(next).forEach(([key,item])=>callback(new Snapshot(this.path+'/'+key,item)))}else if(event==='child_added'){for(const [key,item] of Object.entries(next))if(!(key in previous))callback(new Snapshot(this.path+'/'+key,item))}else if(event==='child_changed'){for(const [key,item] of Object.entries(next))if(key in previous&&JSON.stringify(previous[key])!==JSON.stringify(item))callback(new Snapshot(this.path+'/'+key,item))}else{for(const key of Object.keys(previous))if(!(key in next))callback(new Snapshot(this.path+'/'+key,null))}entry.last=JSON.parse(JSON.stringify(next))}}catch(error){if(onError)onError(error)}finally{entry.timer=setTimeout(poll,1800)}};
      this.listeners.set(callback,entry);poll();return callback;
    }
    off(event,callback){for(const [key,entry] of this.listeners){if((!event||entry.event===event)&&(!callback||callback===key)){clearTimeout(entry.timer);this.listeners.delete(key)}}}
  }
  const db={ref:path=>reference(path)};
  const repo={
    path:uid=>db.ref('users/'+uid),
    estimates:uid=>repo.path(uid).child('estimates'),
    estimate:(uid,id)=>repo.estimates(uid).child(String(id)),
    catalog:uid=>repo.path(uid).child('catalog'),
    company:uid=>repo.path(uid).child('company'),
    notifications:uid=>repo.path(uid).child('notifications'),
    meta:uid=>repo.path(uid).child('_meta'),
    sanitize:value=>value,
    async nextEstimateNumber(uid){return (await request('/api/next-estimate-number','POST',{})).number},
    async migrateFromFirebase(uid){
      const status=await request('/api/migration/status');
      if(status.done)return false;
      return !!(await window.MGFirebaseClient?.importLegacy?.(uid));
    },
    async writeEstimate(uid,estimate){
      const expectedRevision=Number(estimate._serverRevision)||0;
      const result=await request('/api/estimate/write','POST',{
        id:String(estimate.id),value:estimate,expectedRevision
      });
      return result.value;
    },
    async readEstimate(uid,id){return (await repo.estimate(uid,id).once('value')).val()},
    async confirmEstimate(uid,id){const value=await repo.readEstimate(uid,id);if(!value||value._deleted||String(value.id)!==String(id))throw Object.assign(new Error('Запись на Acer не подтверждена'),{code:'database/unavailable'});return value},
    async hardDelete(uid,id){const existing=await repo.readEstimate(uid,id)||{id:String(id)};existing._deleted=true;existing._purged=true;existing._deletedAt=Date.now();await repo.estimate(uid,id).set(existing);const saved=await repo.readEstimate(uid,id);if(!saved?._purged)throw Object.assign(new Error('Удаление не подтверждено'),{code:'database/unavailable'});return saved},
    async markDeleted(uid,id,at){const existing=await repo.readEstimate(uid,id)||{id:String(id)};existing.id=existing.id||String(id);existing._deleted=true;existing._deletedAt=at;await repo.estimate(uid,id).set(existing);return existing},
    async writeCatalog(uid,data){const value={data,_cloudUpdatedAt:Date.now()};await repo.catalog(uid).set(value);return value},
    async writeCompany(uid,data){const value={data,_cloudUpdatedAt:Date.now()};await repo.company(uid).set(value);return value},
    async verify(uid){await repo.meta(uid).child('lastClientCheck').set(Date.now());return true},
    async acknowledge(uid,extra={}){const value={...extra,lastSyncAt:Date.now()};await repo.meta(uid).update(value);return value}
  };
  window.MGServerRepository={db,request};
  window.MGFirebaseRepository=repo;
})();
