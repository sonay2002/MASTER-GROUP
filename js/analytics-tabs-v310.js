/* Master Group v310 — replace legacy analytics controls with exactly two clean tabs. */
(() => {
  'use strict';
  const markup = `
    <button type="button" class="analytics-tab analytics-tab-v3 active" data-analytics-tab="overview" aria-selected="true">
      <span class="analytics-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V10"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3.5 19.5h17"/></svg></span>
      <span class="analytics-tab-copy"><b>Обзор</b></span>
    </button>
    <button type="button" class="analytics-tab analytics-tab-v3" data-analytics-tab="finance" aria-selected="false">
      <span class="analytics-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17"/><path d="M15.5 14.5h2.5"/></svg></span>
      <span class="analytics-tab-copy"><b>Финансы</b></span>
    </button>`;

  function ensureTabs(){
    const screen = document.getElementById('statsScreen');
    if(!screen) return;

    // Remove every legacy/duplicate analytics switcher.
    screen.querySelectorAll('.analytics-tabs').forEach(el => el.remove());

    const tabs = document.createElement('section');
    tabs.className = 'analytics-tabs analytics-tabs-v3';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Разделы финансов и обзора');
    tabs.innerHTML = markup;

    const panel = screen.querySelector('#analyticsPanelOverview');
    screen.insertBefore(tabs, panel || screen.firstChild);
  }

  function restoreSelected(){
    const value = localStorage.getItem('mg_analytics_tab') || localStorage.getItem('v59_analytics_tab') || 'overview';
    document.querySelectorAll('[data-analytics-tab]').forEach(btn => {
      const active = btn.dataset.analyticsTab === value;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  document.addEventListener('DOMContentLoaded', () => { ensureTabs(); setTimeout(restoreSelected, 50); });
  document.addEventListener('click', e => {
    if(e.target.closest?.('[data-menu-action="stats"],[data-v58="stats"]')) setTimeout(() => { ensureTabs(); restoreSelected(); }, 30);
  }, true);
  setTimeout(() => { ensureTabs(); restoreSelected(); }, 250);
})();
