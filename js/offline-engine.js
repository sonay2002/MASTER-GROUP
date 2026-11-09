/* Master Group v148 — offline queue and conflict decision engine. */
(function(){
  'use strict';
  const KEY='master_group_sync_queue_v1';
  const META='master_group_sync_meta_v1';
  const CONFLICTS='master_group_sync_conflicts_v1';
  const now=()=>Date.now();
  const scoped=key=>{try{return window.__mgAccountStorageKey?window.__mgAccountStorageKey(key):key}catch(_){return key}};
  function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(scoped(key))||'null');return v??fallback}catch(e){return fallback}}
  function writeJson(key,v){try{localStorage.setItem(scoped(key),JSON.stringify(v));return true}catch(e){return false}}
  function queue(){const q=readJson(KEY,[]);return Array.isArray(q)?q:[]}
  function saveQueue(q){return writeJson(KEY,q.slice(0,500))}
  function enqueue(kind,id,opts={}){
    id=String(id||'');if(!id)return;
    const q=queue(),idx=q.findIndex(x=>x.kind===kind&&String(x.id)===id);
    const old=idx>=0?q[idx]:{};
    const item={kind,id,at:Number(old.at)||Number(opts.at)||now(),attempts:Number(old.attempts)||0,nextAt:Number(opts.nextAt)||Number(old.nextAt)||0,lastError:old.lastError||'',updatedAt:now()};
    if(idx>=0)q[idx]=item;else q.push(item);saveQueue(q);
  }
  function remove(kind,id){const s=queue().filter(x=>!(x.kind===kind&&String(x.id)===String(id)));saveQueue(s)}
  function due(limit=50){const t=now();return queue().filter(x=>(Number(x.nextAt)||0)<=t).sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0)).slice(0,limit)}
  function fail(kind,id,error){const q=queue(),idx=q.findIndex(x=>x.kind===kind&&String(x.id)===String(id));if(idx<0){enqueue(kind,id);return}const x=q[idx];x.attempts=(Number(x.attempts)||0)+1;x.lastError=String(error?.code||error?.message||error||'sync error').slice(0,240);const delay=Math.min(15*60*1000,Math.max(1500,1000*Math.pow(2,Math.min(9,x.attempts-1))));x.nextAt=now()+delay;x.updatedAt=now();saveQueue(q)}
  function pending(){return queue().length}
  function conflicts(){const value=readJson(CONFLICTS,[]);return Array.isArray(value)?value:[]}
  function putConflict(entry){if(!entry||!entry.id)return false;const all=conflicts();const item={...entry,id:String(entry.id),capturedAt:Number(entry.capturedAt)||now()};const index=all.findIndex(x=>String(x.id)===item.id);if(index>=0)all[index]=item;else all.unshift(item);return writeJson(CONFLICTS,all.slice(0,100))}
  function getConflict(id){return conflicts().find(x=>String(x.id)===String(id))||null}
  function removeConflict(id){return writeJson(CONFLICTS,conflicts().filter(x=>String(x.id)!==String(id)))}
  function clearAll(){saveQueue([])}
  function metadata(){return readJson(META,{});}
  function setMeta(patch){const m={...metadata(),...patch,updatedAt:now()};writeJson(META,m);return m}
  function clocks(local,remote){return {local:Math.max(Number(local?._syncUpdatedAt)||0,Number(local?._clientUpdatedAt)||0),remote:Math.max(Number(remote?._cloudUpdatedAt)||0,Number(remote?._clientUpdatedAt)||0,Number(remote?._deletedAt)||0)}}
  function decide(local,remote,dirty){
    if(!remote)return 'local';
    if(remote._deleted===true)return dirty?'local':'remote';
    if(!local)return 'remote';
    if(dirty)return 'local';
    const c=clocks(local,remote);if(c.remote>c.local)return 'remote';if(c.remote<c.local)return 'local';return 'skip';
  }
  function mergeChoice(local,remote,dirty){const d=decide(local,remote,dirty);return {decision:d,clocks:clocks(local,remote)}}
  window.MGSyncEngine={KEY,META,CONFLICTS,queue,enqueue,remove,due,fail,pending,clearAll,metadata,setMeta,clocks,decide,mergeChoice,conflicts,putConflict,getConflict,removeConflict};
})();
