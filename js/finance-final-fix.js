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
  const overviewState = { period: 'all' };
  const financeFilters = { period: 'all', payment: 'all', query: '' };

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

  function renderOverviewLegacy() {
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

  function renderFinanceLegacy() {
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

  function formatAmount(value) {
    const amount = Number(value);
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
  }

  function parseEstimateDate(value) {
    const raw = String(value || '').trim();
    let match = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
    if (match) {
      let year = Number(match[3]);
      if (year < 100) year += 2000;
      const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function estimateInPeriod(estimate, period, now) {
    if (period === 'all') return true;
    const date = parseEstimateDate(estimate.date);
    if (!date) return false;
    if (period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    if (period === 'year') return date.getFullYear() === now.getFullYear();
    return true;
  }

  function periodLabel(period) {
    if (period === 'month') return 'Этот месяц';
    if (period === 'year') return 'Этот год';
    return 'Все время';
  }

  function countWithRussianNoun(count, one, few, many) {
    const value = Math.abs(Number(count) || 0);
    const lastTwo = value % 100;
    const last = value % 10;
    const noun = lastTwo >= 11 && lastTwo <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
    return value + ' ' + noun;
  }

  function periodOptions(period) {
    return '<option value="all"' + (period === 'all' ? ' selected' : '') + '>Все время</option>' +
      '<option value="month"' + (period === 'month' ? ' selected' : '') + '>Этот месяц</option>' +
      '<option value="year"' + (period === 'year' ? ' selected' : '') + '>Этот год</option>';
  }

  function estimatePaymentState(estimate) {
    const total = Math.max(0, Number(estimate.total) || 0);
    const paid = Math.max(0, Number(estimate.paid) || 0);
    const rawBalance = Number(estimate.balance);
    const balance = Number.isFinite(rawBalance) ? Math.max(0, rawBalance) : Math.max(0, total - paid);
    if (total <= 0) return paid > 0 ? 'Оплачена' : 'Не оплачена';
    if (paid <= 0) return 'Не оплачена';
    return balance > 0.005 ? 'Частично' : 'Оплачена';
  }

  function estimatePaymentClass(state) {
    if (state === 'Оплачена') return 'finance-payment-state-paid';
    if (state === 'Частично') return 'finance-payment-state-partial';
    return 'finance-payment-state-unpaid';
  }

  function overviewMetric(label, value) {
    return '<div class="finance-overview-kpi"><span>' + escapeHtml(label) + '</span><b>' + formatAmount(value) + ' MDL</b></div>';
  }

  function lastSixMonthData(estimatesList, now) {
    const months = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      months.push({
        key,
        label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date).replace(/\.$/, ''),
        title: new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date),
        amount: 0
      });
    }
    const byKey = new Map(months.map(month => [month.key, month]));
    estimatesList.forEach(estimate => {
      const date = parseEstimateDate(estimate.date);
      if (!date) return;
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      const month = byKey.get(key);
      if (month) month.amount += Math.max(0, Number(estimate.total) || 0);
    });
    return months;
  }

  function renderOverview() {
    const panel = $('analyticsPanelOverview');
    if (!panel) return;
    const now = new Date();
    const all = estimates().map(normalize);
    const scoped = all.filter(estimate => estimateInPeriod(estimate, overviewState.period, now));
    const totals = scoped.reduce((sum, estimate) => ({
      estimate: sum.estimate + Math.max(0, Number(estimate.total) || 0),
      paid: sum.paid + Math.max(0, Number(estimate.paid) || 0),
      balance: sum.balance + Math.max(0, Number(estimate.balance) || 0),
      expenses: sum.expenses + Math.max(0, Number(estimate.expenseTotal) || 0)
    }), { estimate: 0, paid: 0, balance: 0, expenses: 0 });

    const months = lastSixMonthData(all, now);
    const maxMonthAmount = Math.max(0, ...months.map(month => month.amount));
    const chartHasData = months.some(month => month.amount > 0);
    const chartBars = months.map(month => {
      const height = maxMonthAmount > 0 ? Math.max(0, Math.round(month.amount / maxMonthAmount * 100)) : 0;
      const accessibleLabel = month.title + ': ' + formatAmount(month.amount) + ' MDL';
      return '<div class="finance-chart-column" title="' + escapeHtml(accessibleLabel) + '" aria-label="' + escapeHtml(accessibleLabel) + '">' +
        '<div class="finance-chart-bar-area"><span class="finance-chart-bar" style="height:' + height + '%"></span></div>' +
        '<span class="finance-chart-month">' + escapeHtml(month.label) + '</span></div>';
    }).join('');

    const statuses = {};
    scoped.forEach(estimate => {
      const status = String(estimate.status || 'Черновик').trim() || 'Черновик';
      statuses[status] = (statuses[status] || 0) + 1;
    });
    const statusOrder = ['В работе', 'Выполнена', 'Черновик', 'Отправлена', 'Отменена'];
    const orderedStatuses = Object.keys(statuses).sort((a, b) => {
      const ai = statusOrder.indexOf(a), bi = statusOrder.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return a.localeCompare(b, 'ru');
    });
    const maxStatusCount = Math.max(1, ...orderedStatuses.map(status => statuses[status]));
    const statusMarkup = orderedStatuses.length ? orderedStatuses.map(status => {
      const count = statuses[status];
      const width = Math.round(count / maxStatusCount * 100);
      return '<div class="finance-status-row"><span>' + escapeHtml(status) + '</span>' +
        '<span class="finance-status-track"><i style="width:' + width + '%"></i></span>' +
        '<b>' + count + '</b></div>';
    }).join('') : '<div class="finance-empty-inline">Пока нет смет.</div>';

    panel.innerHTML = '<section class="card finance-overview-summary">' +
      '<div class="finance-overview-head"><div><h2>Общий обзор</h2><p>Все сметы и результаты</p></div>' +
      '<label class="finance-overview-period"><span class="finance-sr-only">Период по дате сметы</span>' +
      '<select data-overview-period aria-label="Период по дате сметы">' + periodOptions(overviewState.period) + '</select></label></div>' +
      '<p class="finance-overview-caption">Поступления и расходы показаны по сметам, созданным: ' + escapeHtml(periodLabel(overviewState.period)) + '.</p>' +
      '<div class="finance-overview-grid">' +
      overviewMetric('Сумма смет', totals.estimate) +
      overviewMetric('Получено', totals.paid) +
      overviewMetric('Осталось получить', totals.balance) +
      overviewMetric('Расходы', totals.expenses) +
      '</div></section>' +
      '<section class="card finance-overview-chart-card"><div class="finance-card-heading"><div><h2>Новые сметы по месяцам</h2>' +
      '<p>Стоимость смет · MDL · последние 6 месяцев</p></div></div>' +
      (chartHasData ? '<div class="finance-chart-plot" role="img" aria-label="Сумма новых смет по месяцам за последние шесть месяцев">' + chartBars + '</div>' :
        '<div class="finance-chart-empty">За последние 6 месяцев смет не было.</div>') +
      '</section>' +
      '<section class="card finance-overview-status-card"><div class="finance-card-heading"><div><h2>Статусы работ</h2>' +
      '<p>' + countWithRussianNoun(scoped.length, 'смета', 'сметы', 'смет') + ' в выбранном периоде</p></div></div>' +
      '<div class="finance-status-list">' + statusMarkup + '</div></section>' +
      '<div class="finance-legacy-compat" hidden><div class="stats-grid">' +
      '<div class="stats-big"><b id="statCount">0</b><span>Всего смет</span></div>' +
      '<div class="stats-big"><b id="statMonth">0 MDL</b><span>Выручка за месяц</span></div>' +
      '<div class="stats-big"><b id="statProfit">0 MDL</b><span>Чистая прибыль</span></div>' +
      '<div class="stats-big"><b id="statExpenses">0 MDL</b><span>Расходы</span></div></div>' +
      '<div id="monthStats"></div></div>';
  }

  function ensureFinanceControls(target) {
    const section = target.closest('.card');
    const header = section?.querySelector('.settings-section-head');
    if (header) {
      const title = header.querySelector('h2');
      const note = header.querySelector('.muted');
      if (title) title.textContent = 'Сметы и оплаты';
      if (note) note.textContent = 'Раскройте смету, чтобы посмотреть оплаты и расходы.';
    }

    let controls = $('financeControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'financeControls';
      controls.className = 'finance-controls';
      controls.innerHTML = '<div class="finance-filter-row">' +
        '<label class="finance-filter-select"><span class="finance-sr-only">Период смет</span>' +
        '<select data-finance-period aria-label="Период по дате сметы">' + periodOptions(financeFilters.period) + '</select></label>' +
        '<label class="finance-filter-select"><span class="finance-sr-only">Статус оплаты</span>' +
        '<select data-finance-payment-filter aria-label="Фильтр по оплате">' +
        '<option value="all">Оплата: все</option><option value="unpaid">Не оплачено</option>' +
        '<option value="partial">Частично</option><option value="paid">Оплачено</option></select></label></div>' +
        '<label class="finance-search"><span class="finance-search-icon" aria-hidden="true">⌕</span>' +
        '<span class="finance-sr-only">Поиск по клиенту или номеру сметы</span>' +
        '<input type="search" data-finance-search placeholder="Клиент или № сметы" autocomplete="off"></label>' +
        '<p class="finance-filter-note">Период выбирает сметы по дате их создания.</p>';
      if (header) header.insertAdjacentElement('afterend', controls);
      else target.insertAdjacentElement('beforebegin', controls);
    }
    const period = controls.querySelector('[data-finance-period]');
    const payment = controls.querySelector('[data-finance-payment-filter]');
    const search = controls.querySelector('[data-finance-search]');
    if (period) period.value = financeFilters.period;
    if (payment) payment.value = financeFilters.payment;
    if (search && search.value !== financeFilters.query) search.value = financeFilters.query;
  }

  function financeCard(estimate, isOpen) {
    const id = String(estimate.id || '');
    const number = String(estimate.number || 'Смета');
    const client = String(estimate.client || 'Без клиента');
    const estimateDate = String(estimate.date || '');
    const workStatus = String(estimate.status || 'Черновик');
    const total = Math.max(0, Number(estimate.total) || 0);
    const paid = Math.max(0, Number(estimate.paid) || 0);
    const rawBalance = Number(estimate.balance);
    const balance = Number.isFinite(rawBalance) ? Math.max(0, rawBalance) : Math.max(0, total - paid);
    const expenseTotal = Math.max(0, Number(estimate.expenseTotal) || 0);
    const profit = total - expenseTotal;
    const paidPercent = total > 0 ? Math.max(0, Math.min(100, Math.round(paid / total * 100))) : (paid > 0 ? 100 : 0);
    const paymentStatus = estimatePaymentState(estimate);
    const paymentClass = estimatePaymentClass(paymentStatus);
    const expenses = [
      ['Материалы', estimate.expenseMaterial],
      ['Транспорт', estimate.expenseTransport],
      ['Зарплата', estimate.expenseSalary],
      ['Прочее', estimate.expenseOther]
    ].filter(row => Number(row[1]) > 0);
    const expenseMarkup = expenses.length ? expenses.map(row =>
      '<span class="finance-expense-chip">' + escapeHtml(row[0]) + ' <b>' + formatAmount(row[1]) + ' MDL</b></span>'
    ).join('') : '<span class="finance-empty-inline">Расходы не указаны.</span>';
    const payments = Array.isArray(estimate.payments) ? estimate.payments.slice().reverse() : [];
    const paymentMarkup = payments.length ? payments.map(payment => {
      const paymentId = String(payment.id || '');
      const info = [payment.date, payment.method, payment.note].filter(Boolean).join(' · ');
      return '<div class="finance-payment-row"><span>' + escapeHtml(info || 'Оплата') + '</span>' +
        '<b>' + formatAmount(payment.amount) + ' MDL</b>' +
        '<button type="button" class="finance-payment-delete" data-delete-payment="' +
        escapeHtml(id) + ':' + escapeHtml(paymentId) + '" aria-label="Удалить оплату">×</button></div>';
    }).join('') : '<div class="finance-empty-inline">Платежей пока нет.</div>';

    return '<details class="finance-estimate" data-finance-estimate="' + escapeHtml(id) + '"' + (isOpen ? ' open' : '') + '>' +
      '<summary class="finance-estimate-summary"><div class="finance-estimate-title-row"><div class="finance-estimate-title-copy">' +
      '<b>' + escapeHtml(number) + '</b><small>' + escapeHtml(client) + (estimateDate ? ' · ' + escapeHtml(estimateDate) : '') + '</small></div>' +
      '<div class="finance-estimate-badges"><span class="finance-work-status">' + escapeHtml(workStatus) + '</span>' +
      '<span class="finance-payment-state ' + paymentClass + '">' + escapeHtml(paymentStatus) + '</span></div></div>' +
      '<div class="finance-estimate-brief"><span>Сумма <b>' + formatAmount(total) + ' MDL</b></span>' +
      '<span>Остаток <b>' + formatAmount(balance) + ' MDL</b></span><span class="finance-toggle-indicator" aria-hidden="true">⌄</span></div>' +
      '<div class="finance-progress-row"><div class="finance-progress-track" role="progressbar" aria-label="Оплачено по смете" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + paidPercent + '">' +
      '<i style="width:' + paidPercent + '%"></i></div><span>' + paidPercent + '%</span></div></summary>' +
      '<div class="finance-estimate-expanded"><div class="finance-estimate-metrics">' +
      '<div><span>Сумма</span><b>' + formatAmount(total) + ' MDL</b></div>' +
      '<div><span>Получено</span><b>' + formatAmount(paid) + ' MDL</b></div>' +
      '<div><span>Остаток</span><b>' + formatAmount(balance) + ' MDL</b></div>' +
      '<div><span>Расходы</span><b>' + formatAmount(expenseTotal) + ' MDL</b></div>' +
      '<div class="finance-estimate-profit"><span>Прибыль по смете</span><b>' + formatAmount(profit) + ' MDL</b></div></div>' +
      '<div class="finance-detail-block"><h3>Расходы по категориям</h3><div class="finance-expense-chips">' + expenseMarkup + '</div></div>' +
      '<div class="finance-detail-block"><h3>Оплаты</h3><div class="finance-payment-list">' + paymentMarkup + '</div></div>' +
      '<div class="estimate-finance-actions"><button type="button" class="btn primary" data-add-payment="' + escapeHtml(id) + '">＋ Оплата</button>' +
      '<button type="button" class="btn secondary" data-edit-expenses="' + escapeHtml(id) + '">＋ Расходы</button></div></div></details>';
  }

  function renderFinance() {
    const target = $('financeEstimates');
    if (!target) return;
    ensureFinanceControls(target);
    const all = estimates().map(normalize);
    const now = new Date();
    const query = financeFilters.query.trim().toLocaleLowerCase('ru-RU');
    const filtered = all.filter(estimate => {
      if (!estimateInPeriod(estimate, financeFilters.period, now)) return false;
      const paymentState = estimatePaymentState(estimate);
      if (financeFilters.payment === 'unpaid' && paymentState !== 'Не оплачена') return false;
      if (financeFilters.payment === 'partial' && paymentState !== 'Частично') return false;
      if (financeFilters.payment === 'paid' && paymentState !== 'Оплачена') return false;
      if (!query) return true;
      const directions = Array.isArray(estimate.directions) ? estimate.directions.map(direction => direction.name || '').join(' ') : '';
      const text = [estimate.number, estimate.client, estimate.object, estimate.address, estimate.phone, estimate.status, directions]
        .filter(Boolean).join(' ').toLocaleLowerCase('ru-RU');
      return text.includes(query);
    });

    const totals = filtered.reduce((sum, estimate) => ({
      paid: sum.paid + Math.max(0, Number(estimate.paid) || 0),
      balance: sum.balance + Math.max(0, Number(estimate.balance) || 0),
      expenses: sum.expenses + Math.max(0, Number(estimate.expenseTotal) || 0),
      profit: sum.profit + (Math.max(0, Number(estimate.total) || 0) - Math.max(0, Number(estimate.expenseTotal) || 0))
    }), { paid: 0, balance: 0, expenses: 0, profit: 0 });
    const overview = $('financeOverview');
    if (overview) {
      overview.innerHTML = '<section class="card"><div class="finance-kpis">' +
        '<div class="finance-kpi"><span>Получено</span><b>' + formatAmount(totals.paid) + ' MDL</b></div>' +
        '<div class="finance-kpi"><span>К оплате</span><b>' + formatAmount(totals.balance) + ' MDL</b></div>' +
        '<div class="finance-kpi"><span>Расходы</span><b>' + formatAmount(totals.expenses) + ' MDL</b></div>' +
        '<div class="finance-kpi profit"><span>Прибыль по сметам</span><b>' + formatAmount(totals.profit) + ' MDL</b></div>' +
        '</div><p class="finance-summary-caption">Показатели по выбранным сметам: ' + filtered.length +
        '. Прибыль рассчитана как сумма смет минус записанные расходы.</p></section>';
    }

    const openIds = new Set(Array.from(target.querySelectorAll('details[data-finance-estimate][open]'))
      .map(card => card.dataset.financeEstimate));
    const hadCards = !!target.querySelector('details[data-finance-estimate]');
    if (!filtered.length) {
      target.innerHTML = '<div class="finance-empty-state"><b>' + (all.length ? 'Нет совпадающих смет' : 'Смет пока нет') +
        '</b><span>' + (all.length ? 'Измените период, оплату или поисковый запрос.' : 'Сохранённые сметы появятся здесь.') + '</span></div>';
      return;
    }
    target.innerHTML = filtered.map((estimate, index) =>
      financeCard(estimate, openIds.has(String(estimate.id || '')) || (!hadCards && index === 0))
    ).join('');
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
  const financeApi = window.MGAppFinance || {};
  financeApi.v59RenderOverview = renderOverview;
  financeApi.v59RenderFinance = renderFinance;
  financeApi.v59ShowStats = openAnalytics;
  financeApi.v59SetAnalyticsTab = setTab;
  window.MGAppFinance = financeApi;

  document.addEventListener('change', event => {
    const target = event.target;
    if (target?.matches?.('[data-overview-period]')) {
      overviewState.period = ['all', 'month', 'year'].includes(target.value) ? target.value : 'all';
      renderOverview();
      return;
    }
    if (target?.matches?.('[data-finance-period]')) {
      financeFilters.period = ['all', 'month', 'year'].includes(target.value) ? target.value : 'all';
      renderFinance();
      return;
    }
    if (target?.matches?.('[data-finance-payment-filter]')) {
      financeFilters.payment = ['all', 'unpaid', 'partial', 'paid'].includes(target.value) ? target.value : 'all';
      renderFinance();
    }
  });

  document.addEventListener('input', event => {
    const target = event.target;
    if (!target?.matches?.('[data-finance-search]')) return;
    financeFilters.query = target.value;
    renderFinance();
  });

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
