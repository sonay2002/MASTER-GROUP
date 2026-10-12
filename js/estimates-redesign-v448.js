/* Master Group v448: responsive saved-estimate editor. Keeps the existing creation wizard untouched. */
(function () {
  'use strict';

  const panel = document.getElementById('mgEstimateEditPanel');
  const filterCard = document.querySelector('#estimatesScreen .status-filter-card');
  const list = document.getElementById('estimatesList');
  if (!panel || !filterCard || !list || !window.MGStorage || !window.MGDataModel) return;

  const STATUS = ['Черновик', 'Отправлена', 'В работе', 'Выполнена', 'Отменена'];
  let draft = null;
  let originalJSON = '';
  let activeId = null;
  let lineItemsTouched = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const number = value => Math.max(0, Number(String(value ?? '').replace(',', '.')) || 0);
  const money = value => number(value).toLocaleString('ru-MD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clone = value => JSON.parse(JSON.stringify(value || {}));
  const saved = () => window.MGStorage.saved();
  const notify = message => { try { window.__mgToast ? window.__mgToast(message) : console.info(message); } catch (_) {} };
  const financeNormalize = value => window.MGCalculations?.normalizeEstimate ? window.MGCalculations.normalizeEstimate(value) : value;

  function inputDate(value) {
    const match = String(value || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  }
  function savedDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value || '');
  }
  function catalogDirections() {
    const items = window.MGCatalog?.data;
    return Array.isArray(items) ? items.map(item => String(item?.name || '').trim()).filter(Boolean) : [];
  }
  function normalizedDraft() {
    if (!draft) return null;
    const next = clone(draft);
    next.category = (next.directions || []).map(direction => direction.name).join(', ');
    next.items = (next.directions || []).flatMap(direction => (direction.items || []).map(item => ({ ...item, direction: direction.name })));
    const normalized = financeNormalize(next);
    // Preserve a legacy fixed total when an older estimate has no line-item detail yet.
    if (!next.items.length && !lineItemsTouched) {
      normalized.total = number(next.total);
      normalized.balance = Math.max(0, normalized.total - number(normalized.paid));
      normalized.profit = normalized.total - number(normalized.expenseTotal);
    }
    return normalized;
  }
  function statusOptions(current) {
    return STATUS.map(status => `<option value="${escapeHtml(status)}" ${current === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('');
  }
  function directionOptions(selected) {
    return (draft?.directions || []).map((direction, index) => `<option value="${index}" ${Number(selected) === index ? 'selected' : ''}>${escapeHtml(direction.name)}</option>`).join('');
  }
  function renderDirections() {
    const directions = draft?.directions || [];
    const chips = directions.length ? directions.map(direction => `<span class="mge-direction-chip">${escapeHtml(direction.name)}<small>${(direction.items || []).length}</small></span>`).join('') : '<span class="mge-muted">Направления пока не выбраны</span>';
    const present = new Set(directions.map(direction => direction.name));
    const options = catalogDirections().filter(name => !present.has(name));
    const select = `<select id="mgeDirectionPicker" aria-label="Выбрать направление для добавления"><option value="">＋ Направление</option>${options.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}</select>`;
    return `<div class="mge-directions-row"><div class="mge-direction-chips">${chips}</div><div class="mge-add-direction">${select}<button type="button" data-mge-add-direction ${options.length ? '' : 'disabled'} aria-label="Добавить направление">＋</button></div></div>`;
  }
  function renderItems() {
    const directions = draft?.directions || [];
    const count = directions.reduce((sum, direction) => sum + (direction.items || []).length, 0);
    if (!count) return '<div class="mge-items-empty">Пока нет позиций. Нажмите «Добавить позицию», чтобы внести первую услугу.</div>';
    let rows = '';
    directions.forEach((direction, di) => (direction.items || []).forEach((item, ii) => {
      const price = number(item.price), qty = number(item.qty);
      rows += `<div class="mge-item-row" data-mge-row data-mge-dir="${di}" data-mge-item="${ii}">
        <label class="mge-item-name"><span>Наименование</span><input type="text" data-mge-prop="name" value="${escapeHtml(item.name || '')}" aria-label="Наименование услуги" /></label>
        <label class="mge-item-direction"><span>Направление</span><select data-mge-direction aria-label="Направление услуги">${directionOptions(di)}</select></label>
        <label class="mge-item-unit"><span>Ед.</span><input type="text" data-mge-prop="unit" value="${escapeHtml(item.unit || 'шт')}" aria-label="Единица измерения" /></label>
        <label class="mge-item-price"><span>Цена, MDL</span><input type="number" min="0" step="0.01" inputmode="decimal" data-mge-prop="price" value="${price}" aria-label="Цена за единицу" /></label>
        <label class="mge-item-qty"><span>Кол-во</span><input type="number" min="0" step="0.01" inputmode="decimal" data-mge-prop="qty" value="${qty}" aria-label="Количество" /></label>
        <div class="mge-item-sum"><span>Сумма</span><b data-mge-line-total>${money(price * qty)} MDL</b></div>
        <button type="button" class="mge-item-delete" data-mge-delete-item aria-label="Удалить позицию">×</button>
      </div>`;
    }));
    return rows;
  }
  function editorMarkup() {
    const e = normalizedDraft() || {};
    const count = (draft?.directions || []).reduce((sum, direction) => sum + (direction.items || []).length, 0);
    const payments = Array.isArray(e.payments) ? e.payments : [];
    const status = STATUS.includes(e.status) ? e.status : 'Черновик';
    return `<div class="mge-editor-header">
      <div class="mge-editor-heading"><button type="button" class="mge-back-button" data-mge-cancel aria-label="Назад">‹</button><div><h2 id="mgEstimateEditTitle">Редактирование сметы</h2><p>Измените данные и сохраните документ</p></div></div>
      <div class="mge-editor-head-actions"><button type="button" class="btn secondary" data-mge-cancel>Отмена</button><button type="button" class="btn primary" data-mge-save>Сохранить</button></div>
    </div>
    <div class="mge-editor-layout">
      <div class="mge-editor-main">
        <section class="mge-panel-card mge-details-card">
          <div class="mge-estimate-ident"><span class="estimate-badge" aria-label="Master Group">MG</span><div class="mge-estimate-ident-copy"><b>${escapeHtml(e.number || 'Смета')}</b><small>${escapeHtml(e.date || '')}</small></div><label class="mge-status-label"><span>Статус</span><select data-mge-field="status">${statusOptions(status)}</select></label></div>
          <div class="mge-fields-grid">
            <label class="mge-field"><span>Клиент</span><input data-mge-field="client" autocomplete="name" value="${escapeHtml(e.client || '')}" placeholder="Имя клиента" /></label>
            <label class="mge-field"><span>Номер телефона</span><input data-mge-field="phone" type="tel" inputmode="tel" value="${escapeHtml(e.phone || '')}" placeholder="+373 ..." /></label>
            <label class="mge-field"><span>Дата</span><input data-mge-field="date" type="date" value="${inputDate(e.date)}" /></label>
            <label class="mge-field"><span>Объект</span><input data-mge-field="object" value="${escapeHtml(e.object || e.address || '')}" placeholder="Адрес или название объекта" /></label>
            <label class="mge-field mge-field-wide"><span>Примечание</span><textarea data-mge-field="note" rows="2" placeholder="Дополнительная информация">${escapeHtml(e.note || '')}</textarea></label>
          </div>
          <div class="mge-section-subhead"><b>Направления</b><small>Можно добавить ещё одно направление</small></div>
          ${renderDirections()}
        </section>
        <section class="mge-panel-card mge-services-card">
          <div class="mge-section-heading"><div><h3>Услуги и материалы</h3><p>${count} ${count === 1 ? 'позиция' : 'позиций'}</p></div><button type="button" class="mge-square-add" data-mge-add-item aria-label="Добавить позицию">＋</button></div>
          <div class="mge-items-grid">${renderItems()}</div>
          <button type="button" class="mge-add-position" data-mge-add-item>＋ Добавить позицию</button>
        </section>
      </div>
      <aside class="mge-editor-side">
        <section class="mge-panel-card mge-finance-card"><div class="mge-side-heading"><span class="mge-side-icon">↗</span><h3>Финансы по смете</h3></div>
          <div class="mge-finance-lines"><div><span>Сумма</span><b id="mgeTotal">${money(e.total)} MDL</b></div><div><span>Получено</span><b id="mgePaid" class="mge-positive">${money(e.paid)} MDL</b></div><div><span>Остаток</span><b id="mgeBalance">${money(e.balance)} MDL</b></div><div><span>Расходы</span><b id="mgeExpenses" class="mge-negative">${money(e.expenseTotal)} MDL</b></div><div><span>Прибыль</span><b id="mgeProfit" class="mge-accent">${money(e.profit)} MDL</b></div></div>
        </section>
        <section class="mge-panel-card mge-side-action-card"><div class="mge-side-heading"><span class="mge-side-icon">▤</span><h3>Оплаты <small id="mgePaymentCount">(${payments.length})</small></h3></div><p>Полученные платежи по этой смете.</p><button type="button" class="mge-side-action" data-mge-finance="payment">＋ Добавить оплату</button></section>
        <section class="mge-panel-card mge-side-action-card"><div class="mge-side-heading"><span class="mge-side-icon">−</span><h3>Расходы</h3></div><p>Материалы, транспорт, зарплата и другие расходы.</p><button type="button" class="mge-side-action" data-mge-finance="expenses">Изменить расходы</button></section>
      </aside>
    </div>
    <div class="mge-editor-footer"><button type="button" class="btn secondary" data-mge-cancel>Отмена</button><button type="button" class="btn primary" data-mge-save>Сохранить изменения</button></div>`;
  }
  function renderEditor() {
    if (!draft) return;
    panel.innerHTML = editorMarkup();
    panel.hidden = false;
    filterCard.hidden = true;
    list.hidden = true;
    updateLiveTotals();
  }
  function openEditor(id) {
    const e = saved().find(item => String(item.id) === String(id));
    if (!e) return;
    draft = window.MGDataModel.normalizeEstimate(clone(e));
    lineItemsTouched = false;
    activeId = String(e.id);
    originalJSON = JSON.stringify(draft);
    renderEditor();
    panel.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function closeEditor() {
    panel.hidden = true;
    panel.innerHTML = '';
    filterCard.hidden = false;
    list.hidden = false;
    draft = null;
    lineItemsTouched = false;
    activeId = null;
    originalJSON = '';
    try { window.MGAppFinance?.v58RenderEstimates?.(); } catch (_) {}
  }
  function syncFieldsToDraft() {
    if (!draft) return;
    panel.querySelectorAll('[data-mge-field]').forEach(field => {
      const key = field.dataset.mgeField;
      let value = field.value;
      if (key === 'date') value = savedDate(value);
      if (key === 'status' && !STATUS.includes(value)) value = 'Черновик';
      if (key === 'client' || key === 'phone' || key === 'object' || key === 'note') value = String(value || '').trim();
      if (key === 'object') { draft.object = value; draft.address = value; }
      else draft[key] = value;
    });
    panel.querySelectorAll('[data-mge-row]').forEach(row => {
      const di = Number(row.dataset.mgeDir), ii = Number(row.dataset.mgeItem);
      const item = draft.directions?.[di]?.items?.[ii];
      if (!item) return;
      row.querySelectorAll('[data-mge-prop]').forEach(field => {
        const key = field.dataset.mgeProp;
        if (key === 'qty' || key === 'price') item[key] = number(field.value);
        else item[key] = key === 'unit' ? (String(field.value || '').trim() || 'шт') : String(field.value || '').trim();
      });
    });
    draft.category = (draft.directions || []).map(direction => direction.name).join(', ');
    draft.items = (draft.directions || []).flatMap(direction => (direction.items || []).map(item => ({ ...item, direction: direction.name })));
    if (draft.items.length || lineItemsTouched) draft.total = draft.items.reduce((sum, item) => sum + number(item.qty) * number(item.price), 0);
  }
  function updateLiveTotals() {
    if (!draft || panel.hidden) return;
    syncFieldsToDraft();
    const e = normalizedDraft();
    if (!e) return;
    const put = (id, value) => { const node = panel.querySelector('#' + id); if (node) node.textContent = value; };
    put('mgeTotal', `${money(e.total)} MDL`);
    put('mgePaid', `${money(e.paid)} MDL`);
    put('mgeBalance', `${money(e.balance)} MDL`);
    put('mgeExpenses', `${money(e.expenseTotal)} MDL`);
    put('mgeProfit', `${money(e.profit)} MDL`);
    put('mgePaymentCount', `(${(e.payments || []).length})`);
    panel.querySelectorAll('[data-mge-row]').forEach(row => {
      const price = number(row.querySelector('[data-mge-prop="price"]')?.value);
      const qty = number(row.querySelector('[data-mge-prop="qty"]')?.value);
      const totalNode = row.querySelector('[data-mge-line-total]');
      if (totalNode) totalNode.textContent = `${money(price * qty)} MDL`;
    });
  }
  function validateDraft() {
    if (!draft) return false;
    const rows = [...panel.querySelectorAll('[data-mge-row]')];
    for (const row of rows) {
      const name = row.querySelector('[data-mge-prop="name"]')?.value.trim();
      if (!name) {
        notify('Заполните название позиции или удалите пустую строку.');
        row.querySelector('[data-mge-prop="name"]')?.focus();
        return false;
      }
    }
    return true;
  }
  async function commitDraft(keepOpen) {
    if (!draft) return false;
    syncFieldsToDraft();
    if (!validateDraft()) return false;
    const old = saved();
    const index = old.findIndex(item => String(item.id) === activeId);
    if (index < 0) { notify('Смета не найдена. Обновите список и попробуйте снова.'); return false; }
    const before = clone(old[index]);
    const updated = window.MGDataModel.normalizeEstimate({
      ...clone(draft),
      id: before.id,
      number: before.number,
      status: STATUS.includes(draft.status) ? draft.status : 'Черновик',
      object: draft.object || draft.address || '',
      address: draft.object || draft.address || '',
      category: (draft.directions || []).map(direction => direction.name).join(', '),
      directions: clone(draft.directions || []),
      items: (draft.directions || []).flatMap(direction => (direction.items || []).map(item => ({ ...item, direction: direction.name })))
    });
    old[index] = updated;
    if (window.MGStorage.persist(old) === false) return false;
    draft = clone(updated);
    originalJSON = JSON.stringify(draft);
    const state = window.MGState;
    if (state) {
      state.id = updated.id;
      state.estimate = clone(updated);
      state.directions = window.MGEstimate?.normalizeDirections ? window.MGEstimate.normalizeDirections(updated) : clone(updated.directions);
    }
    try { window.__mgCloudSaveEstimate?.(updated).catch?.(() => {}); } catch (_) {}
    try { window.MGAppFinance?.v58RenderEstimates?.(); } catch (_) {}
    try { window.__MGRenderDashboard?.(); } catch (_) {}
    if (!keepOpen) {
      closeEditor();
      notify('Изменения сметы сохранены.');
    } else {
      updateLiveTotals();
    }
    return true;
  }
  async function runFinanceAction(kind) {
    if (!await commitDraft(true)) return;
    const action = kind === 'payment' ? window.__mgDirectAddPayment : window.__mgDirectEditExpenses;
    if (typeof action !== 'function') { notify('Финансовое действие сейчас недоступно.'); return; }
    try { await action(activeId); } catch (_) {}
    const latest = saved().find(item => String(item.id) === activeId);
    if (latest) {
      draft = window.MGDataModel.normalizeEstimate(clone(latest));
      originalJSON = JSON.stringify(draft);
      renderEditor();
    }
  }
  function addItem() {
    syncFieldsToDraft();
    if (!draft.directions.length) draft.directions.push({ name: 'Другие работы', items: [] });
    const selectedDirection = Number(panel.querySelector('#mgeDirectionPicker')?.dataset?.targetDirection);
    const di = Number.isInteger(selectedDirection) && selectedDirection >= 0 && selectedDirection < draft.directions.length ? selectedDirection : 0;
    draft.directions[di].items.push({ id: `mge-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, name: '', unit: 'шт', qty: 1, price: 0 });
    lineItemsTouched = true;
    renderEditor();
    const rows = panel.querySelectorAll('[data-mge-row]');
    rows[rows.length - 1]?.querySelector('[data-mge-prop="name"]')?.focus();
  }
  function addDirection() {
    syncFieldsToDraft();
    const select = panel.querySelector('#mgeDirectionPicker');
    const name = String(select?.value || '').trim();
    if (!name) { notify('Выберите направление в списке.'); return; }
    if ((draft.directions || []).some(direction => direction.name === name)) { notify('Это направление уже добавлено.'); return; }
    draft.directions.push({ name, items: [] });
    renderEditor();
    const picker = panel.querySelector('#mgeDirectionPicker');
    if (picker) { picker.dataset.targetDirection = String(draft.directions.length - 1); picker.focus(); }
  }
  function deleteItem(button) {
    syncFieldsToDraft();
    const row = button.closest('[data-mge-row]');
    if (!row) return;
    const di = Number(row.dataset.mgeDir), ii = Number(row.dataset.mgeItem);
    const items = draft.directions?.[di]?.items;
    if (!items || !items[ii]) return;
    items.splice(ii, 1);
    lineItemsTouched = true;
    renderEditor();
  }
  function moveItem(select) {
    const row = select.closest('[data-mge-row]');
    if (!row) return;
    const from = Number(row.dataset.mgeDir), itemIndex = Number(row.dataset.mgeItem), to = Number(select.value);
    if (!Number.isInteger(to) || to < 0 || to >= draft.directions.length || to === from) { updateLiveTotals(); return; }
    syncFieldsToDraft();
    const source = draft.directions[from]?.items;
    if (!source || !source[itemIndex]) return;
    const [item] = source.splice(itemIndex, 1);
    draft.directions[to].items.push(item);
    lineItemsTouched = true;
    renderEditor();
  }
  function cancelEditing() {
    syncFieldsToDraft();
    const changed = JSON.stringify(draft) !== originalJSON;
    if (changed && !window.confirm('Закрыть редактирование без сохранения изменений?')) return;
    closeEditor();
  }

  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-estimate-edit]');
    if (editButton && !panel.contains(editButton)) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      openEditor(editButton.dataset.estimateEdit);
      return;
    }
    if (!panel.contains(event.target)) return;
    const saveButton = event.target.closest('[data-mge-save]');
    if (saveButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); void commitDraft(false); return; }
    const cancelButton = event.target.closest('[data-mge-cancel]');
    if (cancelButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); cancelEditing(); return; }
    const addDirectionButton = event.target.closest('[data-mge-add-direction]');
    if (addDirectionButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); addDirection(); return; }
    const addItemButton = event.target.closest('[data-mge-add-item]');
    if (addItemButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); addItem(); return; }
    const deleteItemButton = event.target.closest('[data-mge-delete-item]');
    if (deleteItemButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); deleteItem(deleteItemButton); return; }
    const financeButton = event.target.closest('[data-mge-finance]');
    if (financeButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); void runFinanceAction(financeButton.dataset.mgeFinance); }
  }, true);

  document.addEventListener('input', event => {
    if (panel.contains(event.target) && event.target.matches('[data-mge-prop]')) lineItemsTouched = true;
    if (panel.contains(event.target) && (event.target.matches('[data-mge-field]') || event.target.matches('[data-mge-prop]'))) updateLiveTotals();
  });
  document.addEventListener('change', event => {
    if (!panel.contains(event.target)) return;
    if (event.target.matches('[data-mge-direction]')) { moveItem(event.target); return; }
    if (event.target.matches('#mgeDirectionPicker')) { return; }
    if (event.target.matches('[data-mge-field="status"]')) updateLiveTotals();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && draft && !panel.hidden) cancelEditing();
  });
  window.MGEstimateEditorV448 = { open: openEditor, close: closeEditor };
})();
