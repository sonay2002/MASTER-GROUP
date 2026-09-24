/* Master Group v307 — ensure Overview / Finance tabs exist without covering the fixed header. */
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
    tabs.hidden = false;
    tabs.removeAttribute('hidden');
  }
  document.addEventListener('DOMContentLoaded', ensureTabs);
  document.addEventListener('click', e => {
    if(e.target.closest?.('[data-menu-action="stats"],[data-v58="stats"]')) setTimeout(ensureTabs, 0);
  }, true);
  setTimeout(ensureTabs, 200);
})();
