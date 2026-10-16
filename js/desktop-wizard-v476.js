/* Master Group v476 — шаг «Клиент» на десктопе: справа показывается итог по смете (вариант A).
   Только отображение: значения читаются из уже существующих элементов #total и .calc-summary-copy small,
   ничего не пересчитывается и не сохраняется. */
(() => {
  'use strict';
  const mq = window.matchMedia('(min-width:1100px) and (min-height:600px)');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let raf = 0;

  function fill() {
    raf = 0;
    const step = document.getElementById('step4');
    if (!step) return;
    let side = step.querySelector(':scope > .mg-wz-side');
    if (!mq.matches) { if (side) side.remove(); return; }
    if (!side) {
      side = document.createElement('aside');
      side.className = 'mg-wz-side';
      side.setAttribute('aria-label', 'Итог по смете');
      step.appendChild(side);
    }
    const total = (document.getElementById('total') || {}).textContent || '0.00 MDL';
    const note = ((document.querySelector('.calc-summary-copy small') || {}).textContent || '').trim();
    const html = '<span>Итого по смете</span><b>' + esc(total.trim()) + '</b>' + (note ? '<small>' + esc(note) + '</small>' : '') +
      '<p>Укажите данные клиента: они попадут в документ сметы.</p>';
    if (side.getAttribute('data-h') !== html) { side.innerHTML = html; side.setAttribute('data-h', html); }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(fill); }

  function start() {
    const opts = { childList: true, characterData: true, subtree: true };
    const t = document.getElementById('total');
    const s = document.querySelector('.calc-summary-copy');
    if (t) new MutationObserver(schedule).observe(t, opts);
    if (s) new MutationObserver(schedule).observe(s, opts);
    const step = document.getElementById('step4');
    if (step) new MutationObserver(schedule).observe(step, { attributes: true, attributeFilter: ['hidden'] });
    if (mq.addEventListener) mq.addEventListener('change', schedule); else if (mq.addListener) mq.addListener(schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
