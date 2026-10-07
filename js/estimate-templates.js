(() => {
  const KEY = 'master_group_estimate_template_v2';
  const allowed = ['template1','template2','template3','template4','template5'];
  const legacy = {
    '1':'template1','2':'template2','3':'template3','4':'template4','5':'template5',
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
