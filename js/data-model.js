/* Master Group v145 — canonical estimate model + one-time safe migrations. */
(()=>{
  'use strict';
  const KEY='master_group_estimates_v8';
  const OLD='master_group_estimates_v5';
  const DRAFTS='master_group_estimate_drafts_v1';
  const VERSION_KEY='master_group_data_model_version_v2';
  const n=v=>Math.max(0,Number(String(v??'').replace(',','.'))||0);
  const text=v=>String(v??'').trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  function stableId(prefix, id, index){ return `${prefix}-${String(id||'legacy')}-${index}`.replace(/[^a-zA-Z0-9_-]/g,'_'); }
  function normalizeItem(x, estimateId, di, ii){
    const item={...(x||{})};
    if(!item.id) item.id=stableId('item',estimateId,`${di}-${ii}`);
    item.name=text(item.name||item.service||item.title||'Услуга');
    item.unit=text(item.unit||item.units||'шт')||'шт';
    item.qty=n(item.qty??item.quantity??1);
    item.price=n(item.price??item.cost??item.rate??0);
    return item;
  }
  function normalizeDirections(e){
    let dirs=[];
    if(Array.isArray(e?.directions)&&e.directions.length){
      dirs=e.directions.map((d,di)=>({
        name:text(d?.name||d?.category||`Направление ${di+1}`),
        items:Array.isArray(d?.items)?d.items.map((x,ii)=>normalizeItem(x,e.id,di,ii)):[]
      })).filter(d=>d.name);
    } else if(e?.category || Array.isArray(e?.items)) {
      dirs=[{name:text(e.category||'Без направления'),items:Array.isArray(e.items)?e.items.map((x,ii)=>normalizeItem(x,e.id,0,ii)):[]}];
    }
    return dirs;
  }
  function normalizePayments(e){
    let src=Array.isArray(e?.payments)?e.payments:[];
    if(!src.length && n(e?.prepayment)>0) src=[{id:stableId('payment',e.id,0),amount:n(e.prepayment),date:text(e.date),method:'аванс',note:'Перенесено из старого формата'}];
    const used=new Set();
    return src.map((p,i)=>{
      const id=text(p?.id)||stableId('payment',e.id,i); let unique=id;
      if(used.has(unique)) unique=stableId('payment',e.id,i+'-dup');
      used.add(unique);
      return {id:unique,amount:n(p?.amount),date:text(p?.date||e?.date),method:text(p?.method||'другое'),note:text(p?.note)};
    }).filter(p=>p.amount>0);
  }
  function normalizeEstimate(input){
    const e=clone(input||{});
    if(!e.id) e.id=stableId('estimate','legacy',Date.now());
    e.number=text(e.number||('MG-'+String(e.id).slice(-8).toUpperCase()));
    e.client=text(e.client);e.phone=text(e.phone);e.address=text(e.address||e.object);e.object=e.address;delete e.city;
    e.date=text(e.date||new Date().toLocaleDateString('ru-RU'));
    e.directions=normalizeDirections(e);
    e.category=e.directions.map(d=>d.name).join(', ');
    e.items=e.directions.flatMap(d=>d.items.map(x=>({...x,direction:d.name})));
    const calculatedTotal=e.items.reduce((sum,x)=>sum+x.qty*x.price,0);
    e.total=e.items.length?calculatedTotal:n(input?.total);
    e.payments=normalizePayments(e);
    e.paid=e.payments.reduce((s,p)=>s+p.amount,0);
    e.prepayment=e.paid;
    e.expenseMaterial=n(e.expenseMaterial);e.expenseTransport=n(e.expenseTransport);e.expenseSalary=n(e.expenseSalary);e.expenseOther=n(e.expenseOther);
    e.expenseTotal=e.expenseMaterial+e.expenseTransport+e.expenseSalary+e.expenseOther;
    e.balance=Math.max(0,e.total-e.paid);
    e.profit=e.total-e.expenseTotal;
    e.dataModelVersion=2;
    return e;
  }
  function normalizeDraft(d,i){
    const e=normalizeEstimate({...d,id:d?.id||stableId('draft','legacy',i)});
    return {...d,id:e.id,directions:e.directions,items:e.items,category:e.category,client:e.client,phone:e.phone,address:e.address,object:e.address,dataModelVersion:2};
  }
  function readJson(key, fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch{return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function migrate(){
    let estimates=readJson(KEY,null);
    if(!Array.isArray(estimates)||!estimates.length){const old=readJson(OLD,[]);estimates=Array.isArray(old)?old:[];}
    const normalized=estimates.map(normalizeEstimate);
    const before=JSON.stringify(estimates),after=JSON.stringify(normalized);
    let changed=before!==after;
    if(changed||readJson(VERSION_KEY,0)!==2) writeJson(KEY,normalized);
    const drafts=readJson(DRAFTS,[]);
    if(Array.isArray(drafts)){
      const nd=drafts.map(normalizeDraft);
      if(JSON.stringify(drafts)!==JSON.stringify(nd)) writeJson(DRAFTS,nd);
    }
    writeJson(VERSION_KEY,2);
    window.MGDataModel={version:2,normalizeEstimate,normalizeDraft,migrate};
    return {changed,count:normalized.length};
  }
  window.MGDataModel={version:2,normalizeEstimate,normalizeDraft,migrate};
  try{window.MGDataModel.migrate()}catch(err){console.warn('MG data migration failed; original data left untouched',err)}
})();
