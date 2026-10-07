/* Master Group v417 — work-first estimate template pack.
 * Five document-style layouts. The selected Settings template is the only
 * template used when a document is rendered/printed/shared.
 */
(() => {
  'use strict';

  const KEY = 'master_group_estimate_template_v2';
  const templates = [
    { id: 'basic', name: 'Базовый', note: 'Чистый документ с большим местом под работы' },
    { id: 'modern', name: 'Современный', note: 'Простой заголовок и сильный итог' },
    { id: 'strict', name: 'Строгий', note: 'Линейный деловой формат' },
    { id: 'compact', name: 'Компактный', note: 'Больше строк на странице' },
    { id: 'table', name: 'Табличный', note: 'Максимум места под перечень работ' }
  ];
  const allowed = templates.map(t => t.id);

  const legacyMap = {
    '1': 'basic', '2': 'modern', '3': 'strict', '4': 'compact', '5': 'table',
    basic: 'basic', modern: 'modern', strict: 'strict', compact: 'compact', table: 'table'
  };

  const normalize = value => {
    const v = String(value ?? '').trim().toLowerCase();
    return allowed.includes(v) ? v : (legacyMap[v] || null);
  };

  const get = () => {
    try {
      const current = normalize(localStorage.getItem(KEY));
      if (current) return current;
      // One-time migration from the old selector: preserve the numeric slot,
      // but never keep or expose the old template identifiers in the UI.
      const old = String(localStorage.getItem('master_group_estimate_template_v1') || '').trim().toLowerCase();
      const migrated = legacyMap[old];
      if (migrated) {
        localStorage.setItem(KEY, migrated);
        localStorage.removeItem('master_group_estimate_template_v1');
        return migrated;
      }
    } catch (_) {}
    return 'basic';
  };

  const set = value => {
    const v = normalize(value) || 'basic';
    try {
      localStorage.setItem(KEY, v);
      localStorage.removeItem('master_group_estimate_template_v1');
    } catch (_) {}
    render(v);
    try {
      const app = window.MGAppCore;
      const current = app?.state?.estimate;
      if (current) {
        const updated = { ...current, template: v };
        app.state.estimate = updated;
        if (current.id && typeof app.saved === 'function' && typeof app.persist === 'function') {
          const list = app.saved();
          const i = list.findIndex(x => String(x?.id) === String(current.id));
          if (i >= 0) {
            list[i] = { ...list[i], template: v };
            app.persist(list);
            try { window.__mgCloudSaveEstimate?.(updated); } catch (_) {}
          }
        }
      }
    } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('mg-estimate-template-changed', { detail: { template: v } })); } catch (_) {}
    return v;
  };

  const render = (value = get()) => {
    document.querySelectorAll('[data-estimate-template]').forEach(card => {
      const active = card.dataset.estimateTemplate === value;
      card.classList.toggle('is-selected', active);
      const button = card.querySelector('[data-select-estimate-template]');
      if (button) {
        button.textContent = active ? 'Выбран' : 'Выбрать';
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      const small = card.querySelector('.estimate-template-card-head small');
      if (small) {
        const original = small.dataset.original || small.textContent;
        small.dataset.original = original;
        small.textContent = active ? 'Выбран для смет' : original;
      }
    });
  };

  const resolveForEstimate = () => get();

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-select-estimate-template]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const value = button.dataset.selectEstimateTemplate;
    set(value);
    const name = button.closest('[data-estimate-template]')?.querySelector('.estimate-template-card-head b')?.textContent || 'Шаблон';
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `Выбран шаблон: ${name}`;
      toast.classList.add('show');
      clearTimeout(window.__mgTemplateToastTimer);
      window.__mgTemplateToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }
  }, true);

  window.MGEstimateTemplates = { KEY, get, set, render, resolveForEstimate, allowed: allowed.slice(), templates };
  render();

  const list = document.getElementById('estimateTemplateList');
  const dots = Array.from(document.querySelectorAll('#estimateTemplateDots [data-template-dot]'));
  if (list && dots.length) {
    const cards = Array.from(list.querySelectorAll('.estimate-template-card'));
    const setDot = index => dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    const nearestIndex = () => {
      if (!cards.length) return 0;
      const left = list.scrollLeft + list.offsetLeft;
      let best = 0, distance = Infinity;
      cards.forEach((card, i) => {
        const d = Math.abs(card.offsetLeft - left);
        if (d < distance) { distance = d; best = i; }
      });
      return best;
    };
    const goToCard = index => {
      const i = Math.max(0, Math.min(cards.length - 1, Number(index) || 0));
      const card = cards[i];
      if (!card) return;
      const left = Math.max(0, card.offsetLeft - list.offsetLeft);
      list.scrollTo({ left, behavior: 'smooth' });
      setDot(i);
    };
    dots.forEach(dot => dot.addEventListener('click', () => goToCard(dot.dataset.templateDot)));
    let timer;
    list.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDot(nearestIndex()), 40);
    }, { passive: true });
    setDot(nearestIndex());
  }
})();

(() => {
  'use strict';
  const C = window.MGAppCore || {};
  const esc = C.esc || (v => String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s])));
  const money = C.money || (v => (Number(v)||0).toLocaleString('ru-RU', {minimumFractionDigits:2, maximumFractionDigits:2}));

  const getTemplate = () => {
    try { return window.MGEstimateTemplates?.get?.() || 'basic'; } catch (_) { return 'basic'; }
  };

  function render(e) {
    const estimate = e || {};
    const template = getTemplate();
    const dirs = Array.isArray(estimate.directions) && estimate.directions.length
      ? estimate.directions
      : (estimate.category ? [{ name: estimate.category, items: estimate.items || [] }] : [{ name: 'Работы', items: estimate.items || [] }]);

    let rowNo = 1;
    let html = '';
    for (const d of dirs) {
      const items = Array.isArray(d?.items) ? d.items : [];
      if (!items.length) continue;
      const dirTotal = items.reduce((sum, x) => sum + (Number(x?.qty)||0) * (Number(x?.price)||0), 0);
      html += `<div class="mg-tpl-direction"><span>${esc(d?.name || 'Работы')}</span><b>${money(dirTotal)} MDL</b></div>`;
      for (const x of items) {
        const qty = Number(x?.qty) || 0;
        const price = Number(x?.price) || 0;
        const name = String(x?.name || x?.service || 'Работа');
        const desc = String(x?.description || x?.note || '').trim();
        html += `<tr>
          <td>${rowNo++}</td>
          <td><div class="mg-tpl-work-name">${esc(name)}</div>${desc ? `<div class="mg-tpl-desc">${esc(desc)}</div>` : ''}</td>
          <td>${esc(x?.unit || 'шт')}</td>
          <td>${esc(String(x?.qty ?? ''))}</td>
          <td>${money(price)}</td>
          <td>${money(qty * price)}</td>
        </tr>`;
      }
    }

    if (!html) html = `<tr><td colspan="6" class="mg-tpl-empty">Работы не добавлены</td></tr>`;

    const note = String(estimate.note || estimate.notes || '').trim();
    const total = Number(estimate.total) || dirs.flatMap(d => Array.isArray(d?.items) ? d.items : []).reduce((s,x)=>s+(Number(x?.qty)||0)*(Number(x?.price)||0),0);
    const totalBlock = `<div class="mg-tpl-total"><span>Итого</span><b>${money(total)} MDL</b></div>`;
    const noteBlock = note ? `<div class="mg-tpl-note"><b>Примечание</b><div>${esc(note)}</div></div>` : '';

    let top = '';
    if (template === 'modern') {
      top = `<div class="mg-tpl-head"><div><small>Master Group</small><strong>Смета на работы</strong></div><div><b>${esc(estimate.number || '—')}</b><span>${esc(estimate.date || '—')}</span></div></div><div class="mg-tpl-section-title">Перечень работ</div>`;
    } else if (template === 'strict') {
      top = `<div class="mg-tpl-title-row"><strong>СМЕТА</strong><span>№ ${esc(estimate.number || '—')} · ${esc(estimate.date || '—')}</span></div>`;
    } else if (template === 'compact') {
      top = `<div class="mg-tpl-head"><strong>СМЕТА № ${esc(estimate.number || '—')}</strong><span>${esc(estimate.date || '—')}</span></div>`;
    } else if (template === 'table') {
      top = `<div class="mg-tpl-title-row"><div><strong>СМЕТА</strong><span>№ ${esc(estimate.number || '—')}</span></div><small>${esc(estimate.date || '—')}</small></div>`;
    } else {
      top = `<div class="mg-tpl-head"><div><strong>СМЕТА</strong><span>№ ${esc(estimate.number || '—')}</span></div><div><span>${esc(estimate.date || '—')}</span><small>Документ по работам</small></div></div>`;
    }

    const classes = `estimate-template-page mg-tpl-sheet tpl-${esc(template)}`;
    const tableHead = '<tr><th>№</th><th>Наименование работ</th><th>Ед.</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>';

    const body = `<div class="mg-tpl-services">${top}<table><thead>${tableHead}</thead><tbody>${html}</tbody></table>${noteBlock}${totalBlock}</div>`;
    const doc = document.getElementById('document');
    if (!doc) return;
    doc.innerHTML = `<div class="${classes}" data-rendered-template="${esc(template)}">${body}</div>`;
    try {
      if (C.state?.estimate && String(C.state.estimate.id) === String(estimate.id)) {
        C.state.estimate = { ...C.state.estimate, template };
      }
    } catch (_) {}
    if (typeof C.screen === 'function') C.screen('documentScreen');
  }


  window.addEventListener('mg-estimate-template-changed', () => {
    try {
      const e = window.MGAppCore?.state?.estimate;
      if (e && window.MGAppCore?.state?.screen === 'documentScreen') render(e);
    } catch (_) {}
  });
  window.__mgRenderEstimateDocument = render;
  if (window.MGAppCore) window.MGAppCore.documentBody = render;
})();
