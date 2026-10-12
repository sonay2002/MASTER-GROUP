/* Master Group v451: approved estimate editor layout, aligned direction groups and contextual popovers. Other screens unchanged. */
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
  const collapsedSections = { finance: false, payments: false, expenses: false };
  const flow = { open: false, step: 'directions', mode: 'add-direction', directionName: '', selected: new Set(), search: '' };

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
  function catalogData() {
    return Array.isArray(window.MGCatalog?.data) ? window.MGCatalog.data : [];
  }
  function catalogDirections() {
    return catalogData().map(item => String(item?.name || '').trim()).filter(Boolean);
  }
  function catalogDirection(name) {
    const needle = String(name || '').trim().toLocaleLowerCase();
    return catalogData().find(item => String(item?.name || '').trim().toLocaleLowerCase() === needle) || null;
  }
  function uid(prefix) {
    return `${prefix || 'mge'}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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
    const chips = directions.length ? directions.map((direction, index) => `<span class="mge-direction-chip"><span>${escapeHtml(direction.name)}</span><button type="button" data-mge-remove-direction="${index}" aria-label="Убрать направление ${escapeHtml(direction.name)} из этой сметы">×</button></span>`).join('') : '<span class="mge-muted">Выберите направление, затем услуги</span>';
    return `<div class="mge-directions-row"><div class="mge-direction-chips">${chips}</div><button type="button" class="mge-add-direction-button" data-mge-open-direction-picker aria-label="Добавить направление и выбрать его услуги" title="Добавить направление и выбрать услуги">＋</button></div>`;
  }
  function renderItems(direction, di) {
    const items = Array.isArray(direction?.items) ? direction.items : [];
    if (!items.length) return '<div class="mge-items-empty">В этом направлении пока нет услуг. Нажмите «Добавить услугу», чтобы выбрать её из каталога.</div>';
    return items.map((item, ii) => {
      const price = number(item.price), qty = number(item.qty);
      return `<div class="mge-item-row" data-mge-row data-mge-dir="${di}" data-mge-item="${ii}">
        <span class="mge-cell-number">${ii + 1}</span>
        <label class="mge-item-name"><span class="sr-only">Наименование</span><input type="text" data-mge-prop="name" value="${escapeHtml(item.name || '')}" aria-label="Наименование услуги" /></label>
        <label class="mge-item-unit"><span class="sr-only">Ед.</span><input type="text" data-mge-prop="unit" value="${escapeHtml(item.unit || 'шт')}" aria-label="Единица измерения" /></label>
        <label class="mge-item-price"><span class="sr-only">Цена, MDL</span><input type="number" min="0" step="0.01" inputmode="decimal" data-mge-prop="price" value="${price}" aria-label="Цена за единицу" /></label>
        <label class="mge-item-qty"><span class="sr-only">Количество</span><input type="number" min="0" step="0.01" inputmode="decimal" data-mge-prop="qty" value="${qty}" aria-label="Количество" /></label>
        <div class="mge-item-sum"><b data-mge-line-total>${money(price * qty)}</b></div>
        <div class="mge-item-action"><button type="button" class="mge-item-menu-button" data-mge-toggle-item-menu aria-label="Действия с позицией" aria-haspopup="menu" aria-expanded="false">⋮</button><div class="mge-item-menu" role="menu" hidden><label><span>Направление</span><select data-mge-direction aria-label="Направление услуги">${directionOptions(di)}</select></label><button type="button" role="menuitem" class="mge-item-duplicate" data-mge-duplicate-item>Дублировать позицию</button><button type="button" role="menuitem" class="mge-item-delete" data-mge-delete-item>Удалить позицию</button></div></div>
      </div>`;
    }).join('');
  }
  function renderDirectionServiceGroups() {
    const directions = draft?.directions || [];
    if (!directions.length) return `<div class="mge-no-directions"><span class="mge-no-directions-icon">＋</span><b>Сначала выберите направление</b><p>Нажмите «+» у поля «Направления», затем выберите направление и нужные услуги из каталога.</p><button type="button" class="mge-add-position" data-mge-open-direction-picker>＋ Добавить направление и выбрать услуги</button></div>`;
    return directions.map((direction, di) => {
      const total = (direction.items || []).reduce((sum, item) => sum + number(item.price) * number(item.qty), 0);
      return `<section class="mge-direction-service-group" data-mge-service-group="${di}">
        <div class="mge-direction-service-head"><div class="mge-direction-service-title"><span class="mge-direction-service-dot" aria-hidden="true"></span><h4>${escapeHtml(direction.name)}</h4><small>${(direction.items || []).length} ${(direction.items || []).length === 1 ? 'позиция' : 'позиций'}</small></div><div class="mge-direction-service-total" data-mge-direction-total="${di}">${money(total)} MDL</div></div>
        <div class="mge-items-table" role="table" aria-label="Услуги направления ${escapeHtml(direction.name)}"><div class="mge-items-head" role="row"><span role="columnheader">№</span><span role="columnheader">Наименование</span><span role="columnheader">Ед.</span><span role="columnheader">Цена</span><span role="columnheader">Кол-во</span><span role="columnheader">Сумма</span><span role="columnheader"></span></div><div class="mge-items-grid" role="rowgroup">${renderItems(direction, di)}</div></div>
        <button type="button" class="mge-add-position" data-mge-add-item data-mge-add-item-for="${di}">＋ Добавить услугу</button>
      </section>`;
    }).join('');
  }
  function directionPickerModal() {
    const names = catalogDirections();
    const used = new Set((draft?.directions || []).map(d => String(d.name).toLowerCase()));
    const options = names.filter(name => flow.mode === 'add-direction' ? !used.has(name.toLowerCase()) : used.has(name.toLowerCase()));
    const title = flow.mode === 'add-direction' ? 'Добавить направление' : 'Выбрать направление';
    const hint = flow.mode === 'add-direction' ? 'Выберите направление — затем откроется список его услуг.' : 'Выберите направление сметы, к которому нужно добавить услугу.';
    const content = options.length ? options.map(name => {
      const info = catalogDirection(name);
      const count = Array.isArray(info?.services) ? info.services.length : 0;
      return `<button type="button" class="mge-picker-option" data-mge-pick-direction="${escapeHtml(name)}"><span class="mge-picker-option-icon">${escapeHtml(info?.icon || '•')}</span><span class="mge-picker-option-copy"><b>${escapeHtml(name)}</b><small>Услуг в каталоге: ${count}</small></span><span class="mge-picker-option-arrow">›</span></button>`;
    }).join('') : `<div class="mge-picker-empty">${flow.mode === 'add-direction' ? 'Все направления из каталога уже добавлены в эту смету.' : 'Сначала добавьте направление в смету.'}</div>`;
    return `<div class="mge-flow-modal-head"><div><h3>${title}</h3><p>${hint}</p></div><button type="button" class="mge-flow-close" data-mge-flow-close aria-label="Закрыть">×</button></div><div class="mge-flow-modal-body"><label class="mge-flow-search"><span aria-hidden="true">⌕</span><input type="search" data-mge-direction-search placeholder="Поиск направлений" autocomplete="off"></label><div class="mge-picker-options" data-mge-direction-options>${content}</div><div class="mge-flow-footnote">Направления берутся из общего каталога. Здесь они не создаются повторно.</div></div>`;
  }
  function valuePickerModal(kind) {
    const isClient = kind === 'client';
    const title = isClient ? 'Выбрать клиента' : 'Выбрать объект';
    const key = isClient ? 'client' : 'object';
    const values = [...new Set(saved().map(item => String(isClient ? item.client || '' : item.object || item.address || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ru'));
    const current = String(isClient ? draft?.client || '' : draft?.object || draft?.address || '');
    const options = values.length ? values.map(value => `<button type="button" class="mge-picker-option" data-mge-pick-value="${escapeHtml(value)}" data-value="${escapeHtml(value.toLocaleLowerCase())}"><span class="mge-picker-option-icon">${isClient ? '♙' : '⌖'}</span><span class="mge-picker-option-copy"><b>${escapeHtml(value)}</b>${value === current ? '<small>Выбрано сейчас</small>' : ''}</span><span class="mge-picker-option-arrow">›</span></button>`).join('') : `<div class="mge-picker-empty">Сохранённых ${isClient ? 'клиентов' : 'объектов'} пока нет. Можно вписать значение вручную в поле сметы.</div>`;
    return `<div class="mge-flow-modal-head"><div><h3>${title}</h3><p>${isClient ? 'Выберите клиента из ранее сохранённых смет.' : 'Выберите объект из ранее сохранённых смет.'}</p></div><button type="button" class="mge-flow-close" data-mge-flow-close aria-label="Закрыть">×</button></div><div class="mge-flow-modal-body"><label class="mge-flow-search"><span aria-hidden="true">⌕</span><input type="search" data-mge-value-search placeholder="Поиск ${isClient ? 'клиентов' : 'объектов'}" autocomplete="off"></label><div class="mge-picker-options" data-mge-value-options>${options}</div><div class="mge-flow-footnote">Выбор меняет только текущую смету. Данные других смет не изменяются.</div></div>`;
  }
  function servicePickerModal() {
    const selectedDir = catalogDirection(flow.directionName);
    const services = Array.isArray(selectedDir?.services) ? selectedDir.services : [];
    const draftDirection = (draft?.directions || []).find(d => d.name.toLowerCase() === String(flow.directionName).toLowerCase());
    const existing = new Set((draftDirection?.items || []).map(item => String(item.name || '').trim().toLowerCase()));
    const rows = services.map((service, index) => {
      const name = String(service?.name || '').trim();
      if (!name) return '';
      const isExisting = existing.has(name.toLowerCase());
      const checked = flow.selected.has(name) && !isExisting;
      return `<label class="mge-service-option ${isExisting ? 'is-existing' : ''}" data-mge-service-option data-name="${escapeHtml(name.toLowerCase())}"><input type="checkbox" data-mge-service-check value="${escapeHtml(name)}" ${checked ? 'checked' : ''} ${isExisting ? 'disabled' : ''}><span class="mge-service-checkmark" aria-hidden="true"></span><span class="mge-service-option-copy"><b>${escapeHtml(name)}</b><small>${isExisting ? 'Уже добавлена в эту смету' : `Единица измерения: ${escapeHtml(service.unit || 'шт')}`}</small></span><span class="mge-service-option-unit">${escapeHtml(service.unit || 'шт')}</span></label>`;
    }).filter(Boolean).join('');
    return `<div class="mge-flow-modal-head"><div><h3>Выбор услуг</h3><p class="mge-flow-subtitle">Направление: <b>${escapeHtml(flow.directionName)}</b></p></div><button type="button" class="mge-flow-close" data-mge-flow-close aria-label="Закрыть">×</button></div><div class="mge-flow-modal-body"><label class="mge-flow-search"><span aria-hidden="true">⌕</span><input type="search" data-mge-service-search placeholder="Поиск услуг в направлении" autocomplete="off"></label><div class="mge-service-options" data-mge-service-options>${rows || '<div class="mge-picker-empty">У этого направления пока нет услуг в каталоге. Создайте услугу — она будет добавлена в каталог и эту смету.</div>'}</div><button type="button" class="mge-create-service-trigger" data-mge-create-service>＋ Создать услугу в каталоге</button></div><div class="mge-flow-modal-footer"><button type="button" class="btn secondary" data-mge-flow-back>Назад</button><button type="button" class="btn primary" data-mge-add-selected ${flow.selected.size ? '' : 'disabled'}>Добавить выбранные (${flow.selected.size})</button></div>`;
  }
  function createServiceModal() {
    return `<div class="mge-flow-modal-head"><div><h3>Новая услуга</h3><p>Направление: <b>${escapeHtml(flow.directionName)}</b></p></div><button type="button" class="mge-flow-close" data-mge-flow-close aria-label="Закрыть">×</button></div><form class="mge-create-service-form" data-mge-create-service-form><label><span>Название услуги</span><input data-mge-new-service-name required maxlength="120" placeholder="Например, Монтаж автомата"></label><label><span>Единица измерения</span><select data-mge-new-service-unit><option value="шт">шт.</option><option value="м">м</option><option value="м²">м²</option><option value="час">час</option><option value="компл">компл.</option><option value="рейс">рейс</option><option value="сотка">сотка</option></select></label><p class="mge-flow-footnote">После подтверждения услуга сохранится в каталоге выбранного направления и сразу появится в текущей смете. Цену и количество можно изменить в таблице.</p><div class="mge-flow-modal-footer"><button type="button" class="btn secondary" data-mge-flow-back>Назад</button><button type="submit" class="btn primary">Сохранить в каталог и смету</button></div></form>`;
  }
  function renderFlowModal() {
    const host = panel.querySelector('#mgeFlowModal');
    if (!host) return;
    if (!flow.open) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    if (flow.step === 'directions') host.innerHTML = `<div class="mge-flow-modal">${directionPickerModal()}</div>`;
    else if (flow.step === 'services') host.innerHTML = `<div class="mge-flow-modal">${servicePickerModal()}</div>`;
    else if (flow.step === 'clients' || flow.step === 'objects') host.innerHTML = `<div class="mge-flow-modal">${valuePickerModal(flow.step === 'clients' ? 'client' : 'object')}</div>`;
    else host.innerHTML = `<div class="mge-flow-modal">${createServiceModal()}</div>`;
    if (!host.hidden) { const focus = host.querySelector('[data-mge-direction-search], [data-mge-service-search], [data-mge-value-search], [data-mge-new-service-name]'); if (focus) setTimeout(() => focus.focus({ preventScroll: true }), 0); }
  }
  function openDirectionPicker(mode) {
    syncFieldsToDraft();
    flow.open = true;
    flow.step = 'directions';
    flow.mode = mode || 'add-direction';
    flow.directionName = '';
    flow.selected = new Set();
    flow.search = '';
    renderFlowModal();
  }
  function openServicePickerForDirection(index) {
    syncFieldsToDraft();
    const direction = draft?.directions?.[index];
    if (!direction) { openDirectionPicker('add-direction'); return; }
    flow.open = true;
    flow.mode = 'choose-existing';
    flow.step = 'services';
    flow.directionName = direction.name;
    flow.selected = new Set();
    flow.search = '';
    renderFlowModal();
  }
  function openServicePickerForAddedDirection() {
    syncFieldsToDraft();
    const dirs = draft?.directions || [];
    if (!dirs.length) { openDirectionPicker('add-direction'); return; }
    if (dirs.length === 1) { openServicePickerForDirection(0); return; }
    openDirectionPicker('choose-existing');
  }
  function openValuePicker(kind) {
    syncFieldsToDraft();
    flow.open = true;
    flow.mode = kind;
    flow.step = kind === 'client' ? 'clients' : 'objects';
    flow.directionName = '';
    flow.selected = new Set();
    flow.search = '';
    renderFlowModal();
  }
  function chooseFlowValue(value) {
    syncFieldsToDraft();
    const clean = String(value || '').trim();
    if (flow.step === 'clients') draft.client = clean;
    else if (flow.step === 'objects') { draft.object = clean; draft.address = clean; }
    flow.open = false;
    renderEditor();
  }
  function chooseFlowDirection(name) {
    syncFieldsToDraft();
    const target = String(name || '').trim();
    if (!target) return;
    if (flow.mode === 'add-direction' && (draft.directions || []).some(d => d.name.toLowerCase() === target.toLowerCase())) {
      notify('Это направление уже есть в смете.'); return;
    }
    flow.directionName = target;
    flow.selected = new Set();
    flow.step = 'services';
    renderFlowModal();
  }
  function addSelectedServices() {
    syncFieldsToDraft();
    const definition = catalogDirection(flow.directionName);
    if (!definition) { notify('Направление не найдено в каталоге. Обновите каталог и попробуйте снова.'); return; }
    const chosen = (definition.services || []).filter(service => flow.selected.has(String(service.name || '').trim()));
    if (!chosen.length) { notify('Выберите хотя бы одну услугу.'); return; }
    let direction = (draft.directions || []).find(d => d.name.toLowerCase() === flow.directionName.toLowerCase());
    if (!direction && flow.mode === 'add-direction') {
      direction = { name: flow.directionName, items: [] };
      draft.directions.push(direction);
    }
    if (!direction) { notify('Сначала добавьте это направление в смету.'); return; }
    let added = 0, skipped = 0;
    const existing = new Set((direction.items || []).map(item => String(item.name || '').trim().toLowerCase()));
    chosen.forEach(service => {
      const name = String(service.name || '').trim();
      if (!name || existing.has(name.toLowerCase())) { skipped++; return; }
      direction.items = Array.isArray(direction.items) ? direction.items : [];
      direction.items.push({ id: uid('mge-item'), name, unit: String(service.unit || 'шт').trim() || 'шт', qty: 1, price: number(service.price), catalogService: true });
      existing.add(name.toLowerCase()); added++;
    });
    if (!added) { notify('Выбранные услуги уже добавлены в эту смету.'); return; }
    lineItemsTouched = true;
    flow.open = false;
    flow.selected = new Set();
    renderEditor();
    notify(`Добавлено услуг: ${added}${skipped ? `; пропущено повторов: ${skipped}` : ''}. Укажите цену и количество.`);
    const targetGroup = (draft.directions || []).findIndex(direction => String(direction.name).toLowerCase() === String(flow.directionName).toLowerCase());
    setTimeout(() => panel.querySelector(`[data-mge-service-group="${targetGroup}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 70);
  }
  function saveNewCatalogService() {
    const nameInput = panel.querySelector('[data-mge-new-service-name]');
    const unitInput = panel.querySelector('[data-mge-new-service-unit]');
    const name = String(nameInput?.value || '').trim();
    const unit = String(unitInput?.value || 'шт').trim() || 'шт';
    if (!name) { notify('Введите название услуги.'); nameInput?.focus(); return; }
    const catalog = window.MGCatalog;
    const def = catalogDirection(flow.directionName);
    if (!catalog || !def) { notify('Не удалось найти направление в каталоге.'); return; }
    if ((def.services || []).some(s => String(s.name || '').trim().toLowerCase() === name.toLowerCase())) {
      notify('Такая услуга уже есть в каталоге. Выберите её в списке.');
      flow.step = 'services'; flow.selected.add(name); renderFlowModal(); return;
    }
    def.services = Array.isArray(def.services) ? def.services : [];
    const service = { name, unit };
    def.services.push(service);
    if (catalog.save() === false) {
      def.services.pop();
      notify('Не удалось сохранить услугу в каталоге. Проверьте доступное место на устройстве.');
      return;
    }
    // Keep any already checked catalogue services selected, then add all checked rows in one pass.
    flow.selected.add(name);
    flow.step = 'services';
    addSelectedServices();
  }
  function filterPickerOptions(input, selector, attr) {
    const q = String(input?.value || '').trim().toLocaleLowerCase();
    panel.querySelectorAll(selector).forEach(option => { option.hidden = !!q && !String(option.getAttribute(attr) || option.textContent).toLocaleLowerCase().includes(q); });
  }
  function editorMarkup() {
    const e = normalizedDraft() || {};
    const count = (draft?.directions || []).reduce((sum, direction) => sum + (direction.items || []).length, 0);
    const payments = Array.isArray(e.payments) ? e.payments : [];
    const expenses = Array.isArray(e.expenses) ? e.expenses : [];
    const expenseCount = expenses.length || ['expenseMaterial', 'expenseTransport', 'expenseSalary', 'expenseOther'].filter(key => number(e[key]) > 0).length;
    const status = STATUS.includes(e.status) ? e.status : 'Черновик';
    const paymentRows = payments.length ? `<div class="mge-finance-records">${payments.map(payment => `<div class="mge-finance-record"><span>${escapeHtml(payment.date || e.date || '')}${payment.method ? ` · ${escapeHtml(payment.method)}` : ''}</span><b>${money(payment.amount)} MDL</b></div>`).join('')}</div>` : '';
    const expenseRows = expenseCount ? `<div class="mge-finance-records">${expenses.length ? expenses.map((expense, index) => `<div class="mge-finance-record"><span>${escapeHtml(expense.title || expense.category || `Расход ${index + 1}`)}${expense.date ? ` · ${escapeHtml(expense.date)}` : ''}</span><b>${money(expense.amount ?? expense.sum)} MDL</b></div>`).join('') : [['Материалы','expenseMaterial'],['Транспорт','expenseTransport'],['Зарплата','expenseSalary'],['Прочее','expenseOther']].filter(([,key]) => number(e[key]) > 0).map(([label,key]) => `<div class="mge-finance-record"><span>${label}</span><b>${money(e[key])} MDL</b></div>`).join('')}</div>` : '';
    return `<div class="mge-editor-header">
      <div class="mge-editor-heading"><button type="button" class="mge-back-button" data-mge-cancel aria-label="Назад">‹</button><div><h2 id="mgEstimateEditTitle">Редактирование сметы</h2></div></div>
      <button type="button" class="mge-editor-close" data-mge-cancel aria-label="Закрыть редактор">×</button>
    </div>
    <div class="mge-editor-layout">
      <div class="mge-editor-main">
        <section class="mge-panel-card mge-details-card">
          <div class="mge-estimate-ident"><span class="estimate-badge" aria-label="Master Group">MG</span><div class="mge-estimate-ident-copy"><b>${escapeHtml(e.number || 'Смета')}</b><small>${escapeHtml(e.date || '')}${e.client ? ` · ${escapeHtml(e.client)}` : ''}</small></div><label class="mge-status-label" aria-label="Статус сметы"><select data-mge-field="status" title="Статус сметы">${statusOptions(status)}</select></label></div>
          <div class="mge-fields-grid">
            <label class="mge-field"><span>Клиент</span><span class="mge-field-control"><input data-mge-field="client" autocomplete="name" value="${escapeHtml(e.client || '')}" placeholder="Имя клиента" /><button type="button" class="mge-field-picker-button" data-mge-open-client-picker aria-label="Выбрать ранее сохранённого клиента">›</button></span></label>
            <label class="mge-field"><span>Дата</span><input data-mge-field="date" type="date" value="${inputDate(e.date)}" /></label>
            <div class="mge-inline-field mge-inline-directions"><span class="mge-inline-label">Направления</span>${renderDirections()}</div>
            <label class="mge-field"><span>Объект</span><span class="mge-field-control"><input data-mge-field="object" value="${escapeHtml(e.object || e.address || '')}" placeholder="Без объекта" /><button type="button" class="mge-field-picker-button" data-mge-open-object-picker aria-label="Выбрать ранее сохранённый объект">›</button></span></label>
            <label class="mge-field mge-field-wide"><span>Заметка</span><textarea data-mge-field="note" rows="2" placeholder="—">${escapeHtml(e.note || '')}</textarea></label>
          </div>
        </section>
        <section class="mge-panel-card mge-services-card">
          <div class="mge-section-heading"><div><h3>Услуги и материалы</h3></div><button type="button" class="mge-square-add" data-mge-add-item aria-label="Добавить услугу из каталога" title="Добавить услугу из каталога">＋</button></div>
          <div class="mge-direction-service-groups">${renderDirectionServiceGroups()}</div>
        </section>
      </div>
      <aside class="mge-editor-side">
        <section class="mge-panel-card mge-finance-card"><button type="button" class="mge-side-heading mge-side-heading-toggle" data-mge-toggle-section="finance" aria-expanded="${!collapsedSections.finance}"><span class="mge-side-icon">▥</span><h3>Финансы по смете</h3><span class="mge-side-chevron" aria-hidden="true">${collapsedSections.finance ? '⌄' : '⌃'}</span></button>
          <div class="mge-finance-lines" data-mge-section-body="finance" ${collapsedSections.finance ? 'hidden' : ''}><div><span>Сумма</span><b id="mgeTotal">${money(e.total)} MDL</b></div><div><span>Получено</span><b id="mgePaid" class="mge-positive">${money(e.paid)} MDL</b></div><div><span>Остаток</span><b id="mgeBalance">${money(e.balance)} MDL</b></div><div><span>Расходы</span><b id="mgeExpenses" class="mge-negative">${money(e.expenseTotal)} MDL</b></div><div><span>Прибыль</span><b id="mgeProfit" class="mge-accent">${money(e.profit)} MDL</b></div></div>
        </section>
        <section class="mge-panel-card mge-side-action-card"><div class="mge-side-heading"><button type="button" class="mge-side-heading-toggle" data-mge-toggle-section="payments" aria-expanded="${!collapsedSections.payments}"><span class="mge-side-icon">▣</span><h3>Оплаты <small id="mgePaymentCount">(${payments.length})</small></h3><span class="mge-side-chevron" aria-hidden="true">${collapsedSections.payments ? '⌄' : '⌃'}</span></button><button type="button" class="mge-side-add" data-mge-finance="payment" aria-label="Добавить оплату">＋</button></div><div data-mge-section-body="payments" ${collapsedSections.payments ? 'hidden' : ''}>${paymentRows}<button type="button" class="mge-side-action" data-mge-finance="payment">＋ Добавить оплату</button></div></section>
        <section class="mge-panel-card mge-side-action-card"><div class="mge-side-heading"><button type="button" class="mge-side-heading-toggle" data-mge-toggle-section="expenses" aria-expanded="${!collapsedSections.expenses}"><span class="mge-side-icon">▣</span><h3>Расходы <small>(${expenseCount})</small></h3><span class="mge-side-chevron" aria-hidden="true">${collapsedSections.expenses ? '⌄' : '⌃'}</span></button><button type="button" class="mge-side-add" data-mge-finance="expenses" aria-label="Добавить расход">＋</button></div><div data-mge-section-body="expenses" ${collapsedSections.expenses ? 'hidden' : ''}>${expenseRows}<button type="button" class="mge-side-action" data-mge-finance="expenses">＋ Добавить расход</button></div></section>
      </aside>
    </div>
    <div class="mge-editor-footer"><button type="button" class="btn secondary" data-mge-cancel>Отмена</button><button type="button" class="btn primary" data-mge-save>Сохранить изменения</button></div>
    <div id="mgeFlowModal" class="mge-flow-overlay" hidden role="dialog" aria-modal="true" aria-label="Выбор направления и услуг"></div>`;
  }

  function renderEditor() {
    if (!draft) return;
    panel.innerHTML = editorMarkup();
    panel.hidden = false;
    filterCard.hidden = false;
    list.hidden = false;
    document.getElementById('estimatesScreen')?.classList.add('mge-editing');
    updateLiveTotals();
    if (flow.open) renderFlowModal();
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
    flow.open = false;
    flow.selected = new Set();
    panel.hidden = true;
    panel.innerHTML = '';
    document.getElementById('estimatesScreen')?.classList.remove('mge-editing');
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
    (draft.directions || []).forEach((direction, index) => { const target = panel.querySelector(`[data-mge-direction-total="${index}"]`); if (target) target.textContent = `${money((direction.items || []).reduce((sum, item) => sum + number(item.price) * number(item.qty), 0))} MDL`; });
    panel.querySelectorAll('[data-mge-row]').forEach(row => {
      const price = number(row.querySelector('[data-mge-prop="price"]')?.value);
      const qty = number(row.querySelector('[data-mge-prop="qty"]')?.value);
      const totalNode = row.querySelector('[data-mge-line-total]');
      if (totalNode) totalNode.textContent = money(price * qty);
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
    if (window.MGStorage.persist(old) === false) {
      notify('Не удалось сохранить изменения. Проверьте доступное место и повторите попытку.');
      return false;
    }
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
  function duplicateItem(button) {
    syncFieldsToDraft();
    const row = button.closest('[data-mge-row]');
    if (!row) return;
    const di = Number(row.dataset.mgeDir), ii = Number(row.dataset.mgeItem);
    const source = draft.directions?.[di]?.items?.[ii];
    if (!source) return;
    draft.directions[di].items.splice(ii + 1, 0, { ...clone(source), id: uid('mge-item') });
    lineItemsTouched = true;
    renderEditor();
    notify('Позиция продублирована. Проверьте количество и цену.');
  }
  function removeDirection(index) {
    syncFieldsToDraft();
    const directions = draft?.directions || [];
    if (!Number.isInteger(index) || index < 0 || index >= directions.length) return;
    const direction = directions[index];
    const itemCount = (direction.items || []).length;
    if (itemCount && !window.confirm(`Удалить направление «${direction.name}» вместе с ${itemCount} позициями?`)) return;
    directions.splice(index, 1);
    lineItemsTouched = true;
    renderEditor();
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

  function closeItemMenus() {
    panel.querySelectorAll('.mge-item-menu').forEach(menu => {
      menu.hidden = true;
      menu.style.position = '';
      menu.style.removeProperty('left');
      menu.style.removeProperty('top');
      menu.style.right = '';
      menu.style.bottom = '';
      menu.style.width = '';
    });
    panel.querySelectorAll('[data-mge-toggle-item-menu]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  }
  function positionItemMenu(button, menu) {
    menu.hidden = false;
    menu.style.position = 'fixed';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    menu.style.width = `${Math.min(228, Math.max(160, window.innerWidth - 24))}px`;
    menu.style.setProperty('left', '12px', 'important');
    menu.style.setProperty('top', '12px', 'important');
    const anchor = button.getBoundingClientRect();
    const rect = menu.getBoundingClientRect();
    const margin = 12;
    const left = Math.max(margin, Math.min(anchor.right - rect.width, window.innerWidth - rect.width - margin));
    let top = anchor.bottom + 5;
    if (top + rect.height > window.innerHeight - margin) top = anchor.top - rect.height - 5;
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
    menu.style.setProperty('left', `${left}px`, 'important');
    menu.style.setProperty('top', `${top}px`, 'important');
    button.setAttribute('aria-expanded', 'true');
  }
  function repositionItemMenus() {
    const open = panel.querySelector('.mge-item-menu:not([hidden])');
    if (!open) return;
    const row = open.closest('[data-mge-row]');
    const button = row?.querySelector('[data-mge-toggle-item-menu]');
    if (!button) { closeItemMenus(); return; }
    const rect = button.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) { closeItemMenus(); return; }
    positionItemMenu(button, open);
  }

  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-estimate-edit]');
    if (editButton && !panel.contains(editButton)) {
      closeItemMenus();
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      openEditor(editButton.dataset.estimateEdit);
      return;
    }
    if (!panel.contains(event.target)) { closeItemMenus(); return; }
    if (!event.target.closest('.mge-item-menu, [data-mge-toggle-item-menu]')) closeItemMenus();
    if (event.target.matches('#mgeFlowModal')) { flow.open = false; renderFlowModal(); return; }
    const itemMenuButton = event.target.closest('[data-mge-toggle-item-menu]');
    if (itemMenuButton) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const row = itemMenuButton.closest('[data-mge-row]');
      const menu = row?.querySelector('.mge-item-menu');
      const wasOpen = menu && !menu.hidden;
      closeItemMenus();
      if (menu && !wasOpen) positionItemMenu(itemMenuButton, menu);
      return;
    }
    const removeDirectionButton = event.target.closest('[data-mge-remove-direction]');
    if (removeDirectionButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); removeDirection(Number(removeDirectionButton.dataset.mgeRemoveDirection)); return; }
    const saveButton = event.target.closest('[data-mge-save]');
    if (saveButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); void commitDraft(false); return; }
    const cancelButton = event.target.closest('[data-mge-cancel]');
    if (cancelButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); cancelEditing(); return; }
    const flowClose = event.target.closest('[data-mge-flow-close]');
    if (flowClose) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); flow.open = false; renderFlowModal(); return; }
    const flowBack = event.target.closest('[data-mge-flow-back]');
    if (flowBack) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (flow.step === 'create-service') flow.step = 'services'; else if (flow.step === 'services' && flow.mode === 'add-direction' && !(draft.directions || []).some(d => d.name.toLowerCase() === flow.directionName.toLowerCase())) flow.step = 'directions'; else flow.step = 'directions'; renderFlowModal(); return; }
    const addDirectionButton = event.target.closest('[data-mge-open-direction-picker]');
    if (addDirectionButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); openDirectionPicker('add-direction'); return; }
    const pickDirection = event.target.closest('[data-mge-pick-direction]');
    if (pickDirection) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); chooseFlowDirection(pickDirection.dataset.mgePickDirection); return; }
    const openClientPicker = event.target.closest('[data-mge-open-client-picker]');
    if (openClientPicker) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); openValuePicker('client'); return; }
    const openObjectPicker = event.target.closest('[data-mge-open-object-picker]');
    if (openObjectPicker) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); openValuePicker('object'); return; }
    const pickValue = event.target.closest('[data-mge-pick-value]');
    if (pickValue) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); chooseFlowValue(pickValue.dataset.mgePickValue); return; }
    const createService = event.target.closest('[data-mge-create-service]');
    if (createService) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); flow.step = 'create-service'; renderFlowModal(); panel.querySelector('[data-mge-new-service-name]')?.focus(); return; }
    const addSelected = event.target.closest('[data-mge-add-selected]');
    if (addSelected) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); addSelectedServices(); return; }
    const addItemButton = event.target.closest('[data-mge-add-item]');
    if (addItemButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); const groupIndex = addItemButton.dataset.mgeAddItemFor; if (groupIndex !== undefined) openServicePickerForDirection(Number(groupIndex)); else openServicePickerForAddedDirection(); return; }
    const duplicateButton = event.target.closest('[data-mge-duplicate-item]');
    if (duplicateButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); duplicateItem(duplicateButton); return; }
    const deleteItemButton = event.target.closest('[data-mge-delete-item]');
    if (deleteItemButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); deleteItem(deleteItemButton); return; }
    const toggleSection = event.target.closest('[data-mge-toggle-section]');
    if (toggleSection) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); const key = toggleSection.dataset.mgeToggleSection; collapsedSections[key] = !collapsedSections[key]; const body = panel.querySelector(`[data-mge-section-body="${key}"]`); if (body) body.hidden = collapsedSections[key]; toggleSection.setAttribute('aria-expanded', String(!collapsedSections[key])); const arrow = toggleSection.querySelector('.mge-side-chevron'); if (arrow) arrow.textContent = collapsedSections[key] ? '⌄' : '⌃'; return; }
    const financeButton = event.target.closest('[data-mge-finance]');
    if (financeButton) { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); void runFinanceAction(financeButton.dataset.mgeFinance); }
  }, true);

  document.addEventListener('input', event => {
    if (!panel.contains(event.target)) return;
    if (event.target.matches('[data-mge-prop]')) lineItemsTouched = true;
    if (event.target.matches('[data-mge-field]') || event.target.matches('[data-mge-prop]')) updateLiveTotals();
    if (event.target.matches('[data-mge-service-search]')) filterPickerOptions(event.target, '[data-mge-service-option]', 'data-name');
    if (event.target.matches('[data-mge-direction-search]')) filterPickerOptions(event.target, '[data-mge-pick-direction]', 'data-mge-pick-direction');
    if (event.target.matches('[data-mge-value-search]')) filterPickerOptions(event.target, '[data-mge-pick-value]', 'data-value');
  });
  document.addEventListener('change', event => {
    if (!panel.contains(event.target)) return;
    if (event.target.matches('[data-mge-direction]')) { moveItem(event.target); return; }
    if (event.target.matches('[data-mge-service-check]')) {
      const name = String(event.target.value || '');
      if (event.target.checked) flow.selected.add(name); else flow.selected.delete(name);
      const button = panel.querySelector('[data-mge-add-selected]');
      if (button) { button.textContent = `Добавить выбранные (${flow.selected.size})`; button.disabled = flow.selected.size === 0; button.classList.toggle('disabled', flow.selected.size === 0); }
      return;
    }
    if (event.target.matches('[data-mge-field="status"]')) updateLiveTotals();
  });
  document.addEventListener('submit', event => {
    if (!panel.contains(event.target) || !event.target.matches('[data-mge-create-service-form]')) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); saveNewCatalogService();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && draft && !panel.hidden) { if (flow.open) { flow.open = false; renderFlowModal(); } else if (panel.querySelector('.mge-item-menu:not([hidden])')) closeItemMenus(); else cancelEditing(); }
  });
  window.addEventListener('scroll', repositionItemMenus, true);
  window.addEventListener('resize', repositionItemMenus, { passive: true });
  window.MGEstimateEditorV451 = { open: openEditor, close: closeEditor, addDirection: () => openDirectionPicker('add-direction'), addService: openServicePickerForAddedDirection };
  window.MGEstimateEditorV450 = window.MGEstimateEditorV451;
})();
