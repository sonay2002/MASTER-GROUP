/* Master Group — clean finance and analytics controller. */
(() => {
  'use strict';
  const core = () => window.MGAppCore || {};
  const finance = () => window.MGAppFinance || {};
  const byId = id => document.getElementById(id);

  function invoke(fn, ...args) {
    if (typeof fn !== 'function') return false;
    try {
      const result = fn(...args);
      if (result && typeof result.catch === 'function') result.catch(err => console.warn('Master Group action:', err));
      return true;
    } catch (err) {
      console.warn('Master Group action:', err);
      return false;
    }
  }

  function renderAnalytics() {
    const f = finance();
    invoke(f.v59RenderOverview);
    const tab = localStorage.getItem('master_group_analytics_tab_v1') === 'finance' ? 'finance' : 'overview';
    applyTab(tab);
  }

  function openAnalytics() {
    const c = core();
    try { byId('drawerOverlay')?.classList.remove('open'); } catch (_) {}
    if (typeof c.screen === 'function') c.screen('statsScreen');
    else document.querySelectorAll('.screen').forEach(el => { el.hidden = el.id !== 'statsScreen'; });
    renderAnalytics();
  }

  function applyTab(tab) {
    const value = tab === 'finance' ? 'finance' : 'overview';
    localStorage.setItem('master_group_analytics_tab_v1', value);
    document.querySelectorAll('[data-analytics-tab]').forEach(button => {
      const active = button.dataset.analyticsTab === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const overview = byId('analyticsPanelOverview');
    const financePanel = byId('analyticsPanelFinance');
    if (overview) overview.hidden = value !== 'overview';
    if (financePanel) financePanel.hidden = value !== 'finance';
    const f = finance();
    if (value === 'finance') invoke(f.v59RenderFinance);
    else invoke(f.v59RenderOverview);
  }

  function addPayment(id) {
    return invoke(window.__mg70_v59AddPayment, id) || invoke(finance().v59AddPayment, id);
  }

  function editExpenses(id) {
    return invoke(window.__mg70_v59EditExpenses, id) || invoke(finance().v59EditExpenses, id);
  }

  window.__mgDirectAddPayment = addPayment;
  window.__mgDirectEditExpenses = editExpenses;
  window.__mgOpenAnalyticsDirect = openAnalytics;
  window.__mgSetAnalyticsTabDirect = applyTab;

  document.addEventListener('click', event => {
    const target = event.target?.closest?.('[data-add-payment],[data-edit-expenses],[data-analytics-tab],[data-menu-action="stats"],[data-v58="stats"]');
    if (!target) return;

    if (target.matches('[data-add-payment]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addPayment(target.dataset.addPayment);
      return;
    }
    if (target.matches('[data-edit-expenses]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      editExpenses(target.dataset.editExpenses);
      return;
    }
    if (target.matches('[data-analytics-tab]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      applyTab(target.dataset.analyticsTab);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    openAnalytics();
  }, true);
})();
