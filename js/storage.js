/* Master Group v143 — persistence layer. No UI rendering lives here. */
(function(){
  const KEY='master_group_estimates_v8';
  const OLD='master_group_estimates_v5';
  const DRAFTS='master_group_estimate_drafts_v1';
  function get(k){try{return localStorage.getItem(k)}catch(e){}try{return sessionStorage.getItem(k)}catch(e){}return null}
  function set(k,v){let ok=false;try{localStorage.setItem(k,v);ok=true}catch(e){}try{sessionStorage.setItem(k,v);ok=true}catch(e){}return ok}
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
    try{if(window.__mgCloudMarkDirty&&changed.length)window.__mgCloudMarkDirty(changed)}catch(e){}
    return true;
  }
  function drafts(){try{return JSON.parse(localStorage.getItem(DRAFTS)||'[]')}catch{return[]}}
  function persistDrafts(a){localStorage.setItem(DRAFTS,JSON.stringify(a.slice(0,30)))}
  window.MGStorage={KEY,OLD,DRAFTS,get,set,saved,persist,drafts,persistDrafts};
})();
