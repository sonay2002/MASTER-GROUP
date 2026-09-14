/* Master Group v137 — catalog service */
(()=>{
  const KEY='master_group_catalog_v1';
  const defaults=[
    ['Клининг участка','🌿',[['Покос травы','сотка'],['Срез деревьев','шт'],['Удаление корней','шт'],['Сбор и погрузка мусора','загрузка'],['Транспортное средство для вывоза мусора','рейс']]],
    ['Установка видеонаблюдения','📹',[['Установка камеры','шт'],['Настройка видеорегистратора','шт'],['Прокладка кабеля','м'],['Монтаж блока питания','шт']]],
    ['Металлоконструкции и сварка','⚙️',[['Изготовление металлоконструкции','шт'],['Сварочные работы','час'],['Монтаж металлоконструкции','шт'],['Покраска металла','м²']]],
    ['Сантехнические работы','🔧',[['Монтаж труб','м'],['Установка сантехники','шт'],['Поиск и устранение протечки','шт'],['Демонтаж сантехники','шт']]]
  ];
  const makeDefaults=()=>defaults.map(([name,icon,services])=>({name,icon,services:services.map(([n,u])=>({name:n,unit:u}))}));
  const normalize=raw=>raw.map(d=>({
    name:String(d.name||'').trim(),
    icon:String(d.icon||'•'),
    services:Array.isArray(d.services)?d.services.map(x=>({name:String(x.name||'').trim(),unit:String(x.unit||'шт').trim()||'шт'})).filter(x=>x.name):[]
  })).filter(d=>d.name);
  let data;
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    data=Array.isArray(raw)&&raw.length?normalize(raw):makeDefaults();
  }catch(e){data=makeDefaults()}
  const api={data,cats:[],svc:{}};
  const sync=()=>{
    api.cats=data.map(d=>[d.name,d.icon||'•']);
    api.svc=Object.fromEntries(data.map(d=>[d.name,d.services.map(x=>[x.name,x.unit])]));
  };
  api.save=()=>{
    // Save locally first. The catalog is the source of truth for newly created directions.
    const payload=JSON.stringify(normalize(data));
    try{ localStorage.setItem(KEY,payload); }catch(e){ console.error('MG catalog local save failed',e); return false; }
    // Verify the write so a direction can never be reported as saved when it was not.
    try{ if(localStorage.getItem(KEY)!==payload) throw new Error('Catalog storage verification failed'); }catch(e){ console.error('MG catalog verify failed',e); return false; }
    sync();
    try{ localStorage.setItem('master_group_catalog_local_updated_at',String(Date.now())); }catch(e){}
    try{
      if(window.__mgCloudMarkCatalogDirty) window.__mgCloudMarkCatalogDirty();
      // Upload is secondary: local save must remain valid even if cloud is temporarily unavailable.
      if(window.__mgFirebaseSyncNow) setTimeout(()=>window.__mgFirebaseSyncNow(),60);
    }catch(e){ console.warn('MG catalog cloud queue failed',e); }
    try{ window.dispatchEvent(new CustomEvent('mg:catalog-saved',{detail:{count:data.length}})); }catch(e){}
    return true;
  };
  sync();
  if(!localStorage.getItem(KEY))api.save();
  window.MGCatalog=api;
})();
