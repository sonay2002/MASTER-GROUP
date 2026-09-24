(function(){
  'use strict';
  /* Firebase configuration is intentionally kept in one place. These values are NOT secret.
     Replace them with the Web App config from Firebase Console. */
  const FIREBASE_CONFIG=window.MGFirebaseClient?.config||{};
  const FIREBASE_REPO=window.MGFirebaseRepository;
  const SYNC_ENGINE=window.MGSyncEngine;
  /* v149 compatibility boundary: firebase-sync used to share these constants/helpers
     with the monolithic core. They must live here now that the app is modular. */
  const KEY='master_group_estimates_v8',CAT='master_group_catalog_v1',COMP='master_group_company_v1';
  const DEL='master_group_cloud_deleted_v1',DIRTY='master_group_cloud_dirty_v3',CATDIRTY='master_group_cloud_catalog_dirty_v2',PROFDIRTY='master_group_cloud_profile_dirty_v2';
  const SYNC_VER='master_group_firebase_v22';
  const $=id=>document.getElementById(id);
  const read=(k,fb)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?fb:x}catch(e){return fb}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
  const uid=()=>{try{if(window.crypto?.randomUUID)return window.crypto.randomUUID()}catch(e){}return 'mg_'+Date.now()+'_'+Math.random().toString(36).slice(2)};
  const newId=uid;
  const toast=(t)=>{try{if(typeof window.__mgToast==='function')return window.__mgToast(t)}catch(e){}try{const x=$('toast');if(x){x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1700)}}catch(e){}};
  let user=null,cloudMode=false,busy=false,pending=false,db=null,auth=null,root=null,estimateListener=null,catalogListener=null,companyListener=null,metaListener=null,starting=false,authAttempt=false;
  function msg(t,error){if(!$('mgCloudMsg'))return;$('mgCloudMsg').textContent=t||'';$('mgCloudMsg').classList.toggle('error',!!error)}
  const firebaseFriendlyError=(err,context)=>window.MGFirebaseClient?.friendlyError(err,context)||'Произошла ошибка облачного сервиса. Попробуйте ещё раз.';
  function cloudError(err,context){
    const friendly=firebaseFriendlyError(err,context);
    console.error('Firebase:',err?.code||'unknown',err);
    msg(friendly,true);
    status(friendly, true);
    try{if(typeof toast==='function')toast(friendly)}catch(e){}
    return friendly;
  }
  function status(text,offline){if(!$('mgCloudStatus'))return;$('mgCloudStatus').hidden=false;$('mgCloudStatusText').textContent=text;$('mgCloudStatus').classList.toggle('offline',!!offline);$('mgCloudAccount').textContent=user?.email||''}
  function showAuth(mode){
    const signup=mode==='signup';
    $('mgCloudAuth').hidden=false;
    $('mgCloudLoginTab').classList.toggle('active',!signup);
    $('mgCloudSignupTab').classList.toggle('active',signup);
    $('mgCloudSubmit').textContent=signup?'Создать аккаунт':'Войти';
    $('mgCloudPassword').autocomplete=signup?'new-password':'current-password';
    if($('mgCloudTitle'))$('mgCloudTitle').textContent=signup?'Создать аккаунт':'Вход в аккаунт';
    if($('mgCloudCreate')){
      $('mgCloudCreate').querySelector('span').textContent=signup?'Вернуться ко входу':'Создать аккаунт';
      $('mgCloudCreate').setAttribute('aria-label',signup?'Вернуться ко входу':'Создать аккаунт');
    }
    if($('mgCloudForgot'))$('mgCloudForgot').disabled=signup;
    if($('mgCloudLocal'))$('mgCloudLocal').hidden=signup;
    msg('');
  }
  function hideAuth(){ const el=$('mgCloudAuth'); if(!el)return; if(!user || !cloudMode)return; el.hidden=true; authAttempt=false }
  function keepAuthVisible(){ const el=$('mgCloudAuth'); if(el){el.hidden=false;el.style.display='flex'} }
  function lockAuthGate(){ const el=$('mgCloudAuth'); if(el){el.hidden=false;el.style.display='flex'} }
  function unlockAuthGate(){ const el=$('mgCloudAuth'); if(el){el.hidden=true;el.style.display='none'} authAttempt=false }
  function localEstimates(){const a=read(KEY,[]);return Array.isArray(a)?a:[]}
  function localCatalog(){const a=read(CAT,[]);return Array.isArray(a)?a:[]}
  function dirtyIds(){const a=read(DIRTY,[]);return new Set(Array.isArray(a)?a.map(String):[])}
  function setDirty(ids){const clean=Array.from(new Set(ids.map(String)));write(DIRTY,clean);if(SYNC_ENGINE)clean.forEach(id=>SYNC_ENGINE.enqueue('estimate',id))}
  function markDirty(ids){const s=dirtyIds();ids.forEach(id=>{id=String(id);s.add(id);if(SYNC_ENGINE)SYNC_ENGINE.enqueue('estimate',id)});setDirty(Array.from(s))}
  function clearDirty(id){const s=dirtyIds();s.delete(String(id));setDirty(Array.from(s));if(SYNC_ENGINE)SYNC_ENGINE.remove('estimate',id)}
  function tombstones(){const raw=read(DEL,[]),out=new Map();if(Array.isArray(raw))raw.forEach(x=>{if(typeof x==='string')out.set(x,0);else if(x?.id)out.set(String(x.id),Number(x.at)||0)});return out}
  function clearDeleted(id){const a=Array.from(tombstones().entries()).filter(x=>String(x[0])!==String(id)).map(([i,at])=>({id:i,at}));write(DEL,a);if(SYNC_ENGINE)SYNC_ENGINE.remove('delete',id)}
  function normalizeLocalIds(){const a=localEstimates();let changed=false;a.forEach(e=>{if(!e.id){e.id=newId();changed=true}if(Array.isArray(e.payments))e.payments.forEach(p=>{if(!p.id){p.id=newId();changed=true}});(e.directions||[]).forEach(d=>(d.items||[]).forEach(x=>{if(!x.id){x.id=newId();changed=true}}))});if(changed)write(KEY,a);return a}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const NOTIF_KEY='master_group_notifications_v1';
  const NOTIF_READ='master_group_notifications_read_v1';
  const CLIENT_KEY='master_group_notification_client_v1';
  let notificationListener=null;
  function notificationClientId(){let id=read(NOTIF_READ+'_client','');if(!id){id=uid();write(NOTIF_READ+'_client',id)}return id}
  function localNotifications(){const a=read(NOTIF_KEY,[]);return Array.isArray(a)?a:[]}
  function saveNotifications(a){write(NOTIF_KEY,a.slice(0,300));renderNotifications();updateNotificationBadge();try{window.dispatchEvent(new Event('mg:notifications-updated'))}catch(e){}}
  function notificationIcon(type){return type==='created'?'➕':type==='deleted'?'🗑️':type==='payment'?'💳':type==='status'?'🔄':type==='expense'?'💸':'📝'}
  function addNotification(n,{cloud=true,toastIt=false}={}){
    try{if(!n||!n.id)return;const a=localNotifications();if(a.some(x=>String(x.id)===String(n.id)))return;const item={id:String(n.id),estimateId:n.estimateId?String(n.estimateId):'',title:String(n.title||'Изменение сметы'),body:String(n.body||''),type:String(n.type||'change'),at:Number(n.at)||Date.now(),read:!!n.read,sourceClientId:String(n.sourceClientId||notificationClientId())};a.unshift(item);saveNotifications(a);if(toastIt)notify(item.title,item.body);if(cloud&&root&&user&&cloudMode){root.child('notifications').child(item.id).set(firebaseSafe(item)).catch(()=>{})}}catch(e){console.warn('notification:',e)}}
  function estimateDisplay(e){return e?.number||('Смета '+String(e?.id||'').slice(0,8))}
  function itemMap(e){const m=new Map();(e?.directions||[]).forEach(d=>(d.items||[]).forEach(x=>m.set(String(x.id),{...x,direction:d.name||'Без направления'})));return m}
  function estimateChanges(before,after){
    const out=[];const name=estimateDisplay(after||before);if(!before&&after){out.push({type:'created',title:name+' создана',body:'Создана новая смета'});return out}
    if(before&&!after){out.push({type:'deleted',title:name+' удалена',body:'Смета удалена'});return out}
    if(!before||!after)return out;
    if(String(before.client||'')!==String(after.client||''))out.push({type:'change',title:name+' изменена',body:'Изменён клиент: «'+(before.client||'—')+'» → «'+(after.client||'—')+'»'});
    if(String(before.phone||'')!==String(after.phone||''))out.push({type:'change',title:name+' изменена',body:'Изменён телефон клиента'});
    if(String(before.city||'')!==String(after.city||'')||String(before.address||'')!==String(after.address||''))out.push({type:'change',title:name+' изменена',body:'Изменён адрес объекта'});
    if(String(before.status||'')!==String(after.status||''))out.push({type:'status',title:name+' — статус изменён',body:'«'+(before.status||'—')+'» → «'+(after.status||'—')+'»'});
    const bm=itemMap(before),am=itemMap(after);for(const [id,x] of am){const y=bm.get(id);if(!y){out.push({type:'change',title:name+' — добавлена услуга',body:'Добавлена «'+(x.name||'Услуга')+'» — '+(Number(x.qty)||0)+' '+(x.unit||'шт.')});continue}if(Number(x.qty)!==Number(y.qty))out.push({type:'change',title:name+' — изменено количество',body:'«'+(x.name||'Услуга')+'»: '+(Number(y.qty)||0)+' → '+(Number(x.qty)||0)+' '+(x.unit||y.unit||'шт.')});if(Number(x.price)!==Number(y.price))out.push({type:'change',title:name+' — изменена цена',body:'«'+(x.name||'Услуга')+'»: '+(Number(y.price)||0)+' → '+(Number(x.price)||0)});}
    for(const [id,x] of bm)if(!am.has(id))out.push({type:'change',title:name+' — удалена услуга',body:'Удалена «'+(x.name||'Услуга')+'»'});
    const bp=Array.isArray(before.payments)?before.payments:[],ap=Array.isArray(after.payments)?after.payments:[];if(ap.length>bp.length){const added=ap.slice(bp.length);const amount=added.reduce((s,p)=>s+(Number(p.amount)||0),0);out.push({type:'payment',title:name+' — добавлен платёж',body:'Получен платёж: '+amount.toFixed(2)});}else if(ap.length!==bp.length){out.push({type:'payment',title:name+' — платежи изменены',body:'Изменён список платежей'});}else if(Number(before.paid)!==Number(after.paid)){out.push({type:'payment',title:name+' — изменён платёж',body:'Оплачено: '+(Number(before.paid)||0)+' → '+(Number(after.paid)||0)});
    }
    const ex=(k)=>Number(before[k]||0)!==Number(after[k]||0);if(ex('expenseMaterial')||ex('expenseTransport')||ex('expenseSalary')||ex('expenseOther'))out.push({type:'expense',title:name+' — изменены расходы',body:'Изменены внутренние расходы сметы'});
    if(Number(before.total)!==Number(after.total)&&!out.some(x=>x.body.includes('цена')))out.push({type:'change',title:name+' — изменена сумма',body:'Итого: '+(Number(before.total)||0)+' → '+(Number(after.total)||0)});
    return out.slice(0,8)
  }
  function recordEstimateNotifications(before,after,opts={}){
    if(window.__mgNotificationSuppress)return;const changes=estimateChanges(before,after);if(!changes.length)return;
    const name=estimateDisplay(after||before);const isCreate=!before&&after,isDelete=before&&!after;
    let title,body,type;
    if(isCreate){title=name+' создана';body='Создана новая смета';type='created'}
    else if(isDelete){title=name+' удалена';body='Смета удалена';type='deleted'}
    else{
      const kinds=new Set(changes.map(c=>c.type));type=kinds.has('payment')?'payment':kinds.has('expense')?'expense':kinds.has('status')?'status':'change';
      const details=changes.map(c=>c.body).filter(Boolean);
      title=name+' изменена';
      body=details.length===1?details[0]:(details.length+' изменений: '+details.slice(0,4).join(' • ')+(details.length>4?' • и ещё '+(details.length-4):''));
    }
    const item={id:'n_'+Date.now()+'_'+Math.random().toString(36).slice(2),estimateId:(after||before)?.id,title,body,type,at:Date.now(),sourceClientId:notificationClientId()};
    addNotification(item,{cloud:true,toastIt:opts.toastIt!==false});
  }
  function renderNotifications(){const box=$('notificationsList');if(!box)return;const a=localNotifications();if(!a.length){box.innerHTML='<div class="notifications-empty"><b>Пока нет уведомлений</b>Изменения смет появятся здесь автоматически.</div>';return}box.innerHTML=a.map(n=>`<article class="notification-card ${n.read?'':'unread'}" data-notification-id="${String(n.id).replace(/[^a-zA-Z0-9_-]/g,'')}"><div class="notification-icon">${notificationIcon(n.type)}</div><div><div class="notification-title">${escapeHtml(n.title)}${n.read?'':'<span class="notification-dot"></span>'}</div><div class="notification-body">${escapeHtml(n.body)}</div></div><div class="notification-time">${new Date(n.at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></article>`).join('')}
  function updateNotificationBadge(){const count=localNotifications().filter(x=>!x.read).length;const b=$('menuNotifBadge');if(b){b.textContent=count>99?'99+':String(count);b.style.display=count?'inline-block':'none'}const nav=$('notificationsScreen');if(nav&&!nav.hidden)renderNotifications()}
  function markAllNotificationsRead(){saveNotifications(localNotifications().map(x=>({...x,read:true})));toast('Уведомления прочитаны')}
  function clearNotifications(){if(!localNotifications().length)return;if(!confirm('Очистить историю уведомлений?'))return;saveNotifications([]);if(root&&user&&cloudMode)root.child('notifications').remove().catch(()=>{});toast('История уведомлений очищена')}
  function openNotification(id){const a=localNotifications(),n=a.find(x=>String(x.id)===String(id));if(!n)return;n.read=true;saveNotifications(a);if(n.estimateId){try{openSaved(n.estimateId)}catch(e){}}}
  function showNotifications(){renderNotifications();screen('notificationsScreen');updateNotificationBadge()}
  window.showNotifications=showNotifications;
  window.openNotification=openNotification;
  window.markAllNotificationsRead=markAllNotificationsRead;
  window.clearNotifications=clearNotifications;
  function notify(title,body){
    try{
      let host=$('mgCloudNotify');if(!host){host=document.createElement('div');host.id='mgCloudNotify';host.style.cssText='position:fixed;top:18px;right:18px;z-index:300000;max-width:380px;display:grid;gap:10px';document.body.appendChild(host)}
      const n=document.createElement('div');n.style.cssText='background:rgba(24,26,31,.96);color:#fff;padding:14px 16px;border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.25);font:600 14px -apple-system,BlinkMacSystemFont,sans-serif';n.innerHTML='<div style="font-weight:800;margin-bottom:4px">🔔 '+String(title).replace(/[<>]/g,'')+'</div><div style="font-weight:500;opacity:.86">'+String(body).replace(/[<>]/g,'')+'</div>';host.appendChild(n);setTimeout(()=>n.remove(),4200)
    }catch(e){}
  }
  function refreshUi(){try{const F=window.MGAppFinance||{},C=window.MGAppCore||{};if(typeof F.v58RenderEstimates==='function')F.v58RenderEstimates();else if(typeof C.renderEstimates==='function')C.renderEstimates();if(typeof F.dashboard==='function')F.dashboard();else if(typeof C.dashboard==='function')C.dashboard();}catch(e){console.warn('Firebase UI refresh:',e)}}
  function configReady(){return FIREBASE_CONFIG.apiKey&&!FIREBASE_CONFIG.apiKey.startsWith('PASTE_')&&FIREBASE_CONFIG.projectId&&!FIREBASE_CONFIG.projectId.startsWith('PASTE_')&&FIREBASE_CONFIG.databaseURL&&!FIREBASE_CONFIG.databaseURL.includes('PASTE_FIREBASE')}
  function initFirebase(){try{
    if(!window.MGFirebaseClient?.ready()){status('Firebase не настроен',true);msg('Облачное хранение пока не настроено. Можно продолжить без облака.',true);return false}
    if(!window.MGFirebaseClient.init()){throw Object.assign(new Error('Firebase initialization failed'),{code:'database/unavailable'})}
    auth=window.MGFirebaseClient.getAuth();db=window.MGFirebaseClient.getDb();return true;
  }catch(e){cloudError(e,'startup');return false}}
  window.__mgCloudMarkDirty=function(ids){const a=Array.isArray(ids)?ids:[];if(a.length)markDirty(a);if(cloudMode)scheduleUpload()};
  window.__mgCloudMarkCatalogDirty=function(){write(CATDIRTY,true);if(cloudMode)scheduleUpload()};
  window.__mgCloudMarkCompanyDirty=function(){write(PROFDIRTY,true);if(cloudMode)scheduleUpload()};
  function scheduleUpload(){if(pending)return;pending=true;setTimeout(()=>{pending=false;syncNow()},120)}
  function estimateRef(id){return root.child('estimates').child(String(id))}
  function firebaseSafe(value, seen){
    if(value===undefined)return null;
    if(typeof value==='number' && !Number.isFinite(value))return 0;
    if(value===null || typeof value==='string' || typeof value==='boolean' || typeof value==='number')return value;
    if(!seen)seen=new WeakSet();
    if(typeof value==='object'){if(seen.has(value))return null;seen.add(value);if(Array.isArray(value))return value.map(v=>firebaseSafe(v,seen));const out={};for(const [k,v] of Object.entries(value)){if(/[.#$\[\]\/]/.test(k))continue;out[k]=firebaseSafe(v,seen)}return out}
    return null;
  }
  window.__mgCloudIsConnected=()=>!!(cloudMode&&user&&root);
  async function uploadEstimate(id){
    let e=localEstimates().find(x=>String(x.id)===String(id));
    if(e&&window.MGFinance?.normalize){e=window.MGFinance.normalize(e);const all=localEstimates();const i=all.findIndex(x=>String(x.id)===String(id));if(i>=0){all[i]=e;write(KEY,all)}}
    if(!e){clearDirty(id);return;}
    if(!root||!user) throw Object.assign(new Error('Cloud not ready'),{code:'database/unavailable'});
    const payload=FIREBASE_REPO.sanitize(JSON.parse(JSON.stringify(e)));
    payload._cloudUpdatedAt=window.MGFirebaseClient.serverTimestamp();
    payload._clientUpdatedAt=Number(e._syncUpdatedAt)||Date.now();
    payload._deleted=false;
    await FIREBASE_REPO.writeEstimate(user.uid,payload);
    const saved=await FIREBASE_REPO.confirmEstimate(user.uid,id);
    clearDirty(id);return saved;
  }
  window.__mgCloudHardDelete=async function(id){
    try{
      id=String(id||'');
      if(!id||!root||!user||!cloudMode)return false;
      await FIREBASE_REPO.hardDelete(user.uid,id);
      return true;
    }catch(e){console.warn('Firebase permanent delete sync:',e?.code||'unknown',e);return false}
  };
  window.__mgCloudFlushDelete=async function(id,at){
    try{
      id=String(id||'');
      if(!id||!root||!user||!cloudMode)return false;
      const when=Number(at)||Date.now();
      if(SYNC_ENGINE)SYNC_ENGINE.enqueue('delete',id,{at:when});
      const saved=await FIREBASE_REPO.markDeleted(user.uid,id,when);
      clearDeleted(id);
      return true;
    }catch(e){
      console.warn('Firebase delete sync:',e?.code||'unknown',e);
      return false;
    }
  };
  window.__mgCloudSaveEstimate=async function(estimate){
    try{
      if(!estimate||!estimate.id) throw Object.assign(new Error('Estimate has no id'),{code:'database/invalid-estimate'});
      if(!user||!root||!cloudMode) { markDirty([String(estimate.id)]); return false; }
      const payload=FIREBASE_REPO.sanitize(JSON.parse(JSON.stringify(estimate)));
      payload._cloudUpdatedAt=window.MGFirebaseClient.serverTimestamp();
      payload._clientUpdatedAt=Number(estimate._syncUpdatedAt)||Date.now();
      payload._deleted=false;
      await FIREBASE_REPO.writeEstimate(user.uid,payload);
      await FIREBASE_REPO.confirmEstimate(user.uid,estimate.id);
      clearDirty(estimate.id);status('Firebase подключён • Смета сохранена',false);msg('Смета сохранена в облаке.');return true;
    }catch(e){if(estimate?.id)markDirty([String(estimate.id)]);cloudError(e,'sync');status('Облако недоступно — смета сохранена на устройстве',true);return false}
  };
  async function uploadDirty(){
    const ids=Array.from(dirtyIds());
    for(const id of ids) await uploadEstimate(id);
    const ts=tombstones();
    for(const [id,at] of ts){await FIREBASE_REPO.markDeleted(user.uid,id,at);clearDeleted(id)}
    if(read(CATDIRTY,false)===true){
      const savedCatalog=await FIREBASE_REPO.writeCatalog(user.uid,localCatalog());
      write(CATDIRTY,false);
      const cloudAt=Number(savedCatalog?._cloudUpdatedAt)||Date.now();
      try{localStorage.setItem('master_group_catalog_sync_at',String(cloudAt))}catch(_){}
    }
    if(read(PROFDIRTY,false)===true){await FIREBASE_REPO.writeCompany(user.uid,read(COMP,{}));write(PROFDIRTY,false)}
    await FIREBASE_REPO.acknowledge(user.uid,{appVersion:SYNC_VER})
  }
  async function verifyCloudAccess(){if(!root||!user)throw Object.assign(new Error('Cloud access unavailable'),{code:'database/permission-denied'});return FIREBASE_REPO.verify(user.uid)}
  function applyRemoteEstimate(id,v){id=String(id||'');if(!id||!v)return;const local=localEstimates();const idx=local.findIndex(x=>String(x.id)===id);if(v._deleted===true){if(v._purged===true){if(idx>=0){local.splice(idx,1);write(KEY,local);clearDirty(id);clearDeleted(id);}try{const tk='master_group_deleted_estimates_v1';write(tk,read(tk,[]).filter(x=>String(x?.id)!==id));}catch(_){}try{window.__mgRenderTrash?.()}catch(_){}refreshUi();return;}if(idx>=0&&dirtyIds().has(id))return;try{const tk='master_group_deleted_estimates_v1';const ta=JSON.parse(localStorage.getItem(tk)||'[]').filter(x=>x&&String(x.id)!==id);const tomb=JSON.parse(JSON.stringify(v));tomb.id=tomb.id||id;tomb._deletedAt=Number(v._deletedAt)||Date.now();tomb._deletedFrom='estimates';delete tomb._deleted;delete tomb._cloudUpdatedAt;ta.unshift(tomb);localStorage.setItem(tk,JSON.stringify(ta.slice(0,100)));try{window.__mgRenderTrash?.()}catch(_){}}catch(err){console.warn('MG remote trash save failed',err)}if(idx>=0){const before=local[idx];local.splice(idx,1);write(KEY,local);clearDirty(id);clearDeleted(id);refreshUi();if(!starting)addNotification({id:'n_remote_'+Date.now()+'_'+Math.random().toString(36).slice(2),estimateId:id,type:'deleted',title:estimateDisplay(before)+' удалена',body:'Смета удалена на другом устройстве',at:Date.now(),sourceClientId:'remote'},{cloud:false,toastIt:true})}return}const remoteAt=Number(v._cloudUpdatedAt)||0;const remoteClientAt=Number(v._clientUpdatedAt)||0;const oldAt=Math.max(Number(idx>=0?local[idx]._syncUpdatedAt:0)||0,Number(idx>=0?local[idx]._clientUpdatedAt:0)||0);if(idx>=0&&dirtyIds().has(id)){if(remoteAt>oldAt||remoteClientAt>oldAt){addNotification({id:'n_conflict_'+Date.now()+'_'+Math.random().toString(36).slice(2),estimateId:id,type:'change',title:estimateDisplay(local[idx])+' — конфликт синхронизации',body:'Локальные изменения сохранены на устройстве и будут отправлены в облако. Облачная версия не перезаписала их.',at:Date.now(),sourceClientId:'remote'},{cloud:false,toastIt:true});}return;}if(idx>=0&&remoteAt<=oldAt&&remoteClientAt<=oldAt)return;const before=idx>=0?JSON.parse(JSON.stringify(local[idx])):null;let copy=JSON.parse(JSON.stringify(v));delete copy._cloudUpdatedAt;delete copy._deleted;delete copy._deletedAt;if(window.MGDataModel?.normalizeEstimate)copy=window.MGDataModel.normalizeEstimate(copy);copy._syncUpdatedAt=Math.max(remoteAt,remoteClientAt);if(idx>=0)local[idx]=copy;else local.unshift(copy);write(KEY,local);refreshUi();if(!starting){const changes=estimateChanges(before,copy);if(changes.length){const details=changes.map(c=>c.body).filter(Boolean);const kind=changes.some(c=>c.type==='payment')?'payment':changes.some(c=>c.type==='expense')?'expense':changes.some(c=>c.type==='status')?'status':'change';addNotification({id:'n_remote_'+Date.now()+'_'+Math.random().toString(36).slice(2),estimateId:copy.id,type:kind,title:estimateDisplay(copy)+' изменена',body:details.length===1?details[0]:(details.length+' изменений: '+details.slice(0,4).join(' • ')+(details.length>4?' • и ещё '+(details.length-4):'')),at:Date.now(),sourceClientId:'remote'},{cloud:false,toastIt:true})}else if(idx<0){addNotification({id:'n_remote_'+Date.now()+'_'+Math.random().toString(36).slice(2),estimateId:copy.id,type:'created',title:estimateDisplay(copy)+' создана',body:'Новая смета создана на другом устройстве',at:Date.now(),sourceClientId:'remote'},{cloud:false,toastIt:true})}}}
function listen(){stopListeners();if(!root)return;const onListenerError=e=>cloudError(e,'sync');const er=root.child('estimates');const onAdded=s=>{try{applyRemoteEstimate(s.key,s.val())}catch(e){onListenerError(e)}};const onChanged=s=>{try{applyRemoteEstimate(s.key,s.val())}catch(e){onListenerError(e)}};const onRemoved=s=>{try{const id=String(s.key);if(!starting&&!dirtyIds().has(id)){const a=localEstimates().filter(x=>String(x.id)!==id);write(KEY,a);}const tk='master_group_deleted_estimates_v1';const trash=read(tk,[]).filter(x=>String(x?.id)!==id);write(tk,trash);try{window.__mgRenderTrash?.()}catch(_){}refreshUi();if(!starting)notify('Смета удалена навсегда','Изменение пришло с другого устройства')}catch(e){onListenerError(e)}};estimateListener={er,onAdded,onChanged,onRemoved};er.on('child_added',onAdded,onListenerError);er.on('child_changed',onChanged,onListenerError);er.on('child_removed',onRemoved,onListenerError);catalogListener=root.child('catalog').on('value',s=>{const v=s.val();if(!v||read(CATDIRTY,false)===true)return;const at=Number(v._cloudUpdatedAt)||0;const localAt=Number(localStorage.getItem('master_group_catalog_sync_at')||0);if(at>localAt&&Array.isArray(v.data)){write(CAT,v.data);localStorage.setItem('master_group_catalog_sync_at',String(at));refreshUi();notify('Каталог обновлён','Направления и услуги синхронизированы')}},onListenerError);companyListener=root.child('company').on('value',s=>{const v=s.val();if(!v||read(PROFDIRTY,false)===true)return;const at=Number(v._cloudUpdatedAt)||0;const localAt=Number(localStorage.getItem('master_group_company_sync_at')||0);if(at>localAt&&v.data){write(COMP,v.data);localStorage.setItem('master_group_company_sync_at',String(at));refreshUi();notify('Профиль обновлён','Данные компании синхронизированы')}},onListenerError);notificationListener=root.child('notifications').on('child_added',s=>{const n=s.val();if(!n||String(n.sourceClientId||'')===notificationClientId())return;addNotification(n,{cloud:false,toastIt:true})},onListenerError)}
function stopListeners(){try{if(root){if(estimateListener){const er=estimateListener.er;er.off('child_added',estimateListener.onAdded);er.off('child_changed',estimateListener.onChanged);er.off('child_removed',estimateListener.onRemoved)}if(catalogListener)root.child('catalog').off('value',catalogListener);if(companyListener)root.child('company').off('value',companyListener);if(notificationListener)root.child('notifications').off('child_added',notificationListener)}}catch(e){}estimateListener=catalogListener=companyListener=notificationListener=null}
  async function syncNow(){
    if(!cloudMode||busy||!root||!user)return;
    busy=true;
    status('Синхронизация…',false);
    try{
      normalizeLocalIds();
      const queued=SYNC_ENGINE?SYNC_ENGINE.due(100):[];
      const ids=Array.from(new Set([...Array.from(dirtyIds()),...queued.filter(x=>x.kind==='estimate').map(x=>String(x.id))]));
      for(const id of ids){
        try{await uploadEstimate(id);if(SYNC_ENGINE)SYNC_ENGINE.remove('estimate',id)}
        catch(err){markDirty([id]);if(SYNC_ENGINE)SYNC_ENGINE.fail('estimate',id,err);throw err}
      }
      const ts=tombstones();
      for(const [id,at] of ts){
        try{await FIREBASE_REPO.markDeleted(user.uid,id,at);clearDeleted(id)}
        catch(err){if(SYNC_ENGINE)SYNC_ENGINE.fail('delete',id,err);throw err}
      }
      if(read(CATDIRTY,false)===true){
        const savedCatalog=await FIREBASE_REPO.writeCatalog(user.uid,localCatalog());
        write(CATDIRTY,false);
        try{localStorage.removeItem('master_group_catalog_local_updated_at')}catch(_){}
        const cloudAt=Number(savedCatalog?._cloudUpdatedAt)||Date.now();
        try{localStorage.setItem('master_group_catalog_sync_at',String(cloudAt))}catch(_){}
      }
      if(read(PROFDIRTY,false)===true){
        await FIREBASE_REPO.writeCompany(user.uid,read(COMP,{}));
        write(PROFDIRTY,false);
      }
      await FIREBASE_REPO.acknowledge(user.uid,{appVersion:SYNC_VER,lastClientCheck:window.MGFirebaseClient.serverTimestamp()});
      status('Firebase подключён • Все данные сохранены',false);
      msg('Все данные сохранены в облаке.');
      return true;
    }catch(e){
      cloudError(e,'sync');
      status('Облако недоступно — данные сохранены на устройстве',true);
      try{if(user)setTimeout(()=>{if(user&&cloudMode&&!busy)syncNow();else if(user&&!cloudMode)initialSync()},3000)}catch(_){}
      return false;
    }finally{busy=false}
  }
  async function initialSync(){if(!user||!db)return;busy=true;starting=true;try{
    normalizeLocalIds();root=FIREBASE_REPO.path(user.uid);
    await verifyCloudAccess();
    const snap=await root.child('estimates').once('value');const remote=snap.val()||{};const local=localEstimates();
    for(const e of local){if(!remote[e.id]||Number(e._syncUpdatedAt||0)>Number(remote[e.id]?._cloudUpdatedAt||0))markDirty([e.id])}
    for(const id of Object.keys(remote)){const v=remote[id];if(v?._deleted&&v?._purged){const a=localEstimates().filter(e=>String(e.id)!==String(id));write(KEY,a);clearDirty(id);clearDeleted(id);try{const tk='master_group_deleted_estimates_v1';write(tk,read(tk,[]).filter(x=>String(x?.id)!==String(id)));}catch(_){}try{window.__mgRenderTrash?.()}catch(_){}continue;}if(v?._deleted){
        const localMatch=localEstimates().find(e=>String(e.id)===String(id));
        const remoteAt=Number(v._cloudUpdatedAt)||Number(v._deletedAt)||0;
        const localAt=Number(localMatch?._syncUpdatedAt||0);
        if(!localMatch || remoteAt>=localAt){
          try{
            const tk='master_group_deleted_estimates_v1';
            const ta=JSON.parse(localStorage.getItem(tk)||'[]').filter(x=>x&&String(x.id)!==String(id));
            const tomb=JSON.parse(JSON.stringify(v));
            tomb.id=tomb.id||id; tomb._deletedAt=Number(v._deletedAt)||Date.now(); tomb._deletedFrom='estimates';
            delete tomb._deleted; delete tomb._cloudUpdatedAt;
            ta.unshift(tomb); localStorage.setItem(tk,JSON.stringify(ta.slice(0,100)));try{window.__mgRenderTrash?.()}catch(_){}
          }catch(err){console.warn('MG startup trash save failed',err)}
          const a=localEstimates().filter(e=>String(e.id)!==String(id));write(KEY,a);clearDirty(id);clearDeleted(id);
        }
        continue;
      }applyRemoteEstimate(id,v)}
    const catalogSnap=await root.child('catalog').once('value');
    const remoteCatalog=catalogSnap.val();
    // Never overwrite a catalog that was changed locally but whose dirty marker is
    // missing or was created during startup. Local directions must survive the first sync.
    const catalogDirty=read(CATDIRTY,false)===true;
    const catalogLocalChangedAt=Number(localStorage.getItem('master_group_catalog_local_updated_at')||0);
    if(!catalogDirty && !catalogLocalChangedAt && Array.isArray(remoteCatalog?.data)){
      // Cloud catalog is authoritative only when there are no local catalog changes.
      // Do not require localCatalog().length===0: that condition made newly-created
      // or default local directions survive only until a refresh on another device.
      const cloudAt=Number(remoteCatalog?._cloudUpdatedAt)||0;
      const localAt=Number(localStorage.getItem('master_group_catalog_sync_at')||0);
      if(cloudAt>=localAt || !localAt){
        write(CAT,remoteCatalog.data);
        try{localStorage.setItem('master_group_catalog_sync_at',String(cloudAt||Date.now()))}catch(_){}
      }
    }
    if(read(PROFDIRTY,false)!==true){const c=await root.child('company').once('value');const v=c.val();if(v?.data&&Object.keys(read(COMP,{})).length===0)write(COMP,v.data)}
    cloudMode=true;
    listen();
    // initialSync already owns the startup lock. Release it before calling syncNow(),
    // otherwise syncNow() immediately returns because busy===true and startup is
    // incorrectly reported as a cloud failure.
    busy=false;
    const ok=await syncNow();
    if(!ok)throw Object.assign(new Error('Initial cloud sync failed'),{code:'database/unavailable'});
    status('Firebase подключён • Все данные сохранены',false);
    msg('Аккаунт подключён. Данные загружены и проверены в облаке.');
    unlockAuthGate();
    refreshUi();
  }catch(e){cloudMode=false;stopListeners();const code=String(e?.code||'').toLowerCase(),text=String(e?.message||'').toLowerCase();const denied=code.includes('permission-denied')||text.includes('permission_denied')||text.includes('permission denied');const friendly=firebaseFriendlyError(e,'startup');console.error('Firebase sync:',e?.code||'unknown',e);if(denied){status('Облако не подключено',true);msg('Не удалось подключить облако. Откройте «Диагностика Firebase» — там будет точный этап и код ошибки.',true);keepAuthVisible();try{if(typeof toast==='function')toast('Облако не подключено — проверьте правила Firebase.')}catch(x){}return}msg(friendly,true);status('Облако не подключено',true);keepAuthVisible()}finally{starting=false;busy=false}}

  /* Firebase Diagnostic Center: deterministic, non-destructive cloud test. */
  let mgFdLastReport='';
  function mgFdEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function mgFdErr(e){
    const code=String(e?.code||'unknown');
    const message=String(e?.message||e||'Unknown error');
    return {code,message};
  }
  function mgFdRow(name,ok,detail,badge){
    const cls=ok===true?'ok':ok===false?'fail':'warn';
    const icon=ok===true?'✓':ok===false?'✕':'•';
    return `<div class="mg-fd-row ${cls}"><div class="mg-fd-icon">${icon}</div><div><div class="mg-fd-name">${mgFdEsc(name)}</div><div class="mg-fd-detail">${mgFdEsc(detail)}</div></div><div class="mg-fd-badge">${mgFdEsc(badge|| (ok===true?'OK':ok===false?'ОШИБКА':'ПРОВЕРКА'))}</div></div>`;
  }
  function mgFdSet(summary,rows,log){
    const box=$('mgFdSummary'),grid=$('mgFdGrid'),lg=$('mgFdLog');
    if(box)box.innerHTML=summary;
    if(grid)grid.innerHTML=rows.join('');
    if(lg){lg.textContent=log||'';lg.hidden=!log}
  }
  function mgFdOpen(){
    const el=$('mgFirebaseDiagnostic');if(!el)return;
    el.hidden=false;mgFdSet('<strong>Готово к проверке.</strong><br>Нажмите «Запустить диагностику».',[], '');
    const run=$('mgFdRun');if(run)run.disabled=false;
  }
  function mgFdClose(){const el=$('mgFirebaseDiagnostic');if(el)el.hidden=true}
  async function mgFdRun(){
    const run=$('mgFdRun'),copy=$('mgFdCopy');if(run)run.disabled=true;if(copy)copy.disabled=true;
    const rows=[];const log=[];const started=Date.now();
    const addLog=(x)=>{log.push(new Date().toISOString()+'  '+x)};
    addLog('Diagnostic started');
    let authUser=null, diagnosticPath='', diagnosticWritten=false, diagnosticRead=false, diagnosticDeleted=false;
    try{
      const sdkOk=!!(window.firebase&&typeof firebase.initializeApp==='function'&&typeof firebase.auth==='function'&&typeof firebase.database==='function');
      rows.push(mgFdRow('Firebase SDK',sdkOk,sdkOk?'Compat SDK загружен: app + auth + database.':'Firebase SDK не загружен. Проверьте интернет, CSP и загрузку gstatic.com.'));
      addLog('SDK: '+sdkOk);
      if(!sdkOk)throw Object.assign(new Error('Firebase SDK is not available'),{code:'sdk/not-loaded'});

      const configOk=configReady();
      rows.push(mgFdRow('Firebase Config',configOk,configOk?'projectId: '+FIREBASE_CONFIG.projectId+' • databaseURL: '+FIREBASE_CONFIG.databaseURL:'Конфигурация Firebase не заполнена или содержит placeholder.'));
      addLog('Config: '+configOk+' project='+FIREBASE_CONFIG.projectId);
      if(!configOk)throw Object.assign(new Error('Firebase config is not ready'),{code:'config/not-ready'});

      if(!window.__mgFirebaseInitialized){
        const ok=initFirebase();
        addLog('initFirebase() => '+ok);
      }
      const authOk=!!auth;
      rows.push(mgFdRow('Firebase Auth SDK',authOk,authOk?'Auth instance создан.':'Auth instance отсутствует.'));
      addLog('Auth instance: '+authOk);
      if(!authOk)throw Object.assign(new Error('Firebase Auth is not initialized'),{code:'auth/not-initialized'});

      authUser=auth.currentUser||user||null;
      if(!authUser){
        rows.push(mgFdRow('Firebase Auth user',false,'Firebase Authentication не видит вошедшего пользователя. Интерфейс приложения и Firebase Auth могут быть в разных состояниях.','НЕТ USER'));
        throw Object.assign(new Error('No Firebase Auth user'),{code:'auth/no-current-user'});
      }
      rows.push(mgFdRow('Firebase Auth user',true,'Firebase UID: '+authUser.uid+' • email: '+(authUser.email||'не указан'),'UID OK'));
      addLog('Auth UID: '+authUser.uid);

      const dbOk=!!db;
      rows.push(mgFdRow('Realtime Database SDK',dbOk,dbOk?'Database instance создан.':'Database instance отсутствует.'));
      if(!dbOk)throw Object.assign(new Error('Realtime Database is not initialized'),{code:'database/not-initialized'});

      const testRoot=db.ref('users/'+authUser.uid);
      const connectedRef=db.ref('.info/connected');
      let connected=null;
      try{connected=(await connectedRef.once('value')).val();}catch(e){addLog('Connection probe error: '+(e.code||e.message));}
      rows.push(mgFdRow('Database connection',connected===true,connected===true?'Firebase сообщает, что клиент подключён к Realtime Database.':connected===false?'Firebase сообщает, что соединение сейчас не установлено. Запись ниже даст точную причину.':'Не удалось определить состояние .info/connected.','CONNECTED='+String(connected)));
      addLog('.info/connected='+String(connected));

      const metaRef=testRoot.child('_meta/diagnosticCheck');
      try{
        await metaRef.set(firebase.database.ServerValue.TIMESTAMP);
        const metaSnap=await metaRef.once('value');
        const metaOk=metaSnap.exists();
        rows.push(mgFdRow('User branch read/write',metaOk,metaOk?'Запись и чтение /users/{uid}/_meta работают.':'Firebase не подтвердил запись в _meta.'));
        addLog('Meta write/read: '+metaOk);
        try{await metaRef.remove()}catch(e){addLog('Meta cleanup: '+(e.code||e.message))}
        if(!metaOk)throw Object.assign(new Error('Meta write was not confirmed'),{code:'database/meta-not-confirmed'});
      }catch(e){
        const er=mgFdErr(e);rows.push(mgFdRow('User branch read/write',false,er.code+' — '+er.message,'ОШИБКА '+er.code));addLog('Meta error: '+er.code+' '+er.message);throw e;
      }

      diagnosticPath='users/'+authUser.uid+'/estimates/_diagnostic_'+Date.now();
      const diagnosticRef=db.ref(diagnosticPath);
      const payload={_diagnostic:true,id:'_diagnostic_'+Date.now(),createdAt:firebase.database.ServerValue.TIMESTAMP,appVersion:SYNC_VER};
      try{
        await diagnosticRef.set(payload);diagnosticWritten=true;
        rows.push(mgFdRow('ESTIMATES write',true,'Тестовая запись успешно создана по пути '+diagnosticPath,'WRITE OK'));
        addLog('Estimate test write: OK path='+diagnosticPath);
      }catch(e){
        const er=mgFdErr(e);rows.push(mgFdRow('ESTIMATES write',false,er.code+' — '+er.message+' • path='+diagnosticPath,'ОШИБКА '+er.code));addLog('Estimate write error: '+er.code+' '+er.message);
        throw e;
      }
      try{
        const snap=await diagnosticRef.once('value');diagnosticRead=snap.exists()&&snap.val()?._diagnostic===true;
        rows.push(mgFdRow('ESTIMATES read-back',diagnosticRead,diagnosticRead?'Тестовая запись прочитана обратно из Firebase.':'Запись создана, но не была подтверждена чтением.'));
        addLog('Estimate read-back: '+diagnosticRead);
      }catch(e){
        const er=mgFdErr(e);rows.push(mgFdRow('ESTIMATES read-back',false,er.code+' — '+er.message,'ОШИБКА '+er.code));addLog('Estimate read error: '+er.code+' '+er.message);
      }
      try{
        await diagnosticRef.remove();
        const gone=!(await diagnosticRef.once('value')).exists();diagnosticDeleted=gone;
        rows.push(mgFdRow('Diagnostic cleanup',gone,'Временная тестовая запись удалена.','CLEAN'));
        addLog('Cleanup: '+gone);
      }catch(e){
        const er=mgFdErr(e);rows.push(mgFdRow('Diagnostic cleanup',false,er.code+' — '+er.message+' • запись можно удалить вручную по указанному пути.','ОШИБКА '+er.code));addLog('Cleanup error: '+er.code+' '+er.message);
      }

      const allGood=rows.filter(r=>r.includes('class="mg-fd-row fail"')).length===0 && diagnosticWritten && diagnosticRead;
      const elapsed=Date.now()-started;
      const summary=allGood
        ? `<strong>✓ Firebase подключён и путь estimates работает.</strong><br>Auth, UID, Database, запись и чтение сметы подтверждены за ${elapsed} мс.`
        : `<strong>⚠ Диагностика завершена с проблемой.</strong><br>Смотрите красную строку ниже — там указан точный Firebase code и сообщение.`;
      mgFdSet(summary,rows,log.join('\n'));
      mgFdLastReport='Master Group Firebase Diagnostic\n'+summary.replace(/<[^>]+>/g,'')+'\n\n'+rows.map(x=>x.replace(/<[^>]+>/g,' ')).join('\n')+'\n\n'+log.join('\n');
      if(copy)copy.disabled=false;
      if(allGood){status('Firebase подключён • Диагностика OK',false);msg('Firebase Diagnostic Center: запись в estimates подтверждена.');}
      else status('Firebase: найдена проблема',true);
      return allGood;
    }catch(e){
      const er=mgFdErr(e);addLog('Fatal: '+er.code+' '+er.message);
      const summary=`<strong>✕ Firebase не прошёл проверку.</strong><br>Причина: <span class="mg-fd-status">${mgFdEsc(er.code)}</span> — ${mgFdEsc(er.message)}`;
      mgFdSet(summary,rows,log.join('\n'));
      mgFdLastReport='Master Group Firebase Diagnostic\n'+summary.replace(/<[^>]+>/g,'')+'\n\n'+rows.map(x=>x.replace(/<[^>]+>/g,' ')).join('\n')+'\n\n'+log.join('\n');
      if(copy)copy.disabled=false;
      status('Firebase: '+er.code,true);
      return false;
    }finally{
      if(run)run.disabled=false;
      if(diagnosticWritten&&!diagnosticDeleted){
        try{await db.ref(diagnosticPath).remove()}catch(_){/* leave path visible in log if cleanup is denied */}
      }
    }
  }
  function mgFdCopy(){
    if(!mgFdLastReport)return;
    const done=()=>{try{toast('Отчёт диагностики скопирован')}catch(_) {}};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(mgFdLastReport).then(done).catch(()=>{});else{const ta=document.createElement('textarea');ta.value=mgFdLastReport;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(_){}ta.remove()}
  }
  function mgFdInit(){
    const open=$('mgFirebaseDiagnosticOpen'),close=$('mgFdClose'),run=$('mgFdRun'),copy=$('mgFdCopy');
    if(open)open.onclick=mgFdOpen;if(close)close.onclick=mgFdClose;if(run)run.onclick=mgFdRun;if(copy)copy.onclick=mgFdCopy;
    const overlay=$('mgFirebaseDiagnostic');if(overlay)overlay.addEventListener('click',e=>{if(e.target===overlay)mgFdClose()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('mgFirebaseDiagnostic')?.hidden)mgFdClose()});
    window.__mgOpenFirebaseDiagnostics=mgFdOpen;window.__mgRunFirebaseDiagnostics=mgFdRun;
  }
  mgFdInit();

  function boot(){
    // Keep the login overlay hidden while Firebase restores a saved session.
    // Showing it before onAuthStateChanged resolves caused a visible flash on refresh.
    const gate=$('mgCloudAuth');
    if(gate){gate.hidden=true;gate.style.display='none'}
    if(!initFirebase()){showAuth('login');return}
    auth.onAuthStateChanged(async u=>{
      user=u||null;
      if(!u){
        cloudMode=false;
        stopListeners();
        if($('mgCloudStatus'))$('mgCloudStatus').hidden=true;
        // Never hide the authentication gate while Firebase is resolving or after a failed attempt.
        keepAuthVisible();
        if(authAttempt)msg('Подключение…');
        else if(!$('mgCloudMsg')?.textContent)showAuth('login');
        return;
      }
      try{
        // For a restored session, do not reveal the login overlay during startup.
        // The overlay is only kept visible for a user-initiated login attempt.
        if(authAttempt) keepAuthVisible();
        await initialSync();
      }catch(e){
        // Authentication UI stays mounted until cloud initialization really succeeds.
        keepAuthVisible();
      }
    });
  }
  $('mgCloudClose').onclick=()=>{
    const el=$('mgCloudAuth');
    if(!el)return;
    el.hidden=true;
    el.style.display='none';
    authAttempt=false;
  };
  $('mgCloudLoginTab').onclick=()=>showAuth('login');
  $('mgCloudSignupTab').onclick=()=>showAuth('signup');
  $('mgCloudCreate').onclick=()=>showAuth($('mgCloudSignupTab').classList.contains('active')?'login':'signup');
  $('mgCloudLocal').onclick=()=>{hideAuth();status('Локальный режим',true)};
  $('mgCloudPasswordToggle').onclick=()=>{
    const input=$('mgCloudPassword'),show=input.type==='password';
    input.type=show?'text':'password';
    $('mgCloudPasswordToggle').textContent=show?'◌':'◉';
    $('mgCloudPasswordToggle').setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль');
  };
  $('mgCloudForgot').onclick=async()=>{
    const email=$('mgCloudEmail').value.trim();
    if(!email){msg('Введите Email для восстановления пароля.',true);$('mgCloudEmail').focus();return}
    if(!auth){msg('Облачный сервис сейчас недоступен.',true);return}
    try{
      $('mgCloudForgot').disabled=true;
      await auth.sendPasswordResetEmail(email);
      msg('Письмо для восстановления пароля отправлено.');
    }catch(err){cloudError(err,'auth')}
    finally{setTimeout(()=>{if($('mgCloudSignupTab').classList.contains('active'))$('mgCloudForgot').disabled=true;else $('mgCloudForgot').disabled=false},800)}
  };
  $('mgCloudLogout').onclick=async()=>{if(confirm('Выйти из Firebase аккаунта?'))await auth.signOut()};
  $('mgCloudAuthForm').addEventListener('submit',async e=>{e.preventDefault();if(!auth||busy||authAttempt)return;const email=$('mgCloudEmail').value.trim(),password=$('mgCloudPassword').value,signup=$('mgCloudSignupTab').classList.contains('active');authAttempt=true;keepAuthVisible();msg('Подключение…');$('mgCloudSubmit').disabled=true;try{if(signup)await auth.createUserWithEmailAndPassword(email,password);else await auth.signInWithEmailAndPassword(email,password)}catch(err){authAttempt=false;keepAuthVisible();cloudError(err,'auth')}finally{$('mgCloudSubmit').disabled=false}});
  window.__mgFirebaseSyncNow=syncNow;
  window.__mgFirebaseRetry=async function(){if(!user){showAuth('login');return false}return await initialSync()};
  window.addEventListener('online',()=>{if(user&&!cloudMode){setTimeout(()=>initialSync(),500)}else if(user&&cloudMode)scheduleUpload();if(SYNC_ENGINE)SYNC_ENGINE.setMeta({lastOnlineAt:Date.now()})});
  window.addEventListener('offline',()=>{if(SYNC_ENGINE)SYNC_ENGINE.setMeta({lastOfflineAt:Date.now()});status('Нет интернета — данные сохраняются на устройстве',true)});
  window.__mgFirebaseVersion=SYNC_VER;try{renderNotifications();updateNotificationBadge()}catch(e){}boot();
  /* Global estimate-number allocator. It intentionally lives inside the Firebase
     closure so it uses the authenticated account and the shared transactional counter. */
  window.__mgAllocateEstimateNumber=async function(){
    if(!user||!cloudMode||!FIREBASE_REPO?.nextEstimateNumber) return null;
    const n=await FIREBASE_REPO.nextEstimateNumber(user.uid);
    if(!Number.isFinite(Number(n))||Number(n)<1) throw new Error('Некорректный номер сметы');
    const out='MG-'+String(n).padStart(4,'0');
    try{localStorage.setItem('mg_counter',String(n))}catch(_){ }
    return out;
  };

})();
