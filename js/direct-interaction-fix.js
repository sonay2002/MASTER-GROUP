/* Master Group v177 — direct interaction recovery + Settings navigation.
 * Mobile Safari/Android hardening for actions that must remain tappable.
 */
(()=>{
  'use strict';
  const core=()=>window.MGAppCore||{};
  const finance=()=>window.MGAppFinance||{};
  const run=(fn)=>{try{if(typeof fn==='function'){const r=fn(); if(r&&typeof r.catch==='function')r.catch(console.warn); return true}}catch(e){console.warn(e)}return false};


  // v155: hard fallback that does not call finance/core at all before switching screens.
  // This guarantees the menu item can open Settings even if a legacy module throws.
  window.__mgForceOpenSettings=()=>{
    try{
      const overlay=document.getElementById('drawerOverlay');
      if(overlay) overlay.classList.remove('open');
      document.querySelectorAll('.screen').forEach(x=>{x.hidden=x.id!=='settingsScreen'});
      const st=window.MGState;
      if(st) st.screen='settingsScreen';
      window.scrollTo(0,0);
      try{ if(typeof window.MGAppCore?.renderSettings==='function') window.MGAppCore.renderSettings(); }catch(err){ console.warn('MG settings render:',err); }
      try{ if(typeof window.MGAppFinance?.v59SetSettingsTab==='function') window.MGAppFinance.v59SetSettingsTab(localStorage.getItem('master_group_settings_tab_v1')||'catalog'); }catch(err){ console.warn('MG settings tab:',err); }
    }catch(err){ console.warn('MG force settings:',err); }
    return false;
  };

  window.__mgOpenSettingsDirect=()=>{
    const f=finance(), c=core();
    const next=f.showSettings||c.showSettings||window.showSettings;
    try{
      document.getElementById('drawerOverlay')?.classList.remove('open');
      if(typeof next==='function'){ next(); return false; }
      const render=c.renderSettings;
      const screen=c.screen;
      if(typeof render==='function' && typeof screen==='function'){
        render(); screen('settingsScreen'); return false;
      }
    }catch(e){console.warn('MG settings',e)}
    return false;
  };


  // v181: hard direct Share action. Do not rely on the legacy delegated
  // click handlers: iOS/WebViews can swallow the event or another module can
  // overwrite MGAppFinance.share. This function is intentionally synchronous
  // until navigator.share() is invoked so iOS keeps the user-gesture context.
  window.__mgDirectShare=()=>{
    try{
      const c=core(), e0=c.state?.estimate;
      if(!e0){ c.toast?.('Сначала откройте сохранённую смету'); return false; }
      const moneyFn=c.money||((v)=>Number(v||0).toFixed(2));
      const items=typeof c.allItemsFromEstimate==='function'?c.allItemsFromEstimate(e0):[];
      const text='Master Group — Смета '+(e0.number||'')+'\n'
        +'Клиент: '+(e0.client||'—')+'\n'
        +'Телефон: '+(e0.phone||'—')+'\n'
        +'Адрес: '+(e0.address||e0.object||'—')+'\n\n'
        +items.map((x,i)=>(i+1)+'. '+(x.direction?x.direction+' — ':'')+(x.name||'Услуга')
          +' — '+(x.qty||0)+' '+(x.unit||'шт')+' × '+moneyFn(x.price)+' = '+moneyFn((Number(x.qty)||0)*(Number(x.price)||0))+' MDL').join('\n')
        +'\n\nИТОГО: '+moneyFn(e0.total)+' MDL';
      if(typeof navigator.share==='function'){
        const shareData={title:'Master Group — Смета '+(e0.number||''),text};
        const result=navigator.share(shareData);
        if(result&&typeof result.then==='function'){
          result.then(()=>{try{if(typeof window.v60AskSent==='function')window.v60AskSent(e0.id)}catch(_){}},err=>{if(err?.name!=='AbortError')console.warn('MG direct share:',err)});
        }
        return false;
      }
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(text).then(()=>c.toast?.('Смета скопирована — можно отправить клиенту')).catch(()=>c.toast?.('Не удалось скопировать смету'));
        return false;
      }
      c.toast?.('Поделиться недоступно в этом браузере');
    }catch(err){ console.warn('MG direct share failed:',err); try{core().toast?.('Не удалось открыть меню «Поделиться»');}catch(_){} }
    return false;
  };

  // v177: Settings navigation is handled in capture phase so no legacy menu
  // listener, overlay, or delegated handler can swallow the tap.
  document.addEventListener('click', event=>{
    const target=event.target?.closest?.('[data-menu-action="settings"]');
    if(!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try{
      document.getElementById('drawerOverlay')?.classList.remove('open');
      const open=window.__mgOpenSettingsDirect||window.__mgForceOpenSettings||
        window.MGAppFinance?.showSettings||window.MGAppCore?.showSettings;
      if(typeof open==='function') open();
      else {
        document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='settingsScreen');
        const st=window.MGState; if(st) st.screen='settingsScreen';
      }
    }catch(err){
      console.warn('MG v177 settings navigation:',err);
      document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='settingsScreen');
      const st=window.MGState; if(st) st.screen='settingsScreen';
    }
  }, true);

  function harden(root=document){
    root.querySelectorAll?.('[data-add-payment],[data-edit-expenses],[data-menu-action="settings"],[data-action="share"]').forEach(el=>{
      el.style.pointerEvents='auto';
      el.style.position='relative';
      el.style.zIndex='20';
      el.style.touchAction='manipulation';
      el.style.webkitTapHighlightColor='transparent';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>harden()); else harden();
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)harden(n)}))).observe(document.documentElement,{childList:true,subtree:true});

  // Settings has an inline handler in the drawer because the legacy delegated menu
  // handler can otherwise intercept it during the refactored navigation flow.
})();
