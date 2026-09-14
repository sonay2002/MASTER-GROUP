/* Master Group v208 — persistent in-app PWA update flow */
(()=>{
'use strict';
const APP_VERSION=document.querySelector('meta[name="app-version"]')?.content||'unknown';
let registration=null,waitingWorker=null;
const SNOOZE_KEY='mg_update_snooze_until_v1';
const $=id=>document.getElementById(id);
const notice=$('mgUpdateNotice'),noticeText=$('mgUpdateNoticeText'),later=$('mgUpdateLaterBtn'),now=$('mgUpdateNowBtn'),check=$('mgCheckUpdateBtn'),status=$('mgUpdateSettingsStatus'),settingsText=$('mgUpdateSettingsText');
function snoozed(){try{return Number(localStorage.getItem(SNOOZE_KEY)||0)>Date.now()}catch{return false}}
function showUpdate(w,force=false){
  if(!w)return;
  waitingWorker=w;
  if(noticeText)noticeText.textContent='Новая версия уже готова. Выберите «Обновить сейчас» или установите её позже в разделе «Настройки → Обновления».';
  if(status)status.textContent='Доступно новое обновление';
  if(settingsText)settingsText.textContent=`Текущая версия ${APP_VERSION}. Новая версия уже готова к установке.`;
  if(notice && (!snoozed() || force)){notice.hidden=false;notice.classList.add('is-visible');document.body.classList.add('mg-update-open');}
}
function hideNotice(){if(notice){notice.hidden=true;notice.classList.remove('is-visible');document.body.classList.remove('mg-update-open')}}
function apply(){
  const w=waitingWorker||registration?.waiting;
  if(!w){checkUpdate(true);return;}
  if(now){now.disabled=true;now.textContent='Обновляем…'}
  w.postMessage({type:'SKIP_WAITING'});
}
function bind(reg){
  registration=reg;
  if(reg.waiting)showUpdate(reg.waiting);
  reg.addEventListener('updatefound',()=>{
    const w=reg.installing;if(!w)return;
    w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate(w,true);});
  });
  // Do not reload automatically on controller change. On first installation Safari/iOS
  // can activate the Service Worker while the user is submitting the login form; an
  // automatic reload then restarts the whole app and makes the auth dialog appear again.
  // Updates are still installed normally and the user can reopen/apply them explicitly.
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    window.__mgServiceWorkerChanged=true;
  });
}
async function checkUpdate(manual=false){
  if(!registration){if(manual&&status)status.textContent='Обновление пока недоступно для проверки';return;}
  if(manual&&status)status.textContent='Проверяем…';
  try{
    await registration.update();
    if(registration.waiting)showUpdate(registration.waiting,true);
    else if(manual&&status)status.textContent=`Версия ${APP_VERSION} · актуально`;
  }catch(_){if(manual&&status)status.textContent='Не удалось проверить · попробуйте ещё раз';}
}
later?.addEventListener('click',()=>{
  try{localStorage.setItem(SNOOZE_KEY,String(Date.now()+24*60*60*1000))}catch{}
  hideNotice();
  if(status)status.textContent='Обновление доступно · напомним позже';
});
now?.addEventListener('click',apply);
check?.addEventListener('click',()=>checkUpdate(true));
if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register(`sw.js?v=${encodeURIComponent(APP_VERSION)}`,{updateViaCache:'none'});
      bind(reg);
      setTimeout(()=>checkUpdate(false),700);
    }catch(_){if(status)status.textContent='Обновления временно недоступны';}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate(false);});
}
})();
