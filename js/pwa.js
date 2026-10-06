/* Master Group v376 — reliable in-app PWA update flow */
(()=>{
'use strict';
const APP_VERSION=document.querySelector('meta[name="app-version"]')?.content||'unknown';
let registration=null,waitingWorker=null,applyingUpdate=false,reloadTimer=null;
const SNOOZE_KEY='mg_update_snooze_until_v1';
const $=id=>document.getElementById(id);
const notice=$('mgUpdateNotice'),noticeText=$('mgUpdateNoticeText'),later=$('mgUpdateLaterBtn'),now=$('mgUpdateNowBtn'),check=$('mgCheckUpdateBtn'),status=$('mgUpdateSettingsStatus'),settingsText=$('mgUpdateSettingsText');
function snoozed(){try{return Number(localStorage.getItem(SNOOZE_KEY)||0)>Date.now()}catch{return false}}
function showUpdate(w,force=false){
  if(!w)return;
  waitingWorker=w;
  if(noticeText)noticeText.textContent='Новая версия уже загружена. Нажмите «Обновить сейчас», чтобы применить её.';
  if(status)status.textContent='Доступно новое обновление';
  if(settingsText)settingsText.textContent=`Текущая версия ${APP_VERSION}. Новая версия уже загружена и готова к установке.`;
  if(notice && (!snoozed() || force)){notice.hidden=false;notice.classList.add('is-visible');document.body.classList.add('mg-update-open');}
}
function hideNotice(){if(notice){notice.hidden=true;notice.classList.remove('is-visible');document.body.classList.remove('mg-update-open')}}
function finishReload(){
  if(!applyingUpdate)return;
  applyingUpdate=false;
  if(reloadTimer){clearTimeout(reloadTimer);reloadTimer=null;}
  window.location.reload();
}
function apply(){
  if(applyingUpdate)return;
  const w=waitingWorker||registration?.waiting;
  if(!w){
    if(now){now.disabled=true;now.textContent='Проверяем…';}
    checkUpdate(true).finally(()=>{
      const fresh=waitingWorker||registration?.waiting;
      if(fresh)apply();
      else if(now){now.disabled=false;now.textContent='Обновить сейчас';}
    });
    return;
  }
  applyingUpdate=true;
  if(now){now.disabled=true;now.textContent='Обновляем…'}
  if(status)status.textContent='Устанавливаем обновление…';
  const target=w;
  const onState=()=>{
    if(target.state==='redundant'&&!navigator.serviceWorker.controller){
      if(status)status.textContent='Не удалось установить обновление';
      applyingUpdate=false;
      if(now){now.disabled=false;now.textContent='Обновить сейчас'}
    }
  };
  target.addEventListener('statechange',onState);
  try{target.postMessage({type:'SKIP_WAITING'});}catch(err){
    console.warn('MG update activation failed',err);
    applyingUpdate=false;
    if(now){now.disabled=false;now.textContent='Обновить сейчас'}
    if(status)status.textContent='Не удалось установить обновление';
    return;
  }
  // Safety fallback: if activation succeeds but a browser does not emit
  // controllerchange promptly, reload once the worker becomes active.
  reloadTimer=setTimeout(async()=>{
    try{await registration?.update();}catch(_){}
    if(registration?.active && applyingUpdate)finishReload();
  },8000);
}
function bind(reg){
  registration=reg;
  if(reg.waiting)showUpdate(reg.waiting);
  reg.addEventListener('updatefound',()=>{
    const w=reg.installing;if(!w)return;
    w.addEventListener('statechange',()=>{
      if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate(w,true);
    });
  });
}
async function checkUpdate(manual=false){
  if(!registration){
    if(manual&&status)status.textContent='Обновление пока недоступно для проверки';
    return;
  }
  if(manual&&status)status.textContent='Проверяем…';
  try{
    await registration.update();
    if(registration.waiting){
      showUpdate(registration.waiting,true);
    }else if(manual&&status){
      status.textContent=`Версия ${APP_VERSION} · актуально`;
    }
  }catch(err){
    console.warn('MG update check failed',err);
    if(manual&&status)status.textContent='Не удалось проверить · попробуйте ещё раз';
  }
}
later?.addEventListener('click',()=>{
  try{localStorage.setItem(SNOOZE_KEY,String(Date.now()+24*60*60*1000))}catch{}
  hideNotice();
  if(status)status.textContent='Обновление доступно · напомним позже';
});
now?.addEventListener('click',apply);
check?.addEventListener('click',()=>checkUpdate(true));
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(applyingUpdate)finishReload();
  });
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register(`sw.js?v=${encodeURIComponent(APP_VERSION)}`,{updateViaCache:'none'});
      bind(reg);
      setTimeout(()=>checkUpdate(false),700);
    }catch(err){
      console.warn('MG Service Worker registration failed',err);
      if(status)status.textContent='Обновления временно недоступны';
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate(false)});
}
})();
