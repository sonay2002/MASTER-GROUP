/* Master Group v470 — desktop master/detail for «Все сметы» (variant A).
   Только для экранов от 1100px. Не меняет данные: детали читаются из хранилища,
   а кнопки используют те же data-атрибуты, что и существующий список смет. */
(() => {
  'use strict';
  const mq = window.matchMedia('(min-width:1100px) and (min-height:600px)');
  const STATUS = ['Черновик', 'Отправлена', 'В работе', 'Выполнена', 'Отменена'];
  const STATUS_CLASS = { 'Черновик': 'draft', 'Отправлена': 'sent', 'В работе': 'work', 'Выполнена': 'done', 'Отменена': 'canceled' };
  let selected = null;
  let pane = null;
  let raf = 0;
  let lastHtml = '';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => Math.max(0, Number(v) || 0);
  const money = v => Math.round(num(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0MDL';

  function loadEstimate(id) {
    try {
      const list = (window.MGStorage && window.MGStorage.saved && window.MGStorage.saved()) || [];
      const raw = list.find(e => String(e && e.id) === String(id));
      if (!raw) return null;
      return window.MGDataModel && window.MGDataModel.normalizeEstimate ? window.MGDataModel.normalizeEstimate(raw) : raw;
    } catch (_) { return null; }
  }

  function detailHtml(e) {
    if (!e) return '<div class="mg-md-empty"><b>Выберите смету</b><span>Подробности появятся здесь.</span></div>';
    const status = STATUS.includes(e.status) ? e.status : 'Черновик';
    const id = esc(e.id);
    const options = STATUS.map(s => '<option value="' + esc(s) + '"' + (s === status ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
    const facts = [['Клиент', e.client || '—'], ['Телефон', e.phone || '—'], ['Адрес объекта', e.address || '—']]
      .map(f => '<div class="mg-md-fact"><span>' + f[0] + '</span><b>' + esc(f[1]) + '</b></div>').join('');
    const dirs = (e.directions || []).map(d => {
      const rows = (d.items || []).map(x => {
        const name = x.name || x.title || x.service || 'Услуга';
        const unit = x.unit ? '\u00a0' + esc(x.unit) : '';
        return '<div class="mg-md-row"><span>' + esc(name) + '</span><span>' + esc(num(x.qty)) + unit + '</span><span>' + esc(money(x.price).replace('\u00a0MDL', '')) + '</span><b>' + esc(money(num(x.qty) * num(x.price))) + '</b></div>';
      }).join('') || '<div class="mg-md-row mg-md-row-empty">В этом направлении пока нет услуг</div>';
      return '<div class="mg-md-block"><h3>' + esc(d.name) + '</h3><div class="mg-md-table"><div class="mg-md-row mg-md-row-head"><span>Услуга</span><span>Кол-во</span><span>Цена</span><b>Сумма</b></div>' + rows + '</div></div>';
    }).join('');
    const pays = (e.payments || []).map(p => '<div class="mg-md-pay"><span class="mg-md-pay-ic" aria-hidden="true">+</span><div><b>' + esc(money(p.amount)) + '</b><small>' + esc([p.date, p.method].filter(Boolean).join(' · ')) + '</small></div></div>').join('')
      || '<div class="mg-md-pay-empty">Оплат пока нет</div>';
    return '' +
      '<div class="mg-md-head"><div class="mg-md-badge" aria-hidden="true">MG</div>' +
      '<div class="mg-md-title"><h2>Смета ' + esc(e.number) + '</h2><span>Создана ' + esc(e.date) + '</span></div>' +
      '<label class="mg-md-status mg-md-status-' + STATUS_CLASS[status] + '"><span class="sr-only">Статус сметы ' + esc(e.number) + '</span>' +
      '<select data-estimate-status="' + id + '" aria-label="Статус сметы ' + esc(e.number) + '">' + options + '</select></label>' +
      '<button type="button" class="mg-md-btn" data-md-act="edit" data-md-id="' + id + '">Редактировать</button>' +
      '<button type="button" class="mg-md-btn mg-md-btn-primary" data-md-act="open" data-md-id="' + id + '">Открыть смету</button></div>' +
      '<div class="mg-md-facts">' + facts + '</div>' + dirs +
      '<div class="mg-md-bottom"><div class="mg-md-payments"><h3>Оплаты</h3>' + pays + '</div>' +
      '<div class="mg-md-totals"><div><span>Итого по смете</span><b>' + esc(money(e.total)) + '</b></div><div><span>Получено</span><b>' + esc(money(e.paid)) + '</b></div>' +
      '<div class="mg-md-left"><span>Осталось получить</span><b>' + esc(money(e.balance)) + '</b></div></div></div>' +
      '<div class="mg-md-foot"><button type="button" class="mg-md-link" data-md-act="delete" data-md-id="' + id + '">Удалить смету</button></div>';
  }

  function deactivate() {
    const screen = document.getElementById('estimatesScreen');
    if (screen && screen.hasAttribute('data-mg-md')) screen.removeAttribute('data-mg-md');
    if (pane && pane.parentNode) pane.parentNode.removeChild(pane);
    pane = null;
    lastHtml = '';
    document.querySelectorAll('#estimatesList .mg-md-card').forEach(n => {
      n.classList.remove('mg-md-selected', 'mg-md-card');
      n.removeAttribute('tabindex'); n.removeAttribute('role'); n.removeAttribute('aria-pressed');
    });
  }

  function setAttr(el, name, value) { if (el.getAttribute(name) !== value) el.setAttribute(name, value); }

  function render() {
    raf = 0;
    const screen = document.getElementById('estimatesScreen');
    if (!screen || screen.hidden || !mq.matches || screen.classList.contains('mge-editing')) {
      if (pane || (screen && screen.hasAttribute('data-mg-md'))) deactivate();
      return;
    }
    const list = document.getElementById('estimatesList');
    if (!list) return;
    if (!screen.hasAttribute('data-mg-md')) screen.setAttribute('data-mg-md', '1');
    if (!pane || !pane.isConnected) {
      pane = document.createElement('section');
      pane.className = 'mg-md-detail';
      pane.setAttribute('aria-label', 'Детали сметы');
      screen.appendChild(pane);
      lastHtml = '';
    }
    const cards = Array.from(list.querySelectorAll('[data-estimate-card]'));
    let html;
    if (!cards.length) { selected = null; html = detailHtml(null); }
    else {
      if (!selected || !cards.some(c => c.dataset.estimateCard === selected)) selected = cards[0].dataset.estimateCard;
      cards.forEach(c => {
        const on = c.dataset.estimateCard === selected;
        if (!c.classList.contains('mg-md-card')) c.classList.add('mg-md-card');
        if (c.classList.contains('mg-md-selected') !== on) c.classList.toggle('mg-md-selected', on);
        setAttr(c, 'tabindex', '0');
        setAttr(c, 'role', 'button');
        setAttr(c, 'aria-pressed', on ? 'true' : 'false');
      });
      html = detailHtml(loadEstimate(selected));
    }
    if (html !== lastHtml) {
      const hadFocus = pane.contains(document.activeElement) && document.activeElement.matches('select[data-estimate-status]');
      pane.innerHTML = html;
      lastHtml = html;
      if (hadFocus) { const s = pane.querySelector('select[data-estimate-status]'); if (s) s.focus(); }
    }
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  window.MGDesktopMD = { select(id) { selected = String(id); schedule(); } };

  document.addEventListener('click', ev => {
    if (!mq.matches) return;
    const card = ev.target.closest && ev.target.closest('#estimatesList [data-estimate-card]');
    if (!card || !card.closest('#estimatesScreen[data-mg-md]')) return;
    if (ev.target.closest('button, select, a, input, label')) return;
    selected = card.dataset.estimateCard;
    ev.stopPropagation();
    schedule();
  }, true);

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.mg-md-detail [data-md-act]');
    if (!b) return;
    const attr = { edit: 'data-estimate-edit', open: 'data-estimate-open', delete: 'data-estimate-delete' }[b.getAttribute('data-md-act')];
    const target = attr && document.querySelector('#estimatesList [' + attr + '="' + String(b.getAttribute('data-md-id')).replace(/"/g, '') + '"]');
    if (target) target.click();
  });

  document.addEventListener('keydown', ev => {
    if (!mq.matches || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    const card = ev.target.closest && ev.target.closest('#estimatesList [data-estimate-card].mg-md-card');
    if (!card) return;
    ev.preventDefault();
    selected = card.dataset.estimateCard;
    schedule();
  }, true);

  function start() {
    const screen = document.getElementById('estimatesScreen');
    const list = document.getElementById('estimatesList');
    if (!screen || !list) return;
    new MutationObserver(schedule).observe(list, { childList: true });
    new MutationObserver(schedule).observe(screen, { attributes: true, attributeFilter: ['hidden', 'class'] });
    const onChange = () => schedule();
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    window.addEventListener('storage', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
