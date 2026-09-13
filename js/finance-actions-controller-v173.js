/* Master Group v174 — unified analytics and estimate finance controller. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const finance = () => window.MGAppFinance || {};

  function safeCall(fn, ...args) {
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

  function openAnalytics() {
    document.querySelectorAll('.screen').forEach(screen => { screen.hidden = screen.id !== 'statsScreen'; });
    if (window.MGState) window.MGState.screen = 'statsScreen';
    const f = finance();
    safeCall(f.v59RenderOverview);
    const tab = localStorage.getItem('master_group_analytics_tab_v1') === 'finance' ? 'finance' : 'overview';
    setAnalyticsTab(tab);
  }

  function setAnalyticsTab(tab) {
    const value = tab === 'finance' ? 'finance' : 'overview';
    localStorage.setItem('master_group_analytics_tab_v1', value);
    document.querySelectorAll('[data-analytics-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.analyticsTab === value);
      button.setAttribute('aria-selected', button.dataset.analyticsTab === value ? 'true' : 'false');
    });
    const overview = $('analyticsPanelOverview');
    const finances = $('analyticsPanelFinance');
    if (overview) overview.hidden = value !== 'overview';
    if (finances) finances.hidden = value !== 'finance';
    const f = finance();
    if (value === 'finance') safeCall(f.v59RenderFinance);
    else safeCall(f.v59RenderOverview);
  }

  function addPayment(id) {
    return safeCall(window.__mg70_v59AddPayment, id) || safeCall(finance().v59AddPayment, id);
  }

  function editExpenses(id) {
    return safeCall(window.__mg70_v59EditExpenses, id) || safeCall(finance().v59EditExpenses, id);
  }

  // These aliases are also used by the inline handlers in dynamically rendered cards.
  window.__mgDirectAddPayment = addPayment;
  window.__mgDirectEditExpenses = editExpenses;

  document.addEventListener('click', event => {
    const tab = event.target.closest?.('[data-analytics-tab]');
    if (tab) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setAnalyticsTab(tab.dataset.analyticsTab);
      return;
    }

    const add = event.target.closest?.('[data-add-payment]');
    if (add) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addPayment(add.dataset.addPayment);
      return;
    }

    const expenses = event.target.closest?.('[data-edit-expenses]');
    if (expenses) {
      event.preventDefault();
      event.stopImmediatePropagation();
      editExpenses(expenses.dataset.editExpenses);
      return;
    }

    const nav = event.target.closest?.('[data-menu-action="stats"], [data-v58="stats"]');
    if (nav) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAnalytics();
    }
  }, true);

  window.__mgOpenAnalyticsDirect = openAnalytics;
  window.__mgSetAnalyticsTabDirect = setAnalyticsTab;
})();
