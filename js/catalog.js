/* Master Group catalog service — stable in-memory state + durable local/cloud sync. */
(()=>{
  const KEY='master_group_catalog_v1';
  const LOCAL_UPDATED='master_group_catalog_local_updated_at';
  const SYNC_AT='master_group_catalog_sync_at';
  const CLOUD_DIRTY='master_group_cloud_catalog_dirty_v2';
  const defaults=[
    ['Клининг участка','🌿',[['Покос травы','сотка'],['Срез деревьев','шт'],['Удаление корней','шт'],['Сбор и погрузка мусора','загрузка'],['Транспортное средство для вывоза мусора','рейс']]],
    ['Установка видеонаблюдения','📹',[['Установка камеры','шт'],['Настройка видеорегистратора','шт'],['Прокладка кабеля','м'],['Монтаж блока питания','шт']]],
    ['Металлоконструкции и сварка','⚙️',[['Изготовление металлоконструкции','шт'],['Сварочные работы','час'],['Монтаж металлоконструкции','шт'],['Покраска металла','м²']]],
    ['Сантехнические работы','🔧',[['Монтаж труб','м'],['Установка сантехники','шт'],['Поиск и устранение протечки','шт'],['Демонтаж сантехники','шт']]]
  ];
  const makeDefaults=()=>defaults.map(([name,icon,services])=>({name,icon,services:services.map(([n,u])=>({name:n,unit:u}))}));
  const normalize=raw=>(Array.isArray(raw)?raw:[]).map(d=>({
    name:String(d?.name||'').trim(),
    icon:String(d?.icon||'•'),
    services:Array.isArray(d?.services)?d.services.map(x=>({name:String(x?.name||'').trim(),unit:String(x?.unit||'шт').trim()||'шт'})).filter(x=>x.name):[]
  })).filter(d=>d.name);
  const safeGet=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v));return true}catch(e){console.error('MG catalog storage write failed',k,e);return false}};
  const safeRemove=k=>{try{localStorage.removeItem(k)}catch(_){}};
  const parse=v=>{try{return JSON.parse(v||'null')}catch(_){return null}};
  const storedRaw=safeGet(KEY);
  const stored=parse(storedRaw);
  const hadValidCatalog=Array.isArray(stored)&&stored.length>0;
  const data=hadValidCatalog?normalize(stored):makeDefaults();
  const api={data,cats:[],svc:{}};

  // Keep array/object identities stable: estimate-core and estimate-ui keep references to them.
  const replaceInPlace=(target,items)=>target.splice(0,target.length,...items);
  const sync=()=>{
    replaceInPlace(api.cats,data.map(d=>[d.name,d.icon||'•']));
    Object.keys(api.svc).forEach(k=>delete api.svc[k]);
    data.forEach(d=>{api.svc[d.name]=d.services.map(x=>[x.name,x.unit])});
  };
  const emitUpdated=source=>{
    try{window.dispatchEvent(new CustomEvent('mg:catalog-updated',{detail:{source,count:data.length}}))}catch(_){}
  };
  const writeCatalogStorage=payload=>{
    if(!safeSet(KEY,payload))return false;
    if(safeGet(KEY)!==payload){console.error('MG catalog storage verification failed');return false}
    return true;
  };
  const replaceData=raw=>{
    const next=normalize(raw);
    replaceInPlace(data,next);
    sync();
    return next;
  };
  api.save=()=>{
    const normalized=normalize(data);
    const payload=JSON.stringify(normalized);
    if(!writeCatalogStorage(payload))return false;
    replaceData(normalized);
    // Monotonic edit marker protects rapid consecutive saves within the same millisecond.
    const previous=Number(safeGet(LOCAL_UPDATED)||0)||0;
    const updatedAt=Math.max(Date.now(),previous+1);
    safeSet(LOCAL_UPDATED,updatedAt);
    try{
      if(typeof window.__mgCloudMarkCatalogDirty==='function'){
        window.__mgCloudMarkCatalogDirty();
      }else if(typeof window.__mgFirebaseSyncNow==='function'){
        // Fallback for deployments where Firebase initialized after the edit.
        setTimeout(()=>window.__mgFirebaseSyncNow(),80);
      }
    }catch(e){console.warn('MG catalog cloud queue failed',e)}
    try{window.dispatchEvent(new CustomEvent('mg:catalog-saved',{detail:{count:data.length,updatedAt}}))}catch(_){}
    return true;
  };
  api.applyRemote=(raw,cloudAt)=>{
    if(!Array.isArray(raw))return false;
    const payload=JSON.stringify(normalize(raw));
    if(!writeCatalogStorage(payload))return false;
    replaceData(JSON.parse(payload));
    const at=Number(cloudAt)||0;
    if(at>0)safeSet(SYNC_AT,at);
    emitUpdated('cloud');
    return true;
  };
  api.applyStored=()=>{
    const raw=parse(safeGet(KEY));
    if(!Array.isArray(raw))return false;
    replaceData(raw);
    emitUpdated('storage');
    return true;
  };
  api.isSame=raw=>{
    if(!Array.isArray(raw))return false;
    try{return JSON.stringify(normalize(raw))===JSON.stringify(normalize(data))}catch(_){return false}
  };
  sync();

  // Seed defaults without marking them as user edits. This lets the first Firebase
  // sync download the account's real catalog instead of treating defaults as newer data.
  if(!hadValidCatalog){
    const payload=JSON.stringify(normalize(data));
    writeCatalogStorage(payload);
    const dirty=parse(safeGet(CLOUD_DIRTY));
    const localAt=Number(safeGet(LOCAL_UPDATED)||0)||0;
    const syncedAt=Number(safeGet(SYNC_AT)||0)||0;
    if(dirty!==true)safeRemove(LOCAL_UPDATED);
  }else{
    // Migrate the old startup bug: older builds saved their initial default catalog
    // as though the user had edited it, leaving an orphaned local-dirty timestamp.
    const dirty=parse(safeGet(CLOUD_DIRTY));
    const localAt=Number(safeGet(LOCAL_UPDATED)||0)||0;
    const syncedAt=Number(safeGet(SYNC_AT)||0)||0;
    if(dirty!==true&&localAt>syncedAt&&JSON.stringify(normalize(stored))===JSON.stringify(normalize(makeDefaults())))safeRemove(LOCAL_UPDATED);
  }

  // Other tabs may edit the shared localStorage. Do not replace a locally edited
  // catalog while its dirty marker/timestamp says it still needs to reach Firebase.
  const applyStoredIfClean=()=>{
    if(parse(safeGet(CLOUD_DIRTY))===true)return;
    const localAt=Number(safeGet(LOCAL_UPDATED)||0)||0;
    const syncedAt=Number(safeGet(SYNC_AT)||0)||0;
    if(localAt>syncedAt)return;
    api.applyStored();
  };
  try{
    window.addEventListener('storage',event=>{
      if(!event)return;
      if([KEY,CLOUD_DIRTY,LOCAL_UPDATED,SYNC_AT].includes(event.key))applyStoredIfClean();
    });
  }catch(_){}
  window.MGCatalog=api;
})();
