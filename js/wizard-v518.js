/* Master Group v518 — new estimate wizard UI.
   Replaces only the rendering of steps 1, 3 and 5 (+ step bar). All data, totals, saving and sync
   still go through the existing estimate-core / estimate-engine code. */
(() => {
  'use strict';
  const A = () => window.MGAppCore || {};
  const UI = () => window.MGEstimateUI;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const money = n => (A().money ? A().money(n) : Number(n || 0).toFixed(2));
  const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const fmt = n => { const r = Math.round(num(n) * 100) / 100; return String(r).replace('.', ','); };
  const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, d = m % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d >= 2 && d <= 4 ? b : c; };

  /* ───────────── Legacy direction-key registry; display uses the approved 24 reference PNG cards ───────────── */
  const IC = {
    clean: '<path class="m" d="M13 27l14-6 9 19H10z"/><path d="M33 5 25 21"/><path class="a" d="M17 33l-1 6M23 31v8M29 32l2 7"/><path class="f" d="M9 6l1.4 3.6L14 11l-3.6 1.4L9 16l-1.4-3.6L4 11l3.6-1.4zM40 20l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>',
    camera: '<g transform="rotate(-8 24 20)"><rect class="m" x="5" y="11" width="29" height="17" rx="5"/><path class="m" d="M34 15.5l8-3v15l-8-3z"/><circle class="f" cx="11" cy="17" r="1.7"/></g><path class="a" d="M17 29v7M9 36h16M6 41h22"/>',
    metal: '<path class="m" d="M8 10h28v6H8zM8 28h28v6H8z"/><path d="M22 16v12"/><path class="a" d="M36 17l6-6M39 25h6M33 11l1-6"/><path class="f" d="M40 33l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
    plumbing: '<path class="m" d="M8 14h18a6 6 0 016 6v8H24v-8H8z"/><path d="M16 14V8M11 8h10"/><path class="a" d="M6 14v8"/><path class="m" d="M28 34c-3 4-3 7 0 8 3-1 3-4 0-8z"/><path class="a" d="M23 34h10"/>',
    electrical: '<path class="m" d="M27 5 13 27h10l-2 16 14-23H25z"/><path class="a" d="M8 12l-3-3M40 36l3 3M6 30H3M45 18h-3"/>',
    construction: '<path class="m" d="M7 42V22l17-13 17 13v20z"/><path d="M19 42V30h10v12"/><path class="a" d="M24 9V4M12 12 9 9"/><path class="f" d="M38 8l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>',
    masonry: '<path class="m" d="M6 11h36v9H6zM6 29h36v9H6z"/><path d="M6 20h18v9H6zM24 20h18v9H24z"/><path class="a" d="M15 11v9M33 11v9M15 29v9M33 29v9"/>',
    welding: '<path class="m" d="M10 24a14 14 0 0128 0v12H10z"/><path d="M15 24h18v6H15z"/><path class="a" d="M6 38h36M24 10v3"/><path class="f" d="M40 8l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>',
    paint: '<rect class="m" x="8" y="7" width="28" height="11" rx="3"/><path d="M36 12h4v12H24v6"/><rect class="a" x="21" y="30" width="6" height="12" rx="2"/>',
    aircon: '<rect class="m" x="5" y="9" width="38" height="15" rx="4"/><path d="M10 19h28"/><path class="a" d="M14 30c0 3-2 4-2 7M24 30c0 3-2 4-2 8M34 30c0 3-2 4-2 7"/>',
    heating: '<path class="m" d="M7 12h34v26H7z"/><path d="M12 12v26M20 12v26M28 12v26M36 12v26"/><path class="a" d="M4 17v16M44 17v16"/>',
    ventilation: '<circle class="m" cx="24" cy="24" r="17"/><circle class="f" cx="24" cy="24" r="2.5"/><path d="M24 21c-1-6 1-10 5-12M27 24c6-1 10 1 12 5M24 27c1 6-1 10-5 12M21 24c-6 1-10-1-12-5"/>',
    window: '<rect class="m" x="8" y="6" width="32" height="36" rx="3"/><path d="M24 6v36M8 24h32"/><path class="a" d="M12 10l6 6"/>',
    roof: '<path class="m" d="M10 21 24 8l14 13v21H10z"/><path d="M4 25 24 8l20 17"/><path class="a" d="M33 14V8h5v10"/><path d="M20 42V31h8v11"/>',
    finishing: '<path class="m" d="M26 18l6-8 6 6-8 6z"/><path d="M8 40 28 20"/><path class="a" d="M6 28l3 3M12 24l2 2"/>',
    landscape: '<path class="m" d="M24 5c5.500 0 9.500 4 9.500 8.500 4 1 6.500 4.600 5.500 9-1 4.500-5 6.500-9.500 6.500H19c-5.500 0-9.500-3.500-9.500-8.500 0-3.500 2.500-6.500 5.500-7.500C15.500 9 19 5 24 5z"/><path d="M24 29v13M18 42h12"/><path class="a" d="M24 35l-5-5M24 32l5-4"/>',
    excavator: '<path class="m" d="M5 37h24v6H5z"/><path d="M9 37v-9h13v9"/><path d="M22 29l11-16 8 5-6 9"/><path class="a" d="M33 13l-5-6M41 18l3 6"/>',
    transport: '<path class="m" d="M4 13h26v19H4z"/><path class="m" d="M30 20h8l6 8v4H30z"/><circle cx="12" cy="36" r="4"/><circle cx="36" cy="36" r="4"/>',
    sewer: '<path class="m" d="M5 13h38v9H5z"/><path d="M15 22v14M33 22v14"/><path class="a" d="M10 41h10M28 41h10"/><path class="f" d="M24 28c-2 3-2 5 0 6 2-1 2-3 0-6z"/>',
    water: '<path class="m" d="M24 5C17 16 12 22 12 29a12 12 0 0024 0c0-7-5-13-12-24z"/><path class="a" d="M18 31c1 4 4 6 7 6"/>',
    fence: '<path class="m" d="M8 41V16l4-7 4 7v25zM20 41V16l4-7 4 7v25zM32 41V16l4-7 4 7v25z"/><path class="a" d="M4 24h40M4 34h40"/>',
    flooring: '<path class="m" d="M24 5 43 24 24 43 5 24z"/><path class="a" d="M24 14 34 24 24 34 14 24z"/>',
    tools: '<path class="m" d="M26 8a9 9 0 0011 11l-5 5-7-7z"/><path d="M10 38 27 21"/><path class="a" d="M30 30l9 9M33 27l9 9"/>',
    other: '<rect class="m" x="7" y="7" width="14" height="14" rx="4"/><rect x="27" y="7" width="14" height="14" rx="4"/><rect x="7" y="27" width="14" height="14" rx="4"/><path class="a" d="M34 28v12M28 34h12"/>'
  };
  const ALIASES = { '🌿': 'clean', '📹': 'camera', '⚙️': 'metal', '🔧': 'plumbing', bolt: 'electrical', home: 'construction', brick: 'masonry', brush: 'finishing', snow: 'aircon', drain: 'sewer', tree: 'landscape', case: 'other', car: 'transport', drill: 'tools', dril: 'tools' };
  // Exact catalog names and explicit catalog keys take precedence over legacy emoji aliases.
  // More specific terms come first so e.g. 'Металлоконструкции и сварка' gets the
  // welding artwork rather than a generic metal-beam icon.
  const RULES = [
    [/клининг|уборк|очистк/, 'clean'],
    [/свар|металлоконструкц/, 'welding'],
    [/видео|камер|наблюден/, 'camera'],
    [/сантех|водопровод|водоснаб|труб/, 'plumbing'],
    [/утеплен.{0,20}фасад|фасад.{0,20}утеплен/, 'construction'],
    [/маляр|покраск/, 'paint'],
    [/электрик|электромонтаж|кабел|провод/, 'electrical'],
    [/ремонт|отделк|обслужив/, 'tools'],
    [/кров|крыша|крыш/, 'roof'],
    [/окн|двер/, 'window'],
    [/кондиционир|кондиционер|климат/, 'aircon'],
    [/вентиляц/, 'ventilation'],
    [/укладк.{0,20}плит|плиточ|керамогранит|кладк|кирпич/, 'masonry'],
    [/наполь|покрыти.{0,12}пол|ламинат|паркет/, 'flooring'],
    [/гипсокартон|гкл/, 'finishing'],
    [/тепло.{0,10}звукоизоляц|звукоизоляц|теплоизоляц/, 'heating'],
    [/демонтаж|разборк/, 'excavator'],
    [/бетон|бетонирован|раствор/, 'transport'],
    [/высотн|строительн.{0,12}лес|вышк/, 'metal'],
    [/благоустрой|дренаж|ландшафт|газон|озелен/, 'landscape'],
    [/тротуарн.{0,12}плит|брусчатк|мощен/, 'sewer'],
    [/лестниц|перил|поручен/, 'other'],
    [/забор|огражден|ворот/, 'fence'],
    [/навес|пергол|козырек|козырёк|конструкци/, 'water']
  ];
  const CANONICAL_ICON_NAMES = {
    'клининг и уборка':'clean','клининг участка':'clean',
    'видеонаблюдение':'camera','установка видеонаблюдения':'camera',
    'металлоконструкции':'metal','металлоконструкции и сварка':'welding',
    'сантехника':'plumbing','сантехнические работы':'plumbing',
    'строительство':'construction','электрика':'electrical',
    'земляные работы':'excavator','заборы и ограждения':'fence',
    'отделочные работы':'finishing','напольные покрытия':'flooring',
    'отопление':'heating','благоустройство и ландшафт':'landscape',
    'кладочные работы':'masonry','малярные работы':'paint',
    'канализация':'sewer','перевозки и вывоз':'transport',
    'кровельные работы':'roof','вентиляция':'ventilation',
    'водоснабжение':'water','сварочные работы':'welding',
    'окна и двери':'window','кондиционирование':'aircon',
    'инструмент и оборудование':'tools','прочие работы и услуги':'other'
  };
  function iconKey(iconValue, nameValue) {
    const k = String(iconValue || '').trim().toLowerCase();
    if (IC[k]) return k;
    const n = String(nameValue || '').trim().toLocaleLowerCase('ru-RU').replace(/\\s+/g, ' ');
    if (CANONICAL_ICON_NAMES[n]) return CANONICAL_ICON_NAMES[n];
    const byName = (RULES.find(([re]) => re.test(n)) || [])[1];
    if (byName && IC[byName]) return byName;
    const alias = ALIASES[k];
    if (alias && IC[alias]) return alias;
    return 'other';
  }
  // Step 1 uses the full individual card cropped from the user's approved reference image.
  const icon = (ic, name) => {
    const key = iconKey(ic, name);
    // The approved source sheet has one matching metal-structure illustration
    // for both metalwork and welding. The welding.png crop is labelled concrete,
    // so reuse the same metalwork image rather than showing an incorrect category.
    const assetKey = key === 'welding' ? 'metal' : key;
    const label = esc(name || key);
    return `<img src="./icons/direction-approved/${assetKey}.png?v=${assetKey==='fence'?565:(['clean','landscape','flooring','roof'].includes(assetKey)?561:560)}" class="mg-work-icon-image wz-dir-image" alt="${label}" draggable="false" loading="eager" decoding="async">`;
  };
  window.MGWizardIcons518 = { svg: icon, keys: Object.keys(IC) };

  /* ───────────── helpers over core state ───────────── */
  const state = () => A().state || {};
  const catalogDir = name => (A().catalog || []).find(d => d.name === name);
  const dirIcon = d => { const cd = catalogDir(d?.name); return d?.icon || cd?.icon || ''; };
  function findItem(id) {
    for (const d of state().directions || []) { const x = (d.items || []).find(i => i.id === id); if (x) return { d, x }; }
    return null;
  }
  function curDirName() {
    const s = state();
    if (s.pendingDirectionName) return s.pendingDirectionName;
    const d = (s.directions || [])[s.activeDirection];
    if (d) return d.name;
    return (s.directions && s.directions[0]) ? s.directions[0].name : null;
  }
  const countServices = () => (state().directions || []).reduce((n, d) => n + (d.items || []).length, 0);
  const SHORT = {
    'Клининг и уборка':'Клининг',
    'Видеонаблюдение':'Видеонабл.',
    'Металлоконструкции':'Металлоконстр.',
    'Сантехника':'Сантехника',
    'Строительство':'Строительство',
    'Электрика':'Электрика',
    'Земляные работы':'Земляные работы',
    'Заборы и ограждения':'Ограждения',
    'Отделочные работы':'Отделка',
    'Напольные покрытия':'Напольные покрытия',
    'Отопление':'Отопление',
    'Благоустройство и ландшафт':'Благоустройство',
    'Кладочные работы':'Кладка',
    'Малярные работы':'Малярные работы',
    'Канализация':'Канализация',
    'Перевозки и вывоз':'Перевозки',
    'Кровельные работы':'Кровля',
    'Вентиляция':'Вентиляция',
    'Водоснабжение':'Водоснабжение',
    'Сварочные работы':'Сварка',
    'Окна и двери':'Окна и двери',
    'Кондиционирование':'Кондиционер',
    'Инструмент и оборудование':'Инструмент',
    'Прочие работы и услуги':'Прочее'
  };
  function shortName(n) {
    let s = SHORT[n] || String(n || '').replace(/^Установка\s+/i, '').replace(/\s+работы$/i, '').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return s.split(' ').map(w => {
      if (w.length < 12) return esc(w);
      const known = { 'видеонаблюдение': 5, 'металлоконструкции': 6 };
      const at = known[w.toLowerCase()] || 6;
      return esc(w.slice(0, at)) + '&shy;' + esc(w.slice(at));
    }).join(' ');
  }

  /* ───────────── Step 1 · directions ───────────── */
  const DESC = {
    'Клининг участка': 'Уборка территории, вывоз мусора, уход за участком',
    'Установка видеонаблюдения': 'Монтаж и настройка систем видеонаблюдения',
    'Металлоконструкции и сварка': 'Изготовление и монтаж металлоконструкций',
    'Сантехнические работы': 'Монтаж и ремонт сантехники, водопровода, канализации'
  };
  // The category chooser is one panel: compact horizontal rail when closed,
  // the same rail reflows into an overlay grid when opened.
  let directionsExpanded = false;
  const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>';

  function renderCats() {
    const a = A(), s = a.state, cats = a.cats || [];
    const cur = curDirName();
    const box = $('categories');
    if (!box) return;
    const prevRow = box.querySelector('.mg-direction-rail');
    const prevLeft = prevRow ? prevRow.scrollLeft : 0;
    box.innerHTML = `<div class="mg-direction-panel ${directionsExpanded ? 'is-expanded' : ''}">
      <div class="mg-direction-toolbar">
        <button type="button" class="mg-direction-expand" data-wz-directions-toggle aria-label="${directionsExpanded ? 'Свернуть список направлений' : 'Показать все направления'}" title="${directionsExpanded ? 'Свернуть' : 'Показать все направления'}" aria-expanded="${directionsExpanded}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
      <div class="mg-direction-rail" role="group" aria-label="Направления работ">${cats.map(([n, ic]) => {
        const d = s.directions.find(x => x.name === n);
        const selected = !!d;
        const current = cur === n;
        return `<button type="button" class="mg-direction-card ${selected ? 'is-selected' : ''} ${current ? 'is-current' : ''}" data-wz-dir="${esc(n)}" aria-label="${esc(n)}" title="${esc(n)}" aria-pressed="${selected}">
          <span class="mg-direction-art">${icon(ic, n)}</span>
        </button>`;
      }).join('')}</div>
    </div>`;
    const rail = box.querySelector('.mg-direction-rail');
    if (rail && !directionsExpanded) rail.scrollLeft = prevLeft;

    // services of the current direction (inline checklist)
    const target = $('selectedDirections');
    if (target) {
      if (!cur) {
        target.innerHTML = '<div class="wz-hint-card"><b>Выберите направление</b><small>Затем отметьте нужные услуги — они сразу попадут в смету.</small></div>';
      } else {
        const cd = catalogDir(cur), services = cd?.services || [];
        const sd = s.directions.find(x => x.name === cur), items = sd ? sd.items : [];
        const known = new Set(services.map(x => x.name));
        const rows = services.map(x => row(x.name, x.unit, items.some(i => i.name === x.name)))
          .concat(items.filter(i => !known.has(i.name)).map(i => row(i.name, i.unit, true)));
        const picked = items.length, total = services.length + items.filter(i => !known.has(i.name)).length;
        target.innerHTML = `<div class="wz-sh"><div><b>${esc(cur)}</b><small>${esc(DESC[cur] || 'Отметьте нужные услуги')}</small></div>
            ${total ? `<button type="button" class="wz-link" data-wz-all>${picked === total ? 'Сбросить' : 'Выбрать все'}</button>` : ''}</div>
          <div class="wz-list">${rows.join('') || '<div class="wz-empty">Для этого направления пока нет услуг в каталоге. Добавьте свою ниже.</div>'}</div>
          <div class="wz-ai">${SPARK}<input id="wzQuick" type="text" placeholder="Напишите услугу как умеете" autocomplete="off" enterkeyhint="done"><button type="button" data-wz-quick>Добавить</button></div>
          ${(sd || s.pendingDirectionName) ? '<button type="button" class="wz-link wz-remove" data-direction-service-remove>Убрать направление</button>' : ''}`;
      }
    }
    const n = countServices(), dirs = s.directions.length;
    const sc = $('selectionCount');
    if (sc) sc.innerHTML = `<b>${n}</b><small>${plural(n, 'услуга', 'услуги', 'услуг')}</small>`;
    const label = $('directionSelectedLabel'), hint = $('directionSelectedHint');
    if (label) label.textContent = n ? `${n} ${plural(n, 'услуга', 'услуги', 'услуг')} · ${dirs} ${plural(dirs, 'направление', 'направления', 'направлений')}` : 'Ничего не выбрано';
    if (hint) hint.textContent = n ? 'Можно выбрать ещё направления' : 'Выберите хотя бы одну услугу';
    const btn = document.querySelector('#step1 .direction-continue');
    if (btn) { btn.classList.toggle('is-disabled', n === 0); btn.setAttribute('aria-disabled', n === 0 ? 'true' : 'false'); }
  }
  function row(name, unit, on) {
    return `<button type="button" class="wz-svc ${on ? 'on' : ''}" data-direction-service="${esc(name)}" data-direction-unit="${esc(unit)}" aria-pressed="${on}">
      <span class="wz-cb">${on ? '✓' : ''}</span><b>${esc(name)}</b><i>${esc(unit)}</i></button>`;
  }
  function pickDirection(name) {
    const s = state();
    const i = s.directions.findIndex(d => d.name === name);
    if (i >= 0) { s.activeDirection = i; s.pendingDirectionName = null; }
    else { s.pendingDirectionName = name; s.activeDirection = -1; }
    UI().renderCats();
    const row = document.querySelector('.wz-dirs'), el = row && row.querySelector('.wz-dir.cur');
    if (row && el) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }
  function selectAll() {
    const a = A(), s = a.state, cur = curDirName();
    if (!cur) return;
    const cd = catalogDir(cur), services = cd?.services || [];
    let d = s.directions.find(x => x.name === cur);
    const allOn = d && services.length && services.every(x => d.items.some(i => i.name === x.name));
    if (allOn) {
      d.items = d.items.filter(i => !services.some(x => x.name === i.name));
      if (!d.items.length) { s.directions.splice(s.directions.indexOf(d), 1); s.activeDirection = -1; s.pendingDirectionName = cur; }
    } else {
      if (!d) { d = { name: cur, items: [] }; s.directions.push(d); s.activeDirection = s.directions.length - 1; s.pendingDirectionName = null; }
      services.forEach(x => { if (!d.items.some(i => i.name === x.name)) d.items.push({ id: a.uid(), name: x.name, qty: 1, unit: x.unit || 'шт', price: 0 }); });
    }
    UI().renderCats();
  }
  function quickAdd() {
    const inp = $('wzQuick'), v = (inp?.value || '').trim();
    if (!v) { A().toast?.('Введите название услуги'); return; }
    const modalInput = $('directionServiceQuickInput'), btn = document.querySelector('[data-direction-service-quick-add]');
    if (!modalInput || !btn) { A().toast?.('Не удалось добавить услугу'); return; }
    modalInput.value = v;
    btn.click();
  }

  /* ───────────── Step 3 · positions ───────────── */
  let activeId = null, qtyStep = 1; const noteOpen = {};
  const UNITS = ['сотка', 'шт', 'м²', 'м.п.', 'м³', 'час', 'кг', 'компл.', 'рейс', 'га'];

  function priceHistory(name) {
    const a = A(); let list = [];
    try { list = (a.saved ? a.saved() : []) || []; } catch (_) { list = []; }
    try { list = list.concat((a.drafts ? a.drafts() : []) || []); } catch (_) {}
    const got = [];
    list.forEach((e, idx) => {
      const t = Date.parse(e.updatedAt || e.createdAt || '') || idx;
      (e.items || []).forEach(x => { if (x.name === name && num(x.price) > 0) got.push([t, num(x.price)]); });
    });
    got.sort((p, q) => q[0] - p[0]);
    const out = [];
    got.forEach(([, p]) => { if (!out.includes(p) && out.length < 3) out.push(p); });
    return out.sort((p, q) => p - q);
  }
  const sotWord = q => (Math.abs(q - Math.round(q)) < 1e-9 ? plural(Math.round(q), 'сотка', 'сотки', 'соток') : 'сотки');
  function unitHint(u, q) {
    if (u === 'сотка') return `1 сотка = 100 м²${q && q !== 1 ? ` · ${fmt(q)} ${sotWord(q)} = ${fmt(q * 100)} м²` : ''}`;
    if (u === 'м²') return `100 м² = 1 сотка${q && q !== 100 ? ` · ${fmt(q)} м² = ${fmt(q / 100)} ${sotWord(q / 100)}` : ''}`;
    if (u === 'га') return '1 га = 100 соток = 10 000 м²';
    return '';
  }
  const I = {
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5"/></svg>',
    calc: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 13h2M12 13h2M8 17h2M12 17h2M16 13v4"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'
  };

  function renderItems() {
    const a = A(), s = a.state;
    const arr = a.allItems();
    const cats = s.directions.filter(d => d.items.length).length;
    $('calcCount').textContent = `${arr.length} ${plural(arr.length, 'позиция', 'позиции', 'позиций')} · ${cats} ${plural(cats, 'категория', 'категории', 'категорий')}`;
    const box = $('items');
    if (!arr.length) {
      box.innerHTML = '<div class="empty calc-empty"><b>Расчёт пока пуст</b><div>Добавьте позицию кнопкой выше.</div></div>';
      $('total').textContent = '0.00 MDL';
      return;
    }
    if (!activeId || !findItem(activeId)) activeId = s.directions.find(d => d.items.length)?.items[0]?.id || null;
    const collapsed = window.__mgCalcCollapsed || {};
    const multi = s.directions.filter(d => d.items.length).length > 1;
    box.innerHTML = s.directions.map((d, di) => {
      if (!d.items.length) return '';
      const sub = d.items.reduce((t, x) => t + num(x.qty) * num(x.price), 0);
      const closed = collapsed[di] === true;
      return `<section class="wz-group ${closed ? 'is-collapsed' : ''}" data-calc-group="${di}">
        <button type="button" class="wz-ghead" data-calc-collapse="${di}" aria-expanded="${!closed}">
          <span class="wz-gt"><b>${esc(d.name)}</b><small>${d.items.length} ${plural(d.items.length, 'позиция', 'позиции', 'позиций')}</small></span>
          ${multi ? `<span class="wz-gs" data-wz-sub="${di}">${money(sub)} MDL</span>` : ''}<span class="wz-gc">${I.chev}</span></button>
        <div class="wz-gbody">${d.items.map(x => x.id === activeId ? card(x, d, di) : mini(x)).join('')}</div></section>`;
    }).join('');
    $('total').textContent = money(a.total()) + ' MDL';
    syncBar();
  }
  function mini(x) {
    return `<button type="button" class="wz-row" data-wz-open="${esc(x.id)}"><span class="wz-rn"><b>${esc(x.name)}</b><small>${fmt(x.qty)} ${esc(x.unit)} × ${money(x.price)}${x.note ? ' · ' + esc(x.note) : ''}</small></span><span class="wz-rs">${money(num(x.qty) * num(x.price))}</span></button>`;
  }
  function card(x, d, di) {
    const id = esc(x.id), hist = priceHistory(x.name);
    const units = UNITS.includes(x.unit) ? UNITS : [x.unit].concat(UNITS);
    const hint = unitHint(x.unit, num(x.qty));
    const idx = d.items.indexOf(x);
    return `<article class="wz-card" data-wz-card="${id}">
      <div class="wz-ct"><b>${esc(x.name)}</b><span data-line-total="${id}">${money(num(x.qty) * num(x.price))} MDL</span></div>
      <div class="wz-lb"><span>Единица измерения</span><em>${esc(x.unit)}</em></div>
      <div class="wz-units">${units.map(u => `<button type="button" class="${u === x.unit ? 'on' : ''}" data-wz-unit="${id}" data-v="${esc(u)}">${esc(u)}</button>`).join('')}</div>
      ${hint ? `<div class="wz-hint" data-wz-hint="${id}">⇄ ${esc(hint)}</div>` : ''}
      <div class="wz-two">
        <div><div class="wz-lb"><span>Количество</span><button type="button" class="wz-calcb" data-wz-calc="${id}">${I.calc}Размеры</button></div>
          <div class="wz-qty"><button type="button" data-wz-dec="${id}" aria-label="Меньше">−</button><input data-qty="${id}" type="number" inputmode="decimal" min="0" step="any" value="${x.qty}" autocomplete="off"><button type="button" class="p" data-wz-inc="${id}" aria-label="Больше">＋</button></div>
          <div class="wz-steps" role="group" aria-label="Шаг">${[0.1, 1, 10].map(v => `<button type="button" class="${v === qtyStep ? 'on' : ''}" data-wz-step="${v}">${String(v).replace('.', ',')}</button>`).join('')}</div></div>
        <div><div class="wz-lb"><span>Цена за ед.</span></div>
          <div class="wz-price"><input data-price="${id}" type="number" inputmode="decimal" min="0" step="any" value="${x.price}" autocomplete="off"><span>MDL</span></div>
          <div class="wz-hist">${hist.length ? hist.map(p => `<button type="button" data-wz-price="${id}" data-v="${p}">${money(p).replace('.00', '')}</button>`).join('') : '<small>Цены появятся из прошлых смет</small>'}</div></div>
      </div>
      ${(x.note || noteOpen[x.id]) ? `<div class="wz-lb"><span>Примечание</span></div>
      <input class="wz-note" data-wz-note="${id}" type="text" maxlength="140" placeholder="Например: с вывозом мусора" value="${esc(x.note || '')}" autocomplete="off">` : `<button type="button" class="wz-addnote" data-wz-notebtn="${id}">＋ Примечание</button>`}
      <div class="wz-acts">
        <button type="button" data-wz-up="${id}" aria-label="Выше" ${idx === 0 ? 'disabled' : ''}>${I.up}</button>
        <button type="button" data-wz-down="${id}" aria-label="Ниже" ${idx === d.items.length - 1 ? 'disabled' : ''}>${I.down}</button>
        <button type="button" class="del" data-delete="${id}" aria-label="Удалить услугу">${I.del}</button>
        <div class="wz-formula"><small data-wz-formula="${id}">${fmt(x.qty)} × ${money(x.price).replace('.00', '')}</small></div>
      </div></article>`;
  }
  function refreshLine(x) {
    const f = document.querySelector(`[data-wz-formula="${CSS.escape(x.id)}"]`);
    if (f) f.textContent = `${fmt(x.qty)} × ${money(x.price).replace('.00', '')}`;
    const h = document.querySelector(`[data-wz-hint="${CSS.escape(x.id)}"]`);
    if (h) h.textContent = '⇄ ' + unitHint(x.unit, num(x.qty));
    state().directions.forEach((d, di) => {
      const el = document.querySelector(`[data-wz-sub="${di}"]`);
      if (el) el.textContent = money(d.items.reduce((t, i) => t + num(i.qty) * num(i.price), 0)) + ' MDL';
    });
  }
  function syncBar() {
    const nav = document.querySelector('#step3 .calc-nav-actions');
    if (!nav) return;
    let b = nav.querySelector('.wz-bar-total');
    if (!b) { b = document.createElement('div'); b.className = 'wz-bar-total'; b.innerHTML = '<small>Итого</small><b id="wzBarTotal"></b>'; nav.insertBefore(b, nav.children[1] || null); }
    const t = $('total');
    const el = b.querySelector('#wzBarTotal');
    if (t && el) el.textContent = t.textContent;
  }

  /* ───────────── Dimension calculator ───────────── */
  const calc = { id: null, mode: 'area', shape: 'rect', v: { a: '', b: '', c: '' }, plots: [], deductions: [], dv: { h: '', w: '' }, out: 'сотка' };
  const SHAPES = { rect: [['a', 'Длина', 'м'], ['b', 'Ширина', 'м']], circle: [['a', 'Диаметр', 'м']], tri: [['a', 'Основание', 'м'], ['b', 'Высота', 'м']] };
  function plotValue() {
    const a = num(calc.v.a), b = num(calc.v.b), c = num(calc.v.c);
    if (calc.mode === 'area') return calc.shape === 'circle' ? Math.PI * a * a / 4 : calc.shape === 'tri' ? a * b / 2 : a * b;
    if (calc.mode === 'volume') return a * b * c;
    return a;
  }
  function deductionValue() { return num(calc.dv.h) * num(calc.dv.w); }
  function deductionLabel() { return `${fmt(calc.dv.h)} × ${fmt(calc.dv.w)}`; }
  function plotLabel() {
    const a = fmt(calc.v.a), b = fmt(calc.v.b), c = fmt(calc.v.c);
    if (calc.mode === 'area') return calc.shape === 'circle' ? `⌀ ${a}` : calc.shape === 'tri' ? `${a} × ${b} ÷ 2` : `${a} × ${b}`;
    if (calc.mode === 'volume') return `${a} × ${b} × ${c}`;
    return `${a} м`;
  }
  const baseUnit = () => calc.mode === 'area' ? 'м²' : calc.mode === 'volume' ? 'м³' : 'м.п.';
  const outUnits = () => calc.mode === 'area' ? ['м²', 'сотка', 'га'] : [baseUnit()];
  function convert(total, u) { return u === 'сотка' ? total / 100 : u === 'га' ? total / 10000 : total; }
  function ensureSheet() {
    let el = $('wzCalc');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'wzCalc'; el.className = 'wz-sheet-wrap'; el.hidden = true;
    document.body.appendChild(el);
    return el;
  }
  function openCalc(id) {
    const f = findItem(id); if (!f) return;
    calc.id = id; calc.plots = []; calc.deductions = []; calc.dv = { h: '', w: '' }; calc.v = { a: '', b: '', c: '' }; calc.shape = 'rect';
    const u = f.x.unit;
    calc.mode = u === 'м³' ? 'volume' : (u === 'м.п.' || u === 'м') ? 'length' : 'area';
    calc.out = u === 'сотка' ? 'сотка' : u === 'га' ? 'га' : baseUnit();
    renderCalc();
    const el = ensureSheet(); el.hidden = false; requestAnimationFrame(() => el.classList.add('open'));
  }
  function closeCalc() { const el = $('wzCalc'); if (!el) return; el.classList.remove('open'); setTimeout(() => { el.hidden = true; }, 180); }
  function totals() {
    const live = plotValue();
    const gross = calc.plots.reduce((t, p) => t + p.value, 0) + (live > 0 ? live : 0);
    const liveDeduct = calc.mode === 'area' ? deductionValue() : 0;
    const deduction = calc.mode === 'area' ? calc.deductions.reduce((t, p) => t + p.value, 0) + (liveDeduct > 0 ? liveDeduct : 0) : 0;
    const sum = Math.max(0, gross - deduction);
    return { sum, live, gross, deduction, liveDeduct };
  }
  function renderCalc() {
    const el = ensureSheet(), f = findItem(calc.id); if (!f) return;
    if (!outUnits().includes(calc.out)) calc.out = outUnits()[0];
    const fields = calc.mode === 'area' ? SHAPES[calc.shape] : calc.mode === 'volume' ? [['a', 'Длина', 'м'], ['b', 'Ширина', 'м'], ['c', 'Высота', 'м']] : [['a', 'Длина', 'м']];
    const { sum, live, gross, deduction, liveDeduct } = totals();
    const res = convert(sum, calc.out);
    el.innerHTML = `<div class="wz-over" data-wz-cclose></div><div class="wz-sheet" role="dialog" aria-modal="true" aria-label="Калькулятор размеров">
      <div class="wz-grab"></div>
      <div class="wz-sht"><div><b>Калькулятор размеров</b></div><button type="button" class="wz-x" data-wz-cclose aria-label="Закрыть">✕</button></div>
      <div class="wz-seg">${[['area', 'Площадь'], ['volume', 'Объём'], ['length', 'Длина']].map(([k, t]) => `<button type="button" class="${calc.mode === k ? 'on' : ''}" data-wz-cmode="${k}">${t}</button>`).join('')}</div>
      ${calc.mode === 'area' ? `<div class="wz-shapes">${[['rect', '▭ Прямоуг.'], ['circle', '◯ Круг'], ['tri', '△ Треуг.']].map(([k, t]) => `<button type="button" class="${calc.shape === k ? 'on' : ''}" data-wz-cshape="${k}">${t}</button>`).join('')}</div>` : ''}
      <div class="wz-dims" style="--n:${fields.length}">${fields.map(([k, t, u]) => `<label class="wz-dim"><small>${t}</small><span><input data-wz-cin="${k}" type="number" inputmode="decimal" min="0" step="any" value="${esc(calc.v[k])}" placeholder="0" autocomplete="off"><em>${u}</em></span></label>`).join('')}</div>
      <div class="wz-plots">${calc.plots.map((p, i) => `<div><b>Участок ${i + 1}</b><span>${esc(p.label)}</span><i>${fmt(p.value)} ${baseUnit()}</i><button type="button" data-wz-cdel="${i}" aria-label="Убрать">×</button></div>`).join('')}
        ${live > 0 ? `<div class="live"><b>Участок ${calc.plots.length + 1}</b><span>${esc(plotLabel())}</span><i data-wz-live>${fmt(live)} ${baseUnit()}</i></div>` : ''}
        <button type="button" class="add" data-wz-cadd ${live > 0 ? '' : 'disabled'}>＋ Добавить ещё участок</button></div>
      ${calc.mode === 'area' ? `<section class="wz-deduct" aria-label="Вычеты из площади">
        <div class="wz-deduct-head"><b>Вычеты из площади</b></div>
        <div class="wz-deduct-fields">
          <label class="wz-dim"><small>Высота</small><span><input data-wz-cdh type="number" inputmode="decimal" min="0" step="any" value="${esc(calc.dv.h)}" placeholder="0" autocomplete="off"><em>м</em></span></label>
          <label class="wz-dim"><small>Ширина</small><span><input data-wz-cdw type="number" inputmode="decimal" min="0" step="any" value="${esc(calc.dv.w)}" placeholder="0" autocomplete="off"><em>м</em></span></label>
        </div>
        <div class="wz-deduct-list">${calc.deductions.map((p, i) => `<div><b>Вычет ${i + 1}</b><span>${esc(p.label)}</span><i>${fmt(p.value)} м²</i><button type="button" data-wz-cddel="${i}" aria-label="Убрать вычет">×</button></div>`).join('')}
          ${liveDeduct > 0 ? `<div class="live"><b>Новый вычет</b><span>${esc(deductionLabel())}</span><i data-wz-cdlive>${fmt(liveDeduct)} м²</i></div>` : ''}
        </div>
        <button type="button" class="wz-deduct-add" data-wz-cdadd ${liveDeduct > 0 ? '' : 'disabled'}>＋ Добавить ещё вычет</button>
      </section>` : ''}
      <div class="wz-res"><div><small>${calc.mode === 'area' ? 'Чистая площадь' : 'Всего'}</small><b data-wz-cres>${fmt(res)}<em>${esc(unitLabel(calc.out, res))}</em></b></div>
        ${outUnits().length > 1 ? `<div class="wz-seg sm">${outUnits().map(u => `<button type="button" class="${calc.out === u ? 'on' : ''}" data-wz-cout="${u}">${u}</button>`).join('')}</div>` : ''}</div>
      <button type="button" class="wz-go" data-wz-capply ${sum > 0 ? '' : 'disabled'}>Подставить ${fmt(res)} ${esc(unitLabel(calc.out, res))} →</button></div>`;
  }
  function rerenderKeepFocus() {
    const act = document.activeElement, ds = act && act.dataset;
    const focusKey = ds && (ds.wzCin !== undefined ? ['in', ds.wzCin] : ds.wzCdh !== undefined ? ['dh', ''] : ds.wzCdw !== undefined ? ['dw', ''] : null);
    renderCalc();
    if (focusKey) { const n = document.querySelector(focusKey[0] === 'in' ? `[data-wz-cin="${focusKey[1]}"]` : focusKey[0] === 'dh' ? '[data-wz-cdh]' : '[data-wz-cdw]'); if (n) n.focus(); }
  }
  const unitLabel = (u, v) => (u === 'сотка' ? sotWord(v) : u);
  function updateCalcLive() {
    const el = $('wzCalc'); if (!el || el.hidden) return;
    if ((plotValue() > 0) !== !!el.querySelector('.wz-plots .live')) { rerenderKeepFocus(); return; }
    const { sum, gross, deduction, liveDeduct } = totals(), res = convert(sum, calc.out);
    const r = el.querySelector('[data-wz-cres]'); if (r) r.innerHTML = `${fmt(res)}<em>${esc(unitLabel(calc.out, res))}</em>`;
    const live = el.querySelector('[data-wz-live]'); if (live) live.textContent = `${fmt(plotValue())} ${baseUnit()}`;
    const liveD = el.querySelector('[data-wz-cdlive]'); if (liveD) liveD.textContent = `${fmt(liveDeduct)} м²`;
    const go = el.querySelector('[data-wz-capply]'); if (go) { go.disabled = !(sum > 0); go.textContent = `Подставить ${fmt(res)} ${unitLabel(calc.out, res)} →`; }
    const add = el.querySelector('[data-wz-cadd]'); if (add) add.disabled = !(plotValue() > 0);
    const addD = el.querySelector('[data-wz-cdadd]'); if (addD) addD.disabled = !(liveDeduct > 0);
    if (calc.mode === 'area' && (liveDeduct > 0) !== !!el.querySelector('.wz-deduct-list .live')) rerenderKeepFocus();
  }
  function applyCalc() {
    const f = findItem(calc.id); if (!f) return closeCalc();
    const { sum, gross, deduction, liveDeduct } = totals(); if (!(sum > 0)) return;
    const live = plotValue();
    const parts = calc.plots.map(p => p.label).concat(live > 0 ? [plotLabel()] : []);
    f.x.qty = Math.round(convert(sum, calc.out) * 100) / 100;
    f.x.unit = calc.out;
    if (calc.mode === 'area') {
      const cuts = calc.deductions.map(p => p.label).concat(liveDeduct > 0 ? [deductionLabel()] : []);
      f.x.measure = `Замеры: ${parts.join(' + ')}; общая площадь: ${fmt(gross)} м²; вычеты: ${fmt(deduction)} м²${cuts.length ? ` (${cuts.join(' + ')})` : ''}; чистая площадь: ${fmt(sum)} м²`;
    } else {
      f.x.measure = `${parts.join(' + ')} = ${fmt(sum)} ${baseUnit()}`;
    }
    closeCalc();
    UI().renderItems();
  }

  /* ───────────── Step 5 · receipt ───────────── */
  const C39 = { '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100', A: '100001001', B: '001001001', C: '101001000', D: '000011001', E: '100011000', F: '001011000', G: '000001101', H: '100001100', I: '001001100', J: '000011100', K: '100000011', L: '001000011', M: '101000010', N: '000010011', O: '100010010', P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110', U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000', Z: '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100' };
  function barcode(text) {
    const t = ('*' + String(text).toUpperCase().replace(/[^0-9A-Z\-. ]/g, '') + '*').split('');
    let x = 0, rects = '';
    t.forEach((ch, ci) => {
      const p = C39[ch]; if (!p) return;
      for (let i = 0; i < 9; i++) {
        const w = p[i] === '1' ? 3 : 1;
        if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="40"/>`;
        x += w;
      }
      if (ci < t.length - 1) x += 1;
    });
    return `<svg class="wz-bc" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-label="Штрихкод ${esc(text)}" role="img">${rects}</svg>`;
  }
  function estimateNumber() {
    const s = state();
    if (s.estimate?.number) return s.estimate.number;
    try {
      const key = window.__mgAccountStorageKey ? window.__mgAccountStorageKey('mg_counter') : 'mg_counter';
      return 'MG-' + String((Number(localStorage.getItem(key) || 0) + 1)).padStart(4, '0');
    } catch (_) { return 'MG-0001'; }
  }
  function renderReview() {
    const a = A(), c = a.contactData(), s = a.state;
    const number = estimateNumber();
    const date = new Date().toLocaleDateString('ru-RU');
    const brand = (document.querySelector('.brand b')?.textContent || 'Master Group').trim();
    const kv = (k, v) => `<div class="kv"><span>${k}</span><span>${esc(v || '—')}</span></div>`;
    let positions = 0, units = 0;
    const groups = s.directions.filter(d => d.items.length).map(d => {
      const lines = d.items.map(x => {
        positions++; units += num(x.qty);
        const sub = [`${fmt(x.qty)} ${esc(x.unit)} × ${money(x.price)}`];
        return `<div class="ln"><b>${esc(x.name)}</b><span class="d"></span><b>${money(num(x.qty) * num(x.price))}</b></div>
          <span class="sb">${sub.join('')}${x.measure ? ' · ' + esc(x.measure) : ''}</span>${x.note ? `<span class="sb nt">${esc(x.note)}</span>` : ''}`;
      }).join('');
      return `<div class="cat">${icon(dirIcon(d), d.name)}<span>${esc(d.name).toUpperCase()}</span></div>${lines}`;
    }).join('');
    $('review').innerHTML = `<div class="wz-paper">
      <div class="wz-pbrand"><i>MG</i><b>${esc(brand).toUpperCase()}</b></div>
      <div class="wz-meta">СМЕТА № ${esc(number)} · ${date}</div><div class="wz-stamp">ПРЕДПРОСМОТР</div>
      <hr>${kv('Клиент', c.client)}${kv('Телефон', c.phone)}${kv('Адрес', c.address)}<hr>
      ${groups}
      <div class="cnts"><span>ПОЗИЦИЙ: ${positions}</span><span>ВСЕГО ЕД.: ${fmt(units)}</span></div>
      <hr class="solid"><div class="tt"><span>ИТОГО</span><b>${money(a.total())}<small>MDL</small></b></div>
      <div class="sig"><div>ИСПОЛНИТЕЛЬ</div><div>КЛИЕНТ</div></div>
      ${barcode(number)}<div class="bn">${esc(number)} · ${esc(brand).toUpperCase()}</div></div>`;
  }

  /* ───────────── recent clients (step 4) ───────────── */
  function recentClients() {
    let list = [];
    try { list = ((A().saved && A().saved()) || []).concat((A().drafts && A().drafts()) || []); } catch (_) { list = []; }
    const seen = new Set(), out = [];
    list.map((e, i) => [Date.parse(e.updatedAt || e.createdAt || '') || i, e]).sort((p, q) => q[0] - p[0]).forEach(([, e]) => {
      const name = String(e.client || '').trim(), key = name.toLowerCase();
      if (!name || seen.has(key) || out.length >= 4) return;
      seen.add(key); out.push({ client: name, phone: e.phone || '', address: e.address || e.object || '' });
    });
    return out;
  }
  let recentCache = [];
  function renderRecent() {
    const host = $('step4'); if (!host || host.hidden) return;
    const fields = host.querySelector('.contact-fields-v2'); if (!fields) return;
    let box = host.querySelector('.wz-recent');
    recentCache = recentClients();
    if (!recentCache.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'wz-recent'; fields.parentNode.insertBefore(box, fields); }
    const ini = n => n.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    box.innerHTML = '<small>Недавние клиенты</small><div>' + recentCache.map((c, i) => `<button type="button" data-wz-client="${i}"><i>${esc(ini(c.client))}</i>${esc(c.client)}</button>`).join('') + '</div>';
  }

  /* ───────────── Step bar ───────────── */
  const STEP_NAMES = ['Направления', 'Позиции', 'Клиент', 'Проверка'];
  function currentStepIndex() {
    const map = [['step1', 1], ['step3', 2], ['step4', 3], ['step5', 4]];
    for (const [id, n] of map) { const el = $(id); if (el && !el.hidden) return n; }
    return 1;
  }
  function renderStepbar() {
    const bar = $('stepbar'); if (!bar) return;
    const cur = currentStepIndex();
    const html = '<div class="wz-chips">' + STEP_NAMES.map((n, i) => {
      const k = i + 1, cls = k === cur ? 'on' : k < cur ? 'done' : '';
      const attrs = k < cur ? ` data-action="step${k}" role="button" tabindex="0"` : '';
      return `<div class="wz-chip ${cls}"${attrs}><b>${k < cur ? '✓' : k}</b><span>${n}</span></div>`;
    }).join('') + '</div>';
    if (bar.innerHTML !== html) bar.innerHTML = html;
    renderRecent();
  }

  /* ───────────── events ───────────── */
  // The step-one remove control belongs to the current inline wizard only.
  // Intercept it in capture phase so legacy service-picker/editor handlers cannot
  // reopen the retired direction interface after a direction is removed.
  document.addEventListener('click', e => {
    const remove = e.target && e.target.closest && e.target.closest('#step1 [data-direction-service-remove]');
    if (!remove) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const app = A(), state = app && app.state;
    if (!state) return;
    if (state.pendingDirectionName) {
      state.pendingDirectionName = null;
    } else {
      const index = Number(state.activeDirection);
      if (Number.isInteger(index) && index >= 0 && state.directions[index]) {
        state.directions.splice(index, 1);
      }
    }
    state.activeDirection = state.directions.length
      ? Math.max(0, Math.min(Number(state.activeDirection) || 0, state.directions.length - 1))
      : -1;
    // Keep the retired modal closed; this action is handled entirely in step one.
    const legacyOverlay = $('directionServiceOverlay');
    if (legacyOverlay) {
      legacyOverlay.classList.remove('open');
      legacyOverlay.hidden = true;
    }
    try { UI().renderCats(); UI().renderItems(); } catch (err) { console.warn('MG step-one direction removal failed', err); }
    return;
  }, true);
  document.addEventListener('click', e => {
    const t = e.target;
    const toggleDirections = t.closest('[data-wz-directions-toggle]');
    if (toggleDirections) {
      e.preventDefault();
      directionsExpanded = !directionsExpanded;
      UI().renderCats();
      return;
    }
    const dir = t.closest('[data-wz-dir]');
    if (dir) {
      const name = dir.dataset.wzDir;
      directionsExpanded = false;
      pickDirection(name);
      const rail = document.querySelector('#step1 .mg-direction-rail');
      const selectedCard = rail && Array.from(rail.querySelectorAll('[data-wz-dir]')).find(x => x.dataset.wzDir === name);
      if (rail && selectedCard) rail.scrollTo({ left: Math.max(0, selectedCard.offsetLeft - 2), behavior: 'smooth' });
      return;
    }
    const rc = t.closest('[data-wz-client]');
    if (rc) { const c = recentCache[Number(rc.dataset.wzClient)]; if (c) { [['client', c.client], ['phone', c.phone], ['address', c.address]].forEach(([id, v]) => { const el = $(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }); } return; }
    if (t.closest('[data-wz-all]')) { selectAll(); return; }
    if (t.closest('[data-wz-quick]')) { quickAdd(); return; }
    const open = t.closest('[data-wz-open]');
    if (open) { activeId = open.dataset.wzOpen; UI().renderItems(); return; }
    const un = t.closest('[data-wz-unit]');
    if (un) { const f = findItem(un.dataset.wzUnit); if (f) { f.x.unit = un.dataset.v; UI().renderItems(); } return; }
    const st = t.closest('[data-wz-step]');
    if (st) { qtyStep = num(st.dataset.wzStep) || 1; document.querySelectorAll('[data-wz-step]').forEach(b => b.classList.toggle('on', b === st)); return; }
    const dec = t.closest('[data-wz-dec]'), inc = t.closest('[data-wz-inc]');
    if (dec || inc) {
      const f = findItem((dec || inc).dataset.wzDec || (dec || inc).dataset.wzInc);
      if (f) {
        const next = Math.round((num(f.x.qty) + (inc ? qtyStep : -qtyStep)) * 100) / 100;
        f.x.qty = Math.max(0, next);
        UI().renderItems();
      }
      return;
    }
    const pr = t.closest('[data-wz-price]');
    if (pr) { const f = findItem(pr.dataset.wzPrice); if (f) { f.x.price = num(pr.dataset.v); UI().renderItems(); } return; }
    const up = t.closest('[data-wz-up]'), down = t.closest('[data-wz-down]');
    if (up || down) {
      const id = (up || down).dataset.wzUp || (up || down).dataset.wzDown, f = findItem(id);
      if (f) { const arr = f.d.items, i = arr.indexOf(f.x), j = up ? i - 1 : i + 1; if (j >= 0 && j < arr.length) { arr.splice(i, 1); arr.splice(j, 0, f.x); UI().renderItems(); } }
      return;
    }
    const nb = t.closest('[data-wz-notebtn]');
    if (nb) { noteOpen[nb.dataset.wzNotebtn] = true; UI().renderItems(); const inp = document.querySelector('.wz-note'); if (inp) inp.focus(); return; }
    const cb = t.closest('[data-wz-calc]');
    if (cb) { openCalc(cb.dataset.wzCalc); return; }
    if (t.closest('[data-wz-cclose]')) { closeCalc(); return; }
    const cm = t.closest('[data-wz-cmode]');
    if (cm) { calc.mode = cm.dataset.wzCmode; calc.v = { a: '', b: '', c: '' }; calc.plots = []; calc.deductions = []; calc.dv = { h: '', w: '' }; renderCalc(); return; }
    const cs = t.closest('[data-wz-cshape]');
    if (cs) { calc.shape = cs.dataset.wzCshape; calc.v = { a: '', b: '', c: '' }; renderCalc(); return; }
    if (t.closest('[data-wz-cadd]')) { const v = plotValue(); if (v > 0) { calc.plots.push({ value: v, label: plotLabel() }); calc.v = { a: '', b: '', c: '' }; renderCalc(); } return; }
    const cd = t.closest('[data-wz-cdel]');
    if (cd) { calc.plots.splice(Number(cd.dataset.wzCdel), 1); renderCalc(); return; }
    if (t.closest('[data-wz-cdadd]')) { const v = deductionValue(); if (calc.mode === 'area' && v > 0) { calc.deductions.push({ value: v, label: deductionLabel() }); calc.dv = { h: '', w: '' }; renderCalc(); } return; }
    const cdd = t.closest('[data-wz-cddel]');
    if (cdd) { calc.deductions.splice(Number(cdd.dataset.wzCddel), 1); renderCalc(); return; }
    const co = t.closest('[data-wz-cout]');
    if (co) { calc.out = co.dataset.wzCout; renderCalc(); return; }
    if (t.closest('[data-wz-capply]')) { applyCalc(); return; }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.qty || el.dataset.price) {
      const f = findItem(el.dataset.qty || el.dataset.price);
      // estimate-core's own input handler already stored the value; here we only refresh the extra labels
      setTimeout(() => { if (f) refreshLine(f.x); syncBar(); }, 0);
    }
    if (el.dataset.wzNote !== undefined) { const f = findItem(el.dataset.wzNote); if (f) { const v = el.value.trim(); if (v) f.x.note = v; else delete f.x.note; } }
    if (el.dataset.wzCin) { calc.v[el.dataset.wzCin] = el.value; updateCalcLive(); }
    if (el.dataset.wzCdh !== undefined) { calc.dv.h = el.value; updateCalcLive(); }
    if (el.dataset.wzCdw !== undefined) { calc.dv.w = el.value; updateCalcLive(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && directionsExpanded) {
      directionsExpanded = false;
      UI().renderCats();
      const toggle = document.querySelector('#step1 [data-wz-directions-toggle]');
      if (toggle) toggle.focus();
      return;
    }
    if (e.key === 'Escape' && $('wzCalc') && !$('wzCalc').hidden) closeCalc();
    if (e.key === 'Enter' && e.target.id === 'wzQuick') { e.preventDefault(); quickAdd(); }
  });

  /* ───────────── install ───────────── */
  function install() {
    const ui = UI();
    if (!ui || !A().state) return false;
    ui.renderCats = renderCats;
    ui.renderItems = renderItems;
    ui.renderReview = renderReview;
    const ed = $('editor');
    if (ed) ed.classList.add('wz518');
    renderStepbar();
    const mo = new MutationObserver(() => renderStepbar());
    ['step1', 'step3', 'step4', 'step5'].forEach(id => { const el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] }); });
    const bar = $('stepbar'); if (bar) new MutationObserver(() => { if (!bar.querySelector('.wz-chips')) renderStepbar(); }).observe(bar, { childList: true });
    const total = $('total'); if (total) new MutationObserver(syncBar).observe(total, { childList: true, characterData: true, subtree: true });
    try { ui.renderCats(); } catch (err) { console.warn('MG v518 initial render failed', err); }
    return true;
  }
  if (!install()) window.addEventListener('load', install);
  window.MGWizard518 = { renderCats, renderItems, renderReview, openCalc, barcode, icons: IC };
})();
