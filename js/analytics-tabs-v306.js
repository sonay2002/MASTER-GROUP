/* Master Group v306 — guarantee the Overview / Finance buttons are present and visible. */
(() => {
  'use strict';
  function ensureTabs(){
    const screen = document.getElementById('statsScreen');
    if(!screen) return;
    let tabs = screen.querySelector('.analytics-tabs-v3');
    if(!tabs){
      tabs = document.createElement('section');
      tabs.className='analytics-tabs analytics-tabs-v3';
      tabs.setAttribute('role','tablist');
      tabs.setAttribute('aria-label','Разделы финансов и обзора');
      tabs.innerHTML = `
        <button type="button" class="analytics-tab analytics-tab-v3 active" data-analytics-tab="overview" aria-selected="true">
          <span class="analytics-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V10"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3.5 19.5h17"/></svg></span>
          <span class="analytics-tab-copy"><b>Обзор</b></span>
        </button>
        <button type="button" class="analytics-tab analytics-tab-v3" data-analytics-tab="finance" aria-selected="false">
          <span class="analytics-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17"/><path d="M15.5 14.5h2.5"/></svg></span>
          <span class="analytics-tab-copy"><b>Финансы</b></span>
        </button>`;
      const panel = screen.querySelector('#analyticsPanelOverview');
      screen.insertBefore(tabs, panel || screen.firstChild);
    }
    const panel = screen.querySelector('#analyticsPanelOverview');
    if(panel && tabs.parentElement === screen && tabs.nextElementSibling !== panel){ screen.insertBefore(tabs, panel); }
    tabs.hidden = false;
    tabs.removeAttribute('hidden');
    tabs.style.display='grid';
    tabs.style.visibility='visible';
    tabs.style.opacity='1';
    tabs.style.position='relative';
    tabs.style.zIndex='20';
    tabs.style.visibility='visible';
    tabs.style.opacity='1';
    tabs.querySelectorAll('.analytics-tab-v3').forEach(btn=>{
      btn.hidden=false; btn.style.display='flex'; btn.style.visibility='visible'; btn.style.opacity='1';
    });
  }
  document.addEventListener('click', e=>{
    if(e.target.closest?.('[data-menu-action="stats"],[data-v58="stats"],[data-analytics-tab]')){
      setTimeout(ensureTabs,0);
      setTimeout(ensureTabs,100);
    }
  }, true);
  document.addEventListener('DOMContentLoaded', ensureTabs);
  setTimeout(ensureTabs, 200);
  setTimeout(ensureTabs, 1000);
})();
