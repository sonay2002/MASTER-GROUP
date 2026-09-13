/* Master Group v176 — single finance/analytics interaction layer.
 * Replaces the stack of competing finance click controllers.
 * Uses the same local storage source as the estimates screen and recalculates
 * all finance figures from normalized estimate data.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const core = () => window.MGAppCore || {};
  const storage = () => window.MGStorage || {};
  const finance = () => window.MGFinance || {};
  const toast = message => { try { window.__mgToast?.(message); } catch (_) {} };
  const num = value => Math.max(0, Number(value) || 0);
  const money = value => num(value).toFixed(2);

  function estimates() {
    try {
      const list = typeof storage().saved === 'function' ? storage().saved() : [];
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  function normalize(e) {
    try {
      if (typeof finance().normalize === 'function') return finance().normalize(JSON.parse(JSON.stringify(e || {})));
      if (typeof window.MGCalculations?.normalizeEstimate === 'function') return window.MGCalculations.normalizeEstimate(JSON.parse(JSON.stringify(e || {})));
    } catch (err) { console.warn('MG finance normalize:', err); }
    return e || {};
  }

  function saveEstimate(id, patch) {
    const list = estimates();
    const index = list.findIndex(e => String(e.id) === String(id));
    if (index < 0) throw new Error('Смета не найдена');
    const before = JSON.parse(JSON.stringify(list[index]));
    const updated = normalize(Object.assign(normalize(list[index]), patch || {}));
    list[index] = updated;
    if (typeof storage().persist !== 'function' || storage().persist(list) === false) {
      throw new Error('Не удалось сохранить данные');
    }
    if (core().state?.estimate && String(core().state.estimate.id) === String(id)) core().state.estimate = updated;
    try { window.recordEstimateNotifications?.(before, updated); } catch (_) {}
    try { window.__mgCloudSaveEstimate?.(updated); } catch (_) {}
    return updated;
  }

  function refreshEstimates() {
    try { core().renderEstimates?.(); } catch (_) {}
    try { window.MGAppFinance?.v58RenderEstimates?.(); } catch (_) {}
    try { window.MGAppFinance?.v59RenderFinance?.(); } catch (_) {}
    try { window.MGAppFinance?.v59RenderOverview?.(); } catch (_) {}
  }

  function openScreen(id) {
    document.querySelectorAll('.screen').forEach(el => { el.hidden = el.id !== id; });
    if (window.MGState) window.MGState.screen = id;
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  function renderOverview() {
    const list = estimates().map(normalize);
    const revenue = list.reduce((s, e) => s + num(e.total), 0);
    const expenses = list.reduce((s, e) => s + num(e.expenseTotal), 0);
    const profit = revenue - expenses;
    const now = new Date();
    const monthRevenue = list.filter(e => {
      const d = String(e.date || '').split('.');
      return d.length === 3 && Number(d[1]) - 1 === now.getMonth() && Number(d[2]) === now.getFullYear();
    }).reduce((s, e) => s + num(e.total), 0);

    if ($('statCount')) $('statCount').textContent = String(list.length);
    if ($('statMonth')) $('statMonth').textContent = money(monthRevenue) + ' MDL';
    if ($('statProfit')) $('statProfit').textContent = money(profit) + ' MDL';
    if ($('statExpenses')) $('statExpenses').textContent = money(expenses) + ' MDL';

    const months = {};
    list.forEach(e => {
      const d = String(e.date || '').split('.');
      if (d.length !== 3) return;
      const month = Number(d[1]), year = Number(d[2]);
      if (!month || !year) return;
      const key = String(month).padStart(2, '0') + '.' + year;
      months[key] = (months[key] || 0) + num(e.total);
    });
    const keys = Object.keys(months).sort((a, b) => {
      const [am, ay] = a.split('.').map(Number), [bm, by] = b.split('.').map(Number);
      return new Date(by, bm - 1) - new Date(ay, am - 1);
    }).slice(0, 6);
    if ($('monthStats')) $('monthStats').innerHTML = keys.length
      ? keys.map(k => `<div class="month-row"><b>${k}</b><span>${money(months[k])} MDL</span></div>`).join('')
      : '<div class="empty">Пока нет сохранённых смет.</div>';
  }

  function renderFinance() {
    const list = estimates().map(normalize);
    const paid = list.reduce((s, e) => s + num(e.paid), 0);
    const balance = list.reduce((s, e) => s + num(e.balance), 0);
    const expenses = list.reduce((s, e) => s + num(e.expenseTotal), 0);
    const profit = list.reduce((s, e) => s + num(e.total) - num(e.expenseTotal), 0);

    const overview = $('financeOverview');
    if (overview) overview.innerHTML = `<section class="card"><div class="finance-kpis">
      <div class="finance-kpi"><span>Получено</span><b>${money(paid)} MDL</b></div>
      <div class="finance-kpi"><span>Ожидается</span><b>${money(balance)} MDL</b></div>
      <div class="finance-kpi"><span>Расходы</span><b>${money(expenses)} MDL</b></div>
      <div class="finance-kpi profit"><span>Чистая прибыль</span><b>${money(profit)} MDL</b></div>
    </div></section>`;

    const target = $('financeEstimates');
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<div class="empty">Смет пока нет.</div>';
      return;
    }
    target.innerHTML = list.map(e => {
      const pays = Array.isArray(e.payments) ? e.payments : [];
      return `<article class="finance-estimate">
        <div class="finance-estimate-head"><div><b>${escapeHtml(e.number || 'Смета')}</b><div class="muted" style="margin-top:4px">${escapeHtml(e.client || 'Без клиента')} · ${escapeHtml(e.date || '')}</div></div><span class="status-pill">${escapeHtml(e.status || 'Черновик')}</span></div>
        <div class="finance-lines">
          <div class="finance-line"><span>Смета</span><b>${money(e.total)} MDL</b></div>
          <div class="finance-line"><span>Получено</span><b>${money(e.paid)} MDL</b></div>
          <div class="finance-line"><span>Остаток</span><b>${money(e.balance)} MDL</b></div>
          <div class="finance-line"><span>Расходы</span><b>${money(e.expenseTotal)} MDL</b></div>
          <div class="finance-line"><span>Прибыль</span><b>${money(e.profit)} MDL</b></div>
          <div class="finance-line"><span>Материалы</span><b>${money(e.expenseMaterial)} MDL</b></div>
          <div class="finance-line"><span>Транспорт</span><b>${money(e.expenseTransport)} MDL</b></div>
          <div class="finance-line"><span>Зарплата</span><b>${money(e.expenseSalary)} MDL</b></div>
        </div>
        <div class="payment-list">${pays.length ? pays.map(p => `<div class="payment-row"><span>${escapeHtml(p.date || '')} · ${escapeHtml(p.method || '')}${p.note ? ' · ' + escapeHtml(p.note) : ''}</span><b>${money(p.amount)} MDL <button type="button" class="settings-small-btn danger" data-delete-payment="${escapeHtml(String(e.id))}:${escapeHtml(String(p.id))}" aria-label="Удалить оплату">×</button></b></div>`).join('') : '<div class="muted" style="margin-top:10px">Платежей пока нет.</div>'}</div>
        <div class="estimate-finance-actions">
          <button type="button" class="btn primary" data-add-payment="${escapeHtml(String(e.id))}">＋ Оплата</button>
          <button type="button" class="btn secondary" data-edit-expenses="${escapeHtml(String(e.id))}">Расходы</button>
        </div>
      </article>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[ch]));
  }

  function setTab(tab) {
    const value = tab === 'finance' ? 'finance' : 'overview';
    try { localStorage.setItem('master_group_analytics_tab_v1', value); } catch (_) {}
    document.querySelectorAll('[data-analytics-tab]').forEach(button => {
      const active = button.dataset.analyticsTab === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if ($('analyticsPanelOverview')) $('analyticsPanelOverview').hidden = value !== 'overview';
    if ($('analyticsPanelFinance')) $('analyticsPanelFinance').hidden = value !== 'finance';
    renderOverview();
    if (value === 'finance') renderFinance();
  }

  function openAnalytics() {
    // Close the side menu before switching to Analytics, matching the behavior
    // of the other navigation items.
    const drawer = $('drawerOverlay');
    if (drawer) drawer.classList.remove('open');
    openScreen('statsScreen');
    renderOverview();
    let tab = 'overview';
    try { tab = localStorage.getItem('master_group_analytics_tab_v1') || 'overview'; } catch (_) {}
    setTab(tab);
  }

  function openEstimates() {
    // The dashboard quick card must behave like the drawer's «Сметы» item:
    // switch to the estimates list, reset the scroll position and render the
    // current list before showing the screen. Do not route through the editor
    // or through archive confirmation because this action starts on dashboard.
    const drawer = $('drawerOverlay');
    if (drawer) drawer.classList.remove('open');
    try {
      const show = core().showEstimates || window.MGAppFinance?.showEstimates;
      if (typeof show === 'function') {
        show();
        return;
      }
    } catch (err) { console.warn('MG estimates navigation:', err); }
    try {
      core().renderEstimates?.();
    } catch (_) {}
    openScreen('estimatesScreen');
  }

  async function addPayment(id) {
    const e = estimates().find(x => String(x.id) === String(id));
    if (!e) return toast('Смета не найдена');
    try {
      const n = normalize(e);
      const modal = window.MG71 || window.MG70;
      if (!modal?.payment) throw new Error('Окно оплаты недоступно');
      const data = await modal.payment(num(n.balance));
      if (!data) return;
      const current = normalize(estimates().find(x => String(x.id) === String(id)) || e);
      const payments = Array.isArray(current.payments) ? current.payments.slice() : [];
      payments.push({ id: window.MGAppCore?.uid?.() || crypto.randomUUID(), amount: num(data.amount), date: new Date().toLocaleDateString('ru-RU'), method: data.method || 'другое', note: data.note || '' });
      const saved = saveEstimate(id, { payments });
      if (!saved) throw new Error('Не удалось сохранить оплату');
      // Render the Finance tab from the freshly saved local data immediately.
      // Do not wait for navigation, a reload, Firebase, or another renderer.
      renderFinance();
      renderOverview();
      refreshEstimates();
      requestAnimationFrame(() => { renderFinance(); renderOverview(); });
      toast('Оплата добавлена');
    } catch (err) {
      console.error('MG add payment:', err);
      toast(err?.message || 'Не удалось добавить оплату');
    }
  }

  async function deletePayment(id, pid) {
    const e = estimates().find(x => String(x.id) === String(id));
    if (!e) return toast('Смета не найдена');
    try {
      const modal = window.MG71 || window.MG70;
      let confirmed = true;
      if (modal?.confirm) confirmed = await modal.confirm('Удалить оплату?', 'Это удалит выбранную запись об оплате.', 'Удалить', 'Отмена');
      if (!confirmed) return;
      const current = normalize(estimates().find(x => String(x.id) === String(id)) || e);
      const updated = finance().deletePayment ? finance().deletePayment(current, pid) : normalize({ ...current, payments: (current.payments || []).filter(p => String(p.id) !== String(pid)) });
      const saved = saveEstimate(id, { payments: updated.payments || [] });
      if (!saved) throw new Error('Не удалось сохранить оплату');
      renderFinance();
      renderOverview();
      refreshEstimates();
      requestAnimationFrame(() => { renderFinance(); renderOverview(); });
      toast('Оплата удалена');
    } catch (err) {
      console.error('MG delete payment:', err);
      toast(err?.message || 'Не удалось удалить оплату');
    }
  }

  async function editExpenses(id) {
    const e = estimates().find(x => String(x.id) === String(id));
    if (!e) return toast('Смета не найдена');
    try {
      const n = normalize(e);
      const modal = window.MG71 || window.MG70;
      if (!modal?.expenses) throw new Error('Окно расходов недоступно');
      const data = await modal.expenses({ material:num(n.expenseMaterial), transport:num(n.expenseTransport), salary:num(n.expenseSalary), other:num(n.expenseOther) });
      if (!data) return;
      const saved = saveEstimate(id, { expenseMaterial:num(data.material), expenseTransport:num(data.transport), expenseSalary:num(data.salary), expenseOther:num(data.other) });
      if (!saved) throw new Error('Не удалось сохранить расходы');
      renderFinance();
      renderOverview();
      refreshEstimates();
      requestAnimationFrame(() => { renderFinance(); renderOverview(); });
      toast('Расходы сохранены');
    } catch (err) {
      console.error('MG edit expenses:', err);
      toast(err?.message || 'Не удалось сохранить расходы');
    }
  }

  window.__mgDirectAddPayment = addPayment;
  window.__mgDirectEditExpenses = editExpenses;
  window.__mgOpenAnalyticsDirect = openAnalytics;
  window.__mgOpenEstimatesDirect = openEstimates;
  window.__mgSetAnalyticsTabDirect = setTab;

  window.addEventListener('mg:finance-updated', () => {
    try { renderFinance(); renderOverview(); } catch (_) {}
    requestAnimationFrame(() => { try { renderFinance(); renderOverview(); } catch (_) {} });
  });

  // One capture-phase listener for the critical controls. Older finance handlers
  // are deliberately prevented from running, avoiding duplicate/conflicting actions.
  document.addEventListener('click', event => {
    const target = event.target?.closest?.('[data-add-payment],[data-delete-payment],[data-edit-expenses],[data-analytics-tab],[data-menu-action="stats"],[data-v58="stats"],[data-nav="estimates"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.matches('[data-add-payment]')) return void addPayment(target.dataset.addPayment);
    if (target.matches('[data-delete-payment]')) {
      const raw = String(target.dataset.deletePayment || '');
      const splitAt = raw.indexOf(':');
      const id = splitAt >= 0 ? raw.slice(0, splitAt) : raw;
      const pid = splitAt >= 0 ? raw.slice(splitAt + 1) : '';
      return void deletePayment(id, pid);
    }
    if (target.matches('[data-edit-expenses]')) return void editExpenses(target.dataset.editExpenses);
    if (target.matches('[data-analytics-tab]')) return void setTab(target.dataset.analyticsTab);
    if (target.matches('[data-nav="estimates"]')) return void openEstimates();
    openAnalytics();
  }, true);

  // Initial refresh after all scripts are loaded. The timeout also handles pages
  // restored from Safari's back-forward cache.
  const init = () => { renderOverview(); if ($('analyticsPanelFinance') && !$('analyticsPanelFinance').hidden) renderFinance(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else setTimeout(init, 0);
  window.addEventListener('pageshow', init);
})();
