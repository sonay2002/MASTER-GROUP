/* Master Group v143 — persistence layer. No UI rendering lives here. */
(function(){
  const KEY='master_group_estimates_v8';
  const OLD='master_group_estimates_v5';
  const DRAFTS='master_group_estimate_drafts_v1';
  let lastWritePersistence='unknown';
  function scoped(k){try{return window.__mgAccountStorageKey?window.__mgAccountStorageKey(k):k}catch(_){return k}}
  function get(k){const key=scoped(k);try{const v=localStorage.getItem(key);if(v!==null)return v}catch(e){}try{return sessionStorage.getItem(key)}catch(e){}return null}
  function set(k,v){const key=scoped(k);let durable=false,session=false;try{localStorage.setItem(key,v);durable=true}catch(e){}try{sessionStorage.setItem(key,v);session=true}catch(e){}lastWritePersistence=durable?'local':session?'session':'none';return durable||session}
  function warnSessionOnly(){if(lastWritePersistence==='session'){try{window.__mgToast&&window.__mgToast('Данные сохранены только до закрытия вкладки: браузер не разрешил постоянное хранение.')}catch(e){}}}
  function saved(){try{const raw=get(KEY);const a=raw?JSON.parse(raw):[];if(Array.isArray(a)&&a.length)return a;const oldRaw=get(OLD);const old=oldRaw?JSON.parse(oldRaw):[];return Array.isArray(old)?old:[]}catch{return[]}}
  function persist(a){
    const next=a.slice(0,100); let prev=[];
    try{const raw=get(KEY);prev=raw?JSON.parse(raw):[]}catch(e){}
    const pm=new Map((Array.isArray(prev)?prev:[]).map(x=>[String(x.id),x]));
    const nm=new Map(next.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
    const changed=[],audit=[];
    const auditShape=value=>{
      if(!value||typeof value!=='object')return value;
      const out={};
      for(const [k,v] of Object.entries(value)){
        // Sync bookkeeping is not a user-visible estimate edit.
        if(/^_(syncUpdatedAt|serverRevision|cloudUpdatedAt|clientUpdatedAt|clientId|localNumberPending)$/.test(k))continue;
        out[k]=v;
      }
      return out;
    };
    for(const e of next){
      const id=String(e.id||''); if(!id)continue;
      const before=pm.get(id); let A,B;
      try{A=JSON.stringify(auditShape(before||null));B=JSON.stringify(auditShape(e))}catch(_){A='';B=''}
      if(A!==B){e._syncUpdatedAt=Date.now();changed.push(id);}
      if(!before){audit.push({action:'created',estimateId:id,estimateNumber:String(e.number||''),clientName:String(e.client||''),total:Number(e.total)||0});}
      else if(A!==B){audit.push({action:'updated',estimateId:id,estimateNumber:String(e.number||before.number||''),clientName:String(e.client||before.client||''),total:Number(e.total)||0});}
    }
    for(const [id,before] of pm){
      if(!nm.has(id))audit.push({action:'deleted',estimateId:id,estimateNumber:String(before?.number||''),clientName:String(before?.client||''),total:Number(before?.total)||0});
    }
    const raw=JSON.stringify(next);
    const ok=set(KEY,raw);
    if(!ok){try{window.__mgToast&&window.__mgToast('Не удалось сохранить смету на устройстве')}catch(e){}return false}
    warnSessionOnly();
    try{if(window.__mgCloudMarkDirty&&changed.length)window.__mgCloudMarkDirty(changed)}catch(e){}
    // Audit only after a successful local write. This also works offline; the
    // Firebase sync layer queues events until the account reconnects.
    try{if(typeof window.__mgMonitorRecordEvent==='function')audit.forEach(ev=>window.__mgMonitorRecordEvent(ev));}catch(e){console.warn('MG audit queue:',e)}
    return true;
  }
  function drafts(){try{const raw=get(DRAFTS);const a=raw?JSON.parse(raw):[];return Array.isArray(a)?a:[]}catch{return[]}}
  function persistDrafts(a){const ok=set(DRAFTS,JSON.stringify(a.slice(0,30)));if(!ok){try{window.__mgToast&&window.__mgToast('Не удалось сохранить черновик')}catch(e){};return false}warnSessionOnly();return true}
  window.MGStorage={KEY,OLD,DRAFTS,get,set,saved,persist,drafts,persistDrafts,isPersistent:()=>lastWritePersistence==='local'};
})();
