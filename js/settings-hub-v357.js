/* Master Group v358 — Settings hub: open all settings first, then enter a section. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const titles={catalog:'Каталог',company:'Компания',trash:'Корзина',updates:'Обновления',estimates:'Сметы'};
  const tabs=()=>document.querySelector('.settings-tabs-v2');
  const hero=()=>document.querySelector('.settings-hero-v2');
  const hub=()=>$('settingsHub');
  const nav=()=>$('settingsSectionNav');
  const panels={catalog:'settingsPanelCatalog',company:'settingsPanelCompany',trash:'settingsPanelTrash',updates:'settingsPanelUpdates',estimates:'settingsPanelEstimates'};
  function hidePanels(){Object.values(panels).forEach(id=>{const el=$(id);if(el)el.hidden=true;});}
  function placeBackButton(){
    const back=document.querySelector('[data-settings-back]');
    const topbar=document.querySelector('#settingsScreen .settings-topbar');
    if(back&&topbar&&back.parentElement!==topbar){
      topbar.appendChild(back);
    }
    return back;
  }
  function showHub(){
    const back=placeBackButton();
    if(back){ back.hidden=true; back.style.setProperty('display','none','important'); }
    if(hub()) hub().hidden=false;
    if(nav()) nav().hidden=true;
    if(hero()) hero().hidden=true;
    if(tabs()) tabs().hidden=true;
    hidePanels();
    window.scrollTo(0,0);
  }
  function showSection(tab){
    if(!titles[tab])tab='catalog';
    const back=placeBackButton();
    if(back){ back.hidden=false; back.style.setProperty('display','grid','important'); }
    if(hub())hub().hidden=true;
    if(nav())nav().hidden=false;
    if(hero())hero().hidden=true;
    if(tabs())tabs().hidden=true;
    hidePanels();
    const panel=$(panels[tab]); if(panel)panel.hidden=false;
    const title=$('settingsSectionTitle');if(title)title.textContent=titles[tab];
    localStorage.setItem('master_group_settings_tab_v1',tab);
    document.querySelectorAll('[data-settings-tab]').forEach(b=>{
      const active=b.dataset.settingsTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false');
    });
    if(tab==='company')window.v58RenderCompany?.();
    if(tab==='trash')window.__mgRenderTrash?.();
    window.scrollTo(0,0);
  }
  function bind(){
    document.addEventListener('click',e=>{
      const card=e.target.closest?.('[data-settings-hub]');
      if(card){e.preventDefault();e.stopPropagation();showSection(card.dataset.settingsHub);return;}
      if(e.target.closest?.('[data-settings-back]')){e.preventDefault();e.stopPropagation();showHub();return;}
    },true);
    window.__mgSettingsShowHub=showHub;
    window.__mgSettingsShowSection=showSection;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
