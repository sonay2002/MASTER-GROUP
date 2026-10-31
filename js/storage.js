/* Master Group v143 — persistence layer. No UI rendering lives here. */
(function(){
  const KEY='master_group_estimates_v8';
  const OLD='master_group_estimates_v5';
  const DRAFTS='master_group_estimate_drafts_v1';
  let lastWritePersistence='unknown';
  function get(k){try{const v=localStorage.getItem(k);if(v!==null)return v}catch(e){}try{return sessionStorage.getItem(k)}catch(e){}return null}
  function set(k,v){let durable=false,session=false;try{localStorage.setItem(k,v);durable=true}catch(e){}try{sessionStorage.setItem(k,v);session=true}catch(e){}lastWritePersistence=durable?'local':session?'session':'none';return durable||session}
  function warnSessionOnly(){if(lastWritePersistence==='session'){try{window.__mgToast&&window.__mgToast('Данные сохранены только до закрытия вкладки: браузер не разрешил постоянное хранение.')}catch(e){}}}
  function saved(){try{const raw=get(KEY);const a=raw?JSON.parse(raw):[];if(Array.isArray(a)&&a.length)return a;const oldRaw=get(OLD);const old=oldRaw?JSON.parse(oldRaw):[];return Array.isArray(old)?old:[]}catch{return[]}}
  function persist(a){
    const next=a.slice(0,100); let prev=[];
    try{const raw=get(KEY);prev=raw?JSON.parse(raw):[]}catch(e){}
    const pm=new Map((Array.isArray(prev)?prev:[]).map(x=>[String(x.id),x]));
    const changed=[];
    for(const e of next){
      const id=String(e.id||''); if(!id)continue;
      const before=pm.get(id); let A,B;
      try{A=JSON.stringify(before||null);B=JSON.stringify(e)}catch(_){A='';B=''}
      if(A!==B){e._syncUpdatedAt=Date.now();changed.push(id)}
    }
    const raw=JSON.stringify(next);
    const ok=set(KEY,raw);
    if(!ok){try{window.__mgToast&&window.__mgToast('Не удалось сохранить смету на устройстве')}catch(e){}return false}
    warnSessionOnly();
    try{if(window.__mgCloudMarkDirty&&changed.length)window.__mgCloudMarkDirty(changed)}catch(e){}
    return true;
  }
  function drafts(){try{const raw=get(DRAFTS);const a=raw?JSON.parse(raw):[];return Array.isArray(a)?a:[]}catch{return[]}}
  function persistDrafts(a){const ok=set(DRAFTS,JSON.stringify(a.slice(0,30)));if(!ok){try{window.__mgToast&&window.__mgToast('Не удалось сохранить черновик')}catch(e){};return false}warnSessionOnly();return true}
  window.MGStorage={KEY,OLD,DRAFTS,get,set,saved,persist,drafts,persistDrafts,isPersistent:()=>lastWritePersistence==='local'};
})();
