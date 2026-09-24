(() => {
  const KEY = 'master_group_estimate_template_v1';
  const allowed = ['neo','corporate','minimal','premium','accent'];
  const legacy = {
    '1':'neo','2':'corporate','3':'minimal','4':'premium','5':'accent',
    '6':'neo','7':'premium','8':'corporate','9':'accent','10':'premium',
    'classic':'neo','strict':'corporate','compact':'premium','business':'corporate','modern':'neo','elegant':'premium','bordered':'corporate','detailed':'premium'
  };
  const normalize = value => {
    const v = String(value ?? '').trim().toLowerCase();
    return allowed.includes(v) ? v : (legacy[v] || null);
  };
  const get = () => {
    try {
      return normalize(localStorage.getItem(KEY)) || 'minimal';
    } catch (_) { return 'classic'; }
  };
  const resolveForEstimate = (estimate) => {
    try {
      const stored = normalize(localStorage.getItem(KEY));
      if (stored) return stored;
    } catch (_) {}
    return normalize(estimate?.template) || 'minimal';
  };
  const set = (value) => {
    const v = normalize(value) || 'minimal';
    try { localStorage.setItem(KEY, v); } catch (_) {}
    render(v);
    try {
      const app=window.MGAppCore;
      const current=app?.state?.estimate;
      if(current){
        const updated={...current,template:v};
        app.state.estimate=updated;
        // Keep an already saved estimate in sync with the template selected in Settings.
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
      const small = card.querySelector('.estimate-template-card-head small');
      if (small) {
        const original = small.dataset.original || small.textContent;
        small.dataset.original = original;
        small.textContent = active ? 'Выбран для новых документов' : original;
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
  window.MGEstimateTemplates = { KEY, get, set, render, openSettings, resolveForEstimate, allowed: allowed.slice() };
  render();
})();
window.addEventListener('mg-estimate-template-changed', () => {
  try {
    const core = window.MGAppCore;
    const e = core?.state?.estimate;
    // Changing a template in Settings must NOT navigate to the last opened estimate.
    // Refresh the document only when the user is already viewing the document screen.
    if (e && core?.state?.screen === 'documentScreen' && typeof core.documentBody === 'function') {
      core.documentBody(e);
    }
  } catch (err) { console.warn('MG template refresh failed', err); }
});

// v346: visual pagination for the horizontal template carousel. Selection logic above is unchanged.
(() => {
  const list = document.getElementById('estimateTemplateList');
  const dots = Array.from(document.querySelectorAll('#estimateTemplateDots [data-template-dot]'));
  if (!list || !dots.length) return;
  const cards = Array.from(list.querySelectorAll('.estimate-template-card'));
  const setDot = (index) => dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
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
  const goToCard = (index, smooth = true) => {
    const i = Math.max(0, Math.min(cards.length - 1, Number(index) || 0));
    const card = cards[i];
    if (!card) return;
    // Scroll the template carousel itself, not the whole page. This keeps
    // template #4/#5 from snapping back to #3 on iPhone Safari.
    const left = Math.max(0, card.offsetLeft - list.offsetLeft);
    list.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    setDot(i);
  };
  dots.forEach((dot) => dot.addEventListener('click', () => {
    goToCard(dot.dataset.templateDot, true);
  }));
  let timer;
  list.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => setDot(nearestIndex()), 40);
  }, {passive:true});
  setDot(nearestIndex());
})();
