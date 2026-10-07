(() => {
  const KEY = 'master_group_estimate_template_v2';
  const allowed = Array.from({length:10},(_,i)=>`template${i+1}`);
  const designs = [
    ['Чистый лист','Сдержанная классика с тонкими линиями'],['Графитовая линия','Контрастная шапка и ясная сетка'],['Компактный блок','Плотная таблица с лёгкими акцентами'],['Реестровая','Строгая ведомость с ровными колонками'],['Спокойный контур','Минималистичный контур и свободные поля'],
    ['По разделам','Работы сгруппированы с итогами по разделам'],['Направления работ','Направление выделено перед каждой группой'],['Расчётная ведомость','Акцент на количестве, цене и сумме'],['Детальная таблица','Полная таблица с тонкой сеткой'],['Смета с подытогами','Разделы и промежуточные итоги']
  ];
  const legacy = {
    ...Object.fromEntries(allowed.map((id,i)=>[String(i+1),id])),
    'neo':'template1','corporate':'template2','minimal':'template3','premium':'template4','accent':'template5',
    'classic':'template1','strict':'template3','compact':'template4','business':'template3','modern':'template2','elegant':'template4','bordered':'template3','detailed':'template5'
  };
  const normalize = value => {
    const v = String(value ?? '').trim().toLowerCase();
    return allowed.includes(v) ? v : (legacy[v] || null);
  };
  const get = () => {
    try {
      return normalize(localStorage.getItem(KEY)) || normalize(localStorage.getItem('master_group_estimate_template_v1')) || 'template1';
    } catch (_) { return 'template1'; }
  };
  const resolveForEstimate = (estimate) => {
    try {
      const selected = normalize(localStorage.getItem(KEY)) || normalize(localStorage.getItem('master_group_estimate_template_v1'));
      if (selected) return selected;
    } catch (_) {}
    return normalize(estimate?.template) || 'template1';
  };
  const set = (value) => {
    const v = normalize(value) || 'template1';
    try {
      localStorage.setItem(KEY, v);
      localStorage.removeItem('master_group_estimate_template_v1');
    } catch (_) {}
    render(v);
    try {
      const app=window.MGAppCore;
      const current=app?.state?.estimate;
      if(current){
        const updated={...current,template:v};
        app.state.estimate=updated;
        if(current.id && typeof app.saved==='function' && typeof app.persist==='function'){
          const list=app.saved();
          const i=list.findIndex(x=>String(x?.id)===String(current.id));
          if(i>=0){
            list[i]={...list[i],template:v};
            app.persist(list);
            try { if (typeof window.__mgCloudSaveEstimate === 'function') window.__mgCloudSaveEstimate(updated); } catch (_) {}
          }
        }
      }
    } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('mg-estimate-template-changed', { detail: { template: v } })); } catch (_) {}
    return v;
  };
  const render = (value = get()) => {
    const list=document.getElementById('estimateTemplateList');
    if(list&&!list.dataset.generated){
      const sample=[['1','Металлоконструкции','Изготовление рамы','шт','5 000','1','5 000'],['2','Монтажные работы','Монтаж конструкции','шт','1 000','1','1 000'],['3','Сварочные работы','Сварка элементов','час','250','12','3 000'],['4','Покраска','Антикоррозийная обработка','м²','120','15','1 800']];
      list.innerHTML=designs.map(([name,desc],i)=>{const id=allowed[i], grouped=[5,6,9].includes(i), rows=sample.map(r=>`<tr>${grouped&&i!==6?`<td>${r[0]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[5]}</td><td>${r[4]}</td><td>${r[6]}</td>`:`<td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td>`}</tr>`).join('');return `<article class="estimate-template-card" data-estimate-template="${id}"><div class="estimate-template-card-head"><div><span class="estimate-template-number">${String(i+1).padStart(2,'0')}</span><div><b>${name}</b><small>${desc}</small></div></div><button type="button" class="estimate-template-select" data-select-estimate-template="${id}">Выбрать</button></div><div class="estimate-template-preview"><div class="new-tpl-page ${id}"><div class="tpl-head"><span>СМЕТА № MG-0035</span><b>MASTER GROUP</b></div><div class="tpl-client"><b>КЛИЕНТ</b><span>Иван Иванов</span><small>+373 XX XXX XXX · Кишинёв, ул. Лесная 10</small></div><table><thead><tr>${(grouped&&i!==6?['№','Услуга / работа','Ед.','Кол-во','Цена','Сумма']:['№','Направление','Услуга / работа','Ед.','Цена','Кол-во','Сумма']).map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="tpl-total"><span>ИТОГО:</span><b>10 800</b></div></div></div></article>`}).join('');
      list.dataset.generated='true';
      const dots=document.getElementById('estimateTemplateDots');if(dots)dots.innerHTML=allowed.map((_,i)=>`<button type="button" data-template-dot="${i}" aria-label="Шаблон ${i+1}"></button>`).join('');
    }
    document.querySelectorAll('[data-estimate-template]').forEach(card => {
      const active = card.dataset.estimateTemplate === value;
      card.classList.toggle('is-selected', active);
      const button = card.querySelector('[data-select-estimate-template]');
      if (button) {
        button.textContent = active ? 'Выбран' : 'Выбрать';
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    });
  };
  const openSettings = () => {
    const button = document.querySelector('[data-settings-tab="estimates"]');
    if (button) button.click();
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-estimate-template]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    set(button.dataset.selectEstimateTemplate);
    const name = button.closest('[data-estimate-template]')?.querySelector('.estimate-template-card-head b')?.textContent || 'Шаблон';
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `Выбран шаблон: ${name}`;
      toast.classList.add('show');
      clearTimeout(window.__mgTemplateToastTimer);
      window.__mgTemplateToastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }
  }, true);
  window.MGEstimateTemplates = { KEY, get, set, render, openSettings, resolveForEstimate, allowed: allowed.slice() };
  render();
})();
window.addEventListener('mg-estimate-template-changed', () => {
  try {
    const core = window.MGAppCore;
    const e = core?.state?.estimate;
    if (e && core?.state?.screen === 'documentScreen' && typeof core.documentBody === 'function') core.documentBody(e);
  } catch (err) { console.warn('MG template refresh failed', err); }
});
(() => {
  const list = document.getElementById('estimateTemplateList');
  const dots = Array.from(document.querySelectorAll('#estimateTemplateDots [data-template-dot]'));
  if (!list || !dots.length) return;
  const cards = Array.from(list.querySelectorAll('.estimate-template-card'));
  const setDot = (index) => dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  const nearestIndex = () => {
    if (!cards.length) return 0;
    const left = list.scrollLeft + list.offsetLeft;
    let best=0,distance=Infinity;
    cards.forEach((card,i)=>{const d=Math.abs(card.offsetLeft-left);if(d<distance){distance=d;best=i;}});
    return best;
  };
  const goToCard = (index, smooth=true) => {
    const i=Math.max(0,Math.min(cards.length-1,Number(index)||0)), card=cards[i];
    if(!card)return;
    list.scrollTo({left:Math.max(0,card.offsetLeft-list.offsetLeft),behavior:smooth?'smooth':'auto'});
    setDot(i);
  };
  dots.forEach(dot=>dot.addEventListener('click',()=>goToCard(dot.dataset.templateDot,true)));
  let timer;
  list.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>setDot(nearestIndex()),40);},{passive:true});
  setDot(nearestIndex());
})();
