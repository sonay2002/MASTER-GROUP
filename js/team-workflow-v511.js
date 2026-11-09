/* Master Group v505 — standalone administrator team workspace. */
(function () {
  'use strict';

  const ADMIN_EMAIL = 'berjan608@gmail.com';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
  const stableJSON = (value) => JSON.stringify(value, (_key, item) => {
    if (item && !Array.isArray(item) && typeof item === 'object') return Object.keys(item).sort().reduce((out, key) => { out[key] = item[key]; return out; }, {});
    return item;
  });
  const isAdmin = (user) => !!user &&
    String(user.email || '').toLowerCase() === ADMIN_EMAIL &&
    user.emailVerified === true;

  let auth = null;
  let db = null;
  let directory = {};
  let members = {};
  let activeUid = '';
  let estimateRows = [];
  let estimatesRef = null;
  let directoryRef = null;
  let membersRef = null;
  let currentEditId = '';
  let initialized = false;
  let verifiedAdminUid = '';

  // The app's screen router calls this guard. The UID is set only after this
  // module has freshly reloaded and verified the administrator's Firebase user.
  window.__mgTeamIsAdmin = () => !!verifiedAdminUid &&
    !!auth?.currentUser && auth.currentUser.uid === verifiedAdminUid;

  function toast(message) {
    if (typeof window.__mgToast === 'function') window.__mgToast(message);
    else console.info('[Master Group team]', message);
  }

  async function refreshAdmin() {
    let user = auth?.currentUser || null;
    if (!user) return null;
    try {
      await user.reload();
      await user.getIdToken(true);
    } catch (error) {
      console.warn('Team admin token refresh:', error?.code || error);
    }
    user = auth?.currentUser || user;
    verifiedAdminUid = isAdmin(user) ? user.uid : '';
    syncMenu(user);
    return user;
  }

  function syncMenu(user) {
    const button = $('mgTeamMenuItem');
    if (button) button.hidden = !isAdmin(user);
  }

  function stopListeners() {
    if (estimatesRef) estimatesRef.off();
    if (directoryRef) directoryRef.off();
    if (membersRef) membersRef.off();
    estimatesRef = directoryRef = membersRef = null;
  }

  function profileFor(uid) {
    return directory[uid]?.profile || {};
  }

  function acceptedEmployees() {
    return Object.entries(members).filter(([uid, member]) =>
      uid !== auth?.currentUser?.uid && member?.accepted === true && !!directory[uid]
    );
  }

  function screenRoot() {
    return $('mgTeamScreenContent');
  }

  function ensureLayout() {
    const root = screenRoot();
    if (!root) return false;
    if ($('mgTeamTabsViewport') && $('mgTeamTabs') && $('mgTeamBody') && $('mgTeamEditor')) return true;
    root.innerHTML = `
      <section class="mg-team-panel mg-team-members-panel" aria-label="Сотрудники команды">
        <div class="mg-team-tabs-row">
          <button type="button" class="mg-team-scroll-arrow" data-team-scroll="left" aria-label="Прокрутить сотрудников влево">‹</button>
          <div id="mgTeamTabsViewport" class="mg-team-tabs-viewport">
            <div id="mgTeamTabs" class="mg-team-tabs"></div>
          </div>
          <button type="button" class="mg-team-scroll-arrow" data-team-scroll="right" aria-label="Прокрутить сотрудников вправо">›</button>
        </div>
      </section>
      <section class="mg-team-panel mg-team-work-panel">
        <div id="mgTeamBody" class="mg-team-body"><div class="mg-team-empty">Выберите сотрудника в панели команды.</div></div>
        <div id="mgTeamEditor" class="mg-team-editor" hidden></div>
      </section>`;
    return true;
  }

  function renderTabs() {
    const host = $('mgTeamTabs');
    if (!host) return;
    const employees = acceptedEmployees();
    host.innerHTML = employees.length ? employees.map(([uid]) => {
      const p = profileFor(uid);
      const label = p.displayName || p.email || uid;
      return `<button type="button" class="mg-team-tab${uid === activeUid ? ' is-active' : ''}" data-team-tab="${esc(uid)}" title="${esc(p.email || label)}">${esc(label)}</button>`;
    }).join('') : '<div class="mg-team-empty mg-team-empty-compact">Пока нет сотрудников. Добавьте пользователя в команду в разделе «Мониторинг пользователей».</div>';
    if (activeUid && !employees.some(([uid]) => uid === activeUid)) {
      activeUid = '';
      estimateRows = [];
      if (estimatesRef) estimatesRef.off();
      estimatesRef = null;
    }
  }

  function estimateTotal(estimate) {
    if (Number.isFinite(Number(estimate?.total))) return Number(estimate.total);
    const dirs = Array.isArray(estimate?.directions) ? estimate.directions : [];
    return dirs.reduce((sum, direction) => sum + (direction.items || []).reduce((n, item) =>
      n + (Number(item.qty) || 0) * (Number(item.price) || 0), 0), 0);
  }

  function renderEstimates() {
    const body = $('mgTeamBody');
    if (!body) return;
    if (!activeUid) {
      body.innerHTML = '<div class="mg-team-empty">Выберите сотрудника во вкладках выше.</div>';
      return;
    }
    const profile = profileFor(activeUid);
    const estimates = estimateRows.filter((item) => item && !item._deleted && !item._purged);
    body.innerHTML = `
      <div class="mg-team-employee-summary">
        <div><b>${esc(profile.displayName || profile.email || 'Сотрудник')}</b><small>${esc(profile.email || activeUid)}</small></div>
        <span>${estimates.length} смет</span>
      </div>
      ${estimates.length ? estimates.map((estimate) => `
        <article class="mg-team-estimate-card">
          <div class="mg-team-estimate-main">
            <b>${esc(estimate.number || estimate.estimateNumber || 'Смета')}</b>
            <small>${esc(estimate.client || 'Клиент не указан')} · ${esc(estimate.date || 'Дата не указана')}</small>
          </div>
          <strong>${estimateTotal(estimate).toLocaleString('ru-RU')} MDL</strong>
          <button type="button" class="mg-team-secondary" data-team-edit="${esc(estimate.id)}">Открыть и изменить</button>
        </article>`).join('') : '<div class="mg-team-empty">У сотрудника пока нет сохранённых смет.</div>'}`;
  }

  function selectEmployee(uid) {
    if (!members[uid]?.accepted || !directory[uid]) return;
    activeUid = uid;
    estimateRows = [];
    if (estimatesRef) estimatesRef.off();
    renderTabs();
    renderEstimates();
    estimatesRef = db.ref(`users/${uid}/estimates`);
    estimatesRef.on('value', (snapshot) => {
      if (activeUid !== uid) return;
      const value = snapshot.val() || {};
      estimateRows = Object.entries(value).map(([id, item]) => ({ ...item, id: item?.id || id }))
        .filter((item) => item && typeof item === 'object' && !item._deleted && !item._purged)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      renderEstimates();
    }, (error) => {
      console.error('Team estimates read failed:', error);
      const body = $('mgTeamBody');
      if (body) body.innerHTML = '<div class="mg-team-error">Не удалось прочитать сметы. Проверьте опубликованные правила Firebase.</div>';
    });
  }

  function normalizeEstimateForEditor(raw) {
    const normalized = window.MGDataModel?.normalizeEstimate
      ? window.MGDataModel.normalizeEstimate(raw)
      : clone(raw);
    if (!Array.isArray(normalized.directions)) normalized.directions = [];
    if (!normalized.directions.length && Array.isArray(normalized.items) && normalized.items.length) {
      normalized.directions = [{
        name: normalized.category || 'Без направления',
        items: normalized.items.map((item) => ({ ...item }))
      }];
    }
    return normalized;
  }

  function closeTeamEditor() {
    currentEditId = '';
    const panel = $('mgEstimateEditPanel');
    const estimatesScreen = $('estimatesScreen');
    if (panel && estimatesScreen && panel.parentElement !== estimatesScreen) estimatesScreen.appendChild(panel);
    const host = $('mgTeamEditor');
    if (host) {
      host.hidden = true;
      host.classList.remove('mg-team-editor-host');
    }
    $('teamScreen')?.classList.remove('mge-editing');
    renderEstimates();
  }

  function openEditor(id) {
    const raw = estimateRows.find((item) => String(item.id) === String(id));
    if (!raw) return;
    if (!isAdmin(auth?.currentUser) || !verifiedAdminUid || verifiedAdminUid !== auth.currentUser.uid) {
      toast('Редактирование доступно только подтверждённому администратору.');
      return;
    }
    const host = $('mgTeamEditor');
    const editor = window.MGEstimateEditorV453;
    if (!host || typeof editor?.openExternal !== 'function') {
      toast('Полноценный редактор не загрузился. Обновите приложение.');
      console.error('MGEstimateEditorV453.openExternal is unavailable');
      return;
    }
    currentEditId = String(id);
    host.hidden = false;
    host.classList.add('mg-team-editor-host');
    const opened = editor.openExternal(raw, {
      mount: host,
      onSave: saveOriginal,
      onFinance: editEmployeeFinance,
      onClose: closeTeamEditor
    });
    if (!opened) {
      currentEditId = '';
      host.hidden = true;
      host.classList.remove('mg-team-editor-host');
    }
  }

  async function saveOriginal(updatedInput) {
    const uid = activeUid;
    const id = currentEditId;
    const original = estimateRows.find((item) => String(item.id) === id);
    if (!updatedInput || !original || !uid || members[uid]?.accepted !== true ||
        !isAdmin(auth?.currentUser) || !verifiedAdminUid || verifiedAdminUid !== auth.currentUser.uid) {
      toast('Сотрудник или права администратора изменились. Обновите список.');
      return false;
    }
    try {
      const normalized = window.MGDataModel?.normalizeEstimate
        ? window.MGDataModel.normalizeEstimate(clone(updatedInput))
        : clone(updatedInput);
      normalized.id = id;
      normalized.number = original.number || normalized.number || id;
      normalized._adminEditedAt = Date.now();
      normalized._adminEditedBy = auth.currentUser.uid;
      normalized._adminEditedByEmail = auth.currentUser.email || ADMIN_EMAIL;
      normalized._cloudUpdatedAt = Date.now();

      const estimateRef = db.ref(`users/${uid}/estimates/${id}`);
      await estimateRef.set(normalized);
      const verify = await estimateRef.once('value');
      const saved = verify.val();
      if (!saved || String(saved.id || id) !== id ||
          String(saved.client || '') !== String(normalized.client || '') ||
          String(saved.status || '') !== String(normalized.status || '') ||
          Number(saved.total || 0) !== Number(normalized.total || 0) ||
          stableJSON(saved.directions || []) !== stableJSON(normalized.directions || [])) {
        throw new Error('Firebase не подтвердил сохранение всей сметы сотрудника.');
      }

      let auditSaved = true;
      try {
        await db.ref(`adminEstimateEdits/${uid}`).push({
          estimateId: id,
          estimateNumber: normalized.number || id,
          actorUid: auth.currentUser.uid,
          actorEmail: auth.currentUser.email || ADMIN_EMAIL,
          at: Date.now(),
          action: 'updated',
          clientName: normalized.client || '',
          total: Number(normalized.total) || 0
        });
      } catch (auditError) {
        auditSaved = false;
        console.error('Team audit save failed:', auditError);
      }

      const index = estimateRows.findIndex((item) => String(item.id) === id);
      if (index >= 0) estimateRows[index] = normalized;
      renderEstimates();
      toast(auditSaved
        ? 'Оригинальная смета сотрудника сохранена.'
        : 'Смета сохранена, но запись истории не удалась. Проверьте правила Firebase.');
      return normalized;
    } catch (error) {
      console.error('Team original estimate save failed:', error);
      const message = error?.code === 'PERMISSION_DENIED' || error?.code === 'database/permission-denied'
        ? 'Firebase отклонил запись. Проверьте правила Realtime Database.'
        : (error?.message || 'Не удалось сохранить оригинал. Изменения не подтверждены Firebase.');
      toast(message);
      return false;
    }
  }

  async function editEmployeeFinance(kind, currentEstimate) {
    const modal = window.MG71 || window.MG70;
    if (!modal) throw new Error('Окно финансовых действий недоступно.');
    const current = window.MGDataModel?.normalizeEstimate
      ? window.MGDataModel.normalizeEstimate(clone(currentEstimate))
      : clone(currentEstimate);
    if (kind === 'payment') {
      if (typeof modal.payment !== 'function') throw new Error('Окно добавления оплаты недоступно.');
      const data = await modal.payment(Math.max(0, Number(current.balance) || 0));
      if (!data) return null;
      const payments = Array.isArray(current.payments) ? current.payments.slice() : [];
      payments.push({
        id: window.MGAppCore?.uid?.() || `payment-${Date.now()}`,
        amount: Math.max(0, Number(data.amount) || 0),
        date: new Date().toLocaleDateString('ru-RU'),
        method: data.method || 'другое',
        note: data.note || ''
      });
      current.payments = payments;
    } else if (kind === 'expenses') {
      if (typeof modal.expenses !== 'function') throw new Error('Окно расходов недоступно.');
      const data = await modal.expenses({
        material: Number(current.expenseMaterial) || 0,
        transport: Number(current.expenseTransport) || 0,
        salary: Number(current.expenseSalary) || 0,
        other: Number(current.expenseOther) || 0
      });
      if (!data) return null;
      current.expenseMaterial = Math.max(0, Number(data.material) || 0);
      current.expenseTransport = Math.max(0, Number(data.transport) || 0);
      current.expenseSalary = Math.max(0, Number(data.salary) || 0);
      current.expenseOther = Math.max(0, Number(data.other) || 0);
    } else {
      return null;
    }
    const normalized = window.MGDataModel?.normalizeEstimate
      ? window.MGDataModel.normalizeEstimate(current)
      : current;
    return saveOriginal(normalized);
  }

  async function acceptEmployee(uid) {
    if (!directory[uid] || !auth?.currentUser || !isAdmin(auth.currentUser)) return;
    try {
      await db.ref(`teamMembers/${uid}`).set({
        accepted: true,
        acceptedAt: Date.now(),
        acceptedBy: auth.currentUser.uid,
        email: profileFor(uid).email || ''
      });
      toast('Сотрудник принят в команду.');
    } catch (error) {
      console.error('Team member acceptance failed:', error);
      toast('Не удалось принять сотрудника. Проверьте правила Firebase.');
    }
  }

  async function open() {
    // Open the view immediately from the already-known Firebase auth state.
    // Token reload/refresh is deliberately moved off the navigation critical path.
    const cachedUser = auth?.currentUser || null;
    if (!isAdmin(cachedUser)) {
      verifiedAdminUid = '';
      toast(cachedUser && String(cachedUser.email || '').toLowerCase() === ADMIN_EMAIL
        ? 'Сначала подтвердите Gmail администратора.'
        : 'Нет доступа к разделу «Моя команда».');
      return false;
    }
    verifiedAdminUid = cachedUser.uid;
    if (!window.MGFirebaseClient?.ready?.()) {
      toast('Firebase недоступен. Проверьте подключение.');
      return false;
    }
    if (typeof window.MGAppCore?.screen !== 'function') {
      toast('Не удалось открыть экран приложения. Перезагрузите страницу.');
      return false;
    }
    window.MGAppCore.screen('teamScreen');
    if ($('teamScreen')?.hidden) {
      console.error('Team screen remained hidden after authorized navigation');
      toast('Экран команды не открылся. Перезагрузите страницу приложения.');
      return false;
    }
    ensureLayout();
    renderTabs();
    renderEstimates();
    try {
      db = window.MGFirebaseClient.getDb();
      stopListeners();
      directoryRef = db.ref('userDirectory');
      membersRef = db.ref('teamMembers');
      directoryRef.on('value', (snapshot) => {
        directory = snapshot.val() || {};
        renderTabs();
        renderEstimates();
        if (currentEditId) toast('Обновился список сотрудников. Перед сохранением проверьте выбранную смету.');
      }, (error) => {
        console.error('Team directory read failed:', error);
        const host = $('mgTeamTabs');
        if (host) host.innerHTML = '<div class="mg-team-error">Не удалось загрузить пользователей из Firebase.</div>';
      });
      membersRef.on('value', (snapshot) => {
        members = snapshot.val() || {};
        renderTabs();
        renderEstimates();
      }, (error) => {
        console.error('Team membership read failed:', error);
        const host = $('mgTeamTabs');
        if (host) host.innerHTML = '<div class="mg-team-error">Не удалось загрузить состав команды. Проверьте правила Firebase.</div>';
      });
      // Refresh token in the background; do not delay the screen transition.
      refreshAdmin().then(user => {
        if (!isAdmin(user)) {
          verifiedAdminUid = '';
          stopListeners();
          window.MGAppCore?.screen?.('dashboard');
        }
      }).catch(error => console.warn('Background team auth refresh:', error));
      return true;
    } catch (error) {
      console.error('Team Firebase init failed:', error);
      toast('Не удалось подключиться к Firebase.');
      return false;
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    try {
      auth = window.MGFirebaseClient?.getAuth?.() || null;
    } catch (error) {
      console.warn('Team auth init:', error);
    }
    if (auth?.onAuthStateChanged) {
      auth.onAuthStateChanged((user) => {
        verifiedAdminUid = isAdmin(user) ? user.uid : '';
        syncMenu(user);
        if (!isAdmin(user)) {
          stopListeners();
          if ($('teamScreen') && !$('teamScreen').hidden) window.MGAppCore?.screen?.('dashboard');
        }
      });
    }
    document.addEventListener('click', (event) => {
      const acceptButton = event.target.closest('[data-team-accept]');
      if (acceptButton) {
        acceptEmployee(acceptButton.dataset.teamAccept);
        return;
      }
      const tabButton = event.target.closest('[data-team-tab]');
      if (tabButton) {
        selectEmployee(tabButton.dataset.teamTab);
        return;
      }
      const editButton = event.target.closest('[data-team-edit]');
      if (editButton) {
        openEditor(editButton.dataset.teamEdit);
        return;
      }
      const scrollControl = event.target.closest('[data-team-scroll]');
      if (scrollControl) {
        const viewport = $('mgTeamTabsViewport');
        if (viewport) viewport.scrollBy({ left: scrollControl.dataset.teamScroll === 'left' ? -240 : 240, behavior: 'smooth' });
        return;
      }
    });
    syncMenu(auth?.currentUser || null);
  }

  window.MGTeamWorkflow = { open, stop: stopListeners, refresh: renderTabs };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
