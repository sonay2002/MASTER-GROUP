(function(){
  'use strict';
  /* Master Group v147 — Firebase repository. Keeps database paths and raw Firebase
     operations outside the sync orchestrator. Existing paths are intentionally unchanged. */
  const C=window.MGFirebaseClient;
  const KEY='master_group_estimates_v8',CAT='master_group_catalog_v1',COMP='master_group_company_v1';
  const safe=(value,seen)=>{
    if(value===undefined)return null;
    if(typeof value==='number'&&!Number.isFinite(value))return 0;
    if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
    if(!seen)seen=new WeakSet();
    if(typeof value==='object'){
      if(seen.has(value))return null;seen.add(value);
      if(Array.isArray(value))return value.map(v=>safe(v,seen));
      const out={};for(const [k,v] of Object.entries(value)){if(/[.#$\[\]\/]/.test(k))continue;out[k]=safe(v,seen)}return out;
    }
    return null;
  };
  const repo={
    path(uid){return C.getDb().ref('users/'+uid)},
    estimates(uid){return repo.path(uid).child('estimates')},
    estimate(uid,id){return repo.estimates(uid).child(String(id))},
    catalog(uid){return repo.path(uid).child('catalog')},
    company(uid){return repo.path(uid).child('company')},
    notifications(uid){return repo.path(uid).child('notifications')},
    meta(uid){return repo.path(uid).child('_meta')},
    async nextEstimateNumber(uid){
      const ref=repo.meta(uid).child('estimateNumber');
      const snap=await repo.estimates(uid).once('value');
      let max=0;
      snap.forEach(ch=>{const n=Number(String(ch.val()?.number||'').replace(/^MG-/i,''));if(Number.isFinite(n)&&n>max)max=n});
      const r=await ref.transaction(v=>{const n=Math.max(Number(v)||0,max);return n+1});
      if(!r.committed)throw new Error('Номер сметы не подтверждён');
      return Number(r.snapshot.val());
    },
    sanitize:value=>safe(value),
    async writeEstimate(uid,estimate){return repo.estimate(uid,estimate.id).set(safe(estimate))},
    async readEstimate(uid,id){const s=await repo.estimate(uid,id).once('value');return s.val()},
    async confirmEstimate(uid,id){const v=await repo.readEstimate(uid,id);if(!v||v._deleted||String(v.id)!==String(id))throw Object.assign(new Error('Cloud write was not confirmed'),{code:'database/unavailable'});return v},
    async hardDelete(uid,id){const at=Date.now();const existing=await repo.readEstimate(uid,id);const payload=safe(existing||{id:String(id)});payload.id=payload.id||String(id);payload._deleted=true;payload._purged=true;payload._cloudUpdatedAt=C.serverTimestamp();payload._deletedAt=at;await repo.estimate(uid,id).set(payload);const v=await repo.readEstimate(uid,id);if(!v||v._deleted!==true||v._purged!==true)throw Object.assign(new Error('Permanent delete was not confirmed'),{code:'database/unavailable'});return v},
    async markDeleted(uid,id,at){
      const existing=await repo.readEstimate(uid,id);
      const payload=safe(existing||{id:String(id)});
      payload.id=payload.id||String(id); payload._deleted=true; payload._cloudUpdatedAt=C.serverTimestamp(); payload._deletedAt=at;
      await repo.estimate(uid,id).set(payload);
      const v=await repo.readEstimate(uid,id);if(!v||v._deleted!==true||String(v._deletedAt)!==String(at))throw Object.assign(new Error('Delete write was not confirmed'),{code:'database/unavailable'});return v},
    async writeCatalog(uid,data){await repo.catalog(uid).set({data:safe(data),_cloudUpdatedAt:C.serverTimestamp()});const s=await repo.catalog(uid).once('value');if(!s.exists()||!Array.isArray(s.val()?.data))throw Object.assign(new Error('Catalog write not confirmed'),{code:'database/unavailable'});return s.val()},
    async writeCompany(uid,data){await repo.company(uid).set({data:safe(data),_cloudUpdatedAt:C.serverTimestamp()});const s=await repo.company(uid).once('value');if(!s.exists())throw Object.assign(new Error('Company write not confirmed'),{code:'database/unavailable'});return s.val()},
    async verify(uid){const probe=repo.meta(uid).child('lastClientCheck');await probe.set(C.serverTimestamp());const s=await probe.once('value');if(!s.exists())throw Object.assign(new Error('Cloud verification failed'),{code:'database/unavailable'});return true},
    async acknowledge(uid,extra={}){await repo.meta(uid).update({...extra,lastSyncAt:C.serverTimestamp()});const s=await repo.meta(uid).once('value');if(!s.exists())throw Object.assign(new Error('Sync acknowledgement missing'),{code:'database/unavailable'});return s.val()}
  };
  window.MGFirebaseRepository=repo;
})();
