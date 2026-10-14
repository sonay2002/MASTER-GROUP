/* Master Group v471 — desktop «Главный экран» (variant A).
   Только от 1100px. Читает данные из хранилища, ничего не записывает.
   Навигация идёт через существующие кнопки меню. */
(() => {
  'use strict';
  const mq = window.matchMedia('(min-width:1100px) and (min-height:600px)');
  const STATUS_CLASS = { 'Черновик': 'draft', 'Отправлена': 'sent', 'В работе': 'work', 'Выполнена': 'done', 'Отменена': 'canceled' };
  let host = null, lastHtml = '', raf = 0;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => Math.max(0, Number(v) || 0);
  const money = v => Math.round(num(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0MDL';
  const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; return (m > 10 && m < 20) ? c : d === 1 ? a : (d >= 2 && d <= 4) ? b : c; };

  function estimates() {
    try {
      const list = (window.MGStorage && window.MGStorage.saved && window.MGStorage.saved()) || [];
      const norm = window.MGDataModel && window.MGDataModel.normalizeEstimate;
      return list.map(e => (norm ? norm(e) : e));
    } catch (_) { return []; }
  }

  function payPill(e) {
    if (num(e.paid) >= num(e.total) && num(e.total) > 0) return '<span class="mg-hd-pill mg-hd-pay-paid">Оплачено</span>';
    if (num(e.paid) > 0) return '<span class="mg-hd-pill mg-hd-pay-part">Частично оплачено</span>';
    return '<span class="mg-hd-pill mg-hd-pay-none">Не оплачено</span>';
  }

  function build() {
    const list = estimates();
    const head = '<div class="mg-hd-heading"><h1>Главный экран</h1><p>Все сметы и результаты за всё время</p></div>';
    if (!list.length) {
      return head + '<section class="mg-hd-card mg-hd-empty"><b>Смет пока нет</b><span>Создайте первую смету, и здесь появятся суммы, оплаты и последние документы.</span>' +
        '<button type="button" class="mg-hd-btn mg-hd-btn-primary" data-hd-go="new">Создать смету</button></section>';
    }
    const total = list.reduce((s, e) => s + num(e.total), 0);
    const paid = list.reduce((s, e) => s + num(e.paid), 0);
    const left = list.reduce((s, e) => s + num(e.balance), 0);
    const exp = list.reduce((s, e) => s + num(e.expenseTotal), 0);
    const owing = list.filter(e => num(e.balance) > 0).length;
    const withExp = list.filter(e => num(e.expenseTotal) > 0).length;
    const pct = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;
    const kpis = [
      ['Сумма смет', money(total), list.length + ' ' + plural(list.length, 'смета', 'сметы', 'смет')],
      ['Получено', money(paid), pct + '% от суммы смет'],
      ['Осталось получить', money(left), owing ? 'по ' + owing + ' ' + plural(owing, 'смете', 'сметам', 'сметам') : 'всё оплачено'],
      ['Расходы', money(exp), withExp ? 'по ' + withExp + ' ' + plural(withExp, 'смете', 'сметам', 'сметам') : 'расходы не внесены']
    ].map(k => '<div class="mg-hd-kpi"><span>' + k[0] + '</span><b>' + esc(k[1]) + '</b><small>' + esc(k[2]) + '</small></div>').join('');
    const rows = list.slice(0, 4).map(e => {
      const st = STATUS_CLASS[e.status] ? e.status : 'Черновик';
      return '<button type="button" class="mg-hd-row" data-hd-open="' + esc(e.id) + '"><span class="mg-hd-badge" aria-hidden="true">MG</span>' +
        '<span class="mg-hd-row-main"><b>' + esc(e.number) + ' · ' + esc(e.client || 'Без клиента') + '</b><small>' + esc(e.date) + '</small></span>' +
        '<span class="mg-hd-pill mg-hd-st-' + STATUS_CLASS[st] + '">' + esc(st) + '</span>' + payPill(e) +
        '<span class="mg-hd-row-sum">' + esc(money(e.total)) + '</span></button>';
    }).join('');
    const recent = '<section class="mg-hd-card mg-hd-recent"><div class="mg-hd-card-head"><h2>Последние сметы</h2><button type="button" class="mg-hd-btn" data-hd-go="estimates">Все сметы</button></div>' + rows + '</section>';
    const pay = '<section class="mg-hd-pay"><h2>Оплата</h2><div><span>Осталось получить</span><b>' + esc(money(left)) + '</b></div>' +
      '<div class="mg-hd-bar" role="img" aria-label="Получено ' + pct + '%"><i style="width:' + pct + '%"></i></div><div class="mg-hd-pay-foot"><span>Получено ' + esc(money(paid)) + '</span><span>' + pct + '%</span></div></section>';
    const quick = '<section class="mg-hd-card"><div class="mg-hd-card-head"><h2>Быстрые действия</h2></div><div class="mg-hd-quick">' +
      '<button type="button" class="mg-hd-btn mg-hd-btn-primary" data-hd-go="new">Новая смета</button>' +
      '<button type="button" class="mg-hd-btn" data-hd-go="estimates">Все сметы</button>' +
      '<button type="button" class="mg-hd-btn" data-hd-go="stats">Финансы</button></div></section>';
    return head + '<div class="mg-hd-kpis">' + kpis + '</div><div class="mg-hd-grid">' + recent + '<div class="mg-hd-side">' + pay + quick + '</div></div>';
  }

  function deactivate() {
    const d = document.getElementById('dashboard');
    if (d && d.hasAttribute('data-mg-hd')) d.removeAttribute('data-mg-hd');
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null; lastHtml = '';
  }

  function render() {
    raf = 0;
    const d = document.getElementById('dashboard');
    if (!d || d.hidden || !mq.matches) { if (host || (d && d.hasAttribute('data-mg-hd'))) deactivate(); return; }
    if (!d.hasAttribute('data-mg-hd')) d.setAttribute('data-mg-hd', '1');
    if (!host || !host.isConnected) {
      host = document.createElement('div');
      host.className = 'mg-hd';
      d.insertBefore(host, d.firstChild);
      lastHtml = '';
    }
    const html = build();
    if (html !== lastHtml) { host.innerHTML = html; lastHtml = html; }
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  document.addEventListener('click', ev => {
    const el = ev.target.closest && ev.target.closest('.mg-hd [data-hd-go], .mg-hd [data-hd-open]');
    if (!el) return;
    const open = el.getAttribute('data-hd-open');
    if (open) {
      if (window.MGDesktopMD && window.MGDesktopMD.select) window.MGDesktopMD.select(open);
      const m = document.querySelector('[data-menu-action="estimates"]'); if (m) m.click();
      return;
    }
    const go = el.getAttribute('data-hd-go');
    const target = document.querySelector('[data-menu-action="' + go + '"]');
    if (target) target.click();
  });

  function start() {
    const d = document.getElementById('dashboard');
    if (!d) return;
    new MutationObserver(schedule).observe(d, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    if (mq.addEventListener) mq.addEventListener('change', schedule); else if (mq.addListener) mq.addListener(schedule);
    window.addEventListener('storage', schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
