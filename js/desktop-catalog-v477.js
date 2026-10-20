/* Master Group v477 — «Направления и услуги» на десктопе: список направлений слева, услуги выбранного справа (вариант A).
   Карточки направлений (article.settings-dir) и их обработчики не меняются: скрипт только добавляет список
   и помечает невыбранные карточки атрибутом data-mg-cat-off. Ничего не пересчитывает и не сохраняет. */
(() => {
  'use strict';
  const mq = window.matchMedia('(min-width:1100px) and (min-height:600px)');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let selected = 0, raf = 0, lastHtml = '';

  function render() {
    raf = 0;
    const host = document.getElementById('settingsCatalog');
    const panel = document.getElementById('settingsPanelCatalog');
    if (!host || !panel) return;
    const card = host.closest('.settings-card-v2');
    const arts = Array.from(host.querySelectorAll(':scope > article.settings-dir'));
    let nav = card && card.querySelector(':scope > .mg-cat-nav');
    if (!mq.matches || !arts.length) {
      if (nav) nav.remove();
      if (card && card.hasAttribute('data-mg-cat')) card.removeAttribute('data-mg-cat');
      arts.forEach(a => { if (a.hasAttribute('data-mg-cat-off')) a.removeAttribute('data-mg-cat-off'); });
      lastHtml = '';
      return;
    }
    if (selected >= arts.length) selected = arts.length - 1;
    if (!card.hasAttribute('data-mg-cat')) card.setAttribute('data-mg-cat', '1');
    arts.forEach((a, i) => {
      const off = i !== selected;
      if (off && !a.hasAttribute('data-mg-cat-off')) a.setAttribute('data-mg-cat-off', '');
      if (!off && a.hasAttribute('data-mg-cat-off')) a.removeAttribute('data-mg-cat-off');
    });
    const html = '<div class="mg-cat-nav-title">Направления</div>' + arts.map((a, i) => {
      const input = a.querySelector('.settings-dir-head input');
      const name = (input && input.value) || 'Без названия';
      const count = a.querySelectorAll('.settings-services > *').length;
      return '<button type="button" class="mg-cat-item' + (i === selected ? ' is-active' : '') + '" data-mg-cat-i="' + i + '" aria-pressed="' + (i === selected) + '">' +
        '<span class="mg-cat-num">' + (i + 1) + '</span><span class="mg-cat-name">' + esc(name) + '</span><small>' + count + '</small></button>';
    }).join('');
    if (!nav) { nav = document.createElement('nav'); nav.className = 'mg-cat-nav'; nav.setAttribute('aria-label', 'Направления'); card.insertBefore(nav, host); lastHtml = ''; }
    if (html !== lastHtml) { nav.innerHTML = html; lastHtml = html; }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.mg-cat-item');
    if (!b) return;
    selected = Number(b.getAttribute('data-mg-cat-i')) || 0;
    schedule();
  });
  document.addEventListener('input', ev => { if (ev.target.closest && ev.target.closest('#settingsCatalog .settings-dir-head')) schedule(); }, true);

  function start() {
    const host = document.getElementById('settingsCatalog');
    if (!host) return;
    new MutationObserver(schedule).observe(host, { childList: true });
    const panel = document.getElementById('settingsPanelCatalog');
    if (panel) new MutationObserver(schedule).observe(panel, { attributes: true, attributeFilter: ['hidden', 'class'] });
    if (mq.addEventListener) mq.addEventListener('change', schedule); else if (mq.addListener) mq.addListener(schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
