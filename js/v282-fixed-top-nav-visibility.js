/* Master Group v282 — fixed top navigation visibility
   Exact app states:
   - drawerOverlay.open => hide fixed top bar
   - drawer closed => show fixed top bar
   - settingsScreen visible => keep fixed top bar hidden
*/
(function () {
  'use strict';

  function nav() {
    return document.getElementById('mgFixedTopNav');
  }

  function drawerIsOpen() {
    const el = document.getElementById('drawerOverlay');
    return !!el && el.classList.contains('open');
  }

  function settingsIsVisible() {
    const el = document.getElementById('settingsScreen');
    return !!el && !el.hidden;
  }

  function sync() {
    const el = nav();
    if (!el) return;
    const hidden = drawerIsOpen() || settingsIsVisible();
    el.classList.toggle('mg-top-nav-hidden', hidden);
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  window.__mgSyncFixedTopNav = sync;

  document.addEventListener('DOMContentLoaded', sync);

  // React immediately to the app's real drawer/settings state.
  const drawer = document.getElementById('drawerOverlay');
  const settings = document.getElementById('settingsScreen');

  if (drawer) {
    new MutationObserver(sync).observe(drawer, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (settings) {
    new MutationObserver(sync).observe(settings, {
      attributes: true,
      attributeFilter: ['hidden', 'class']
    });
  }

  // Hide before the drawer opens; show again immediately after it closes.
  document.addEventListener('click', function (event) {
    const target = event.target && event.target.closest
      ? event.target.closest('[data-menu="open"], [data-menu="close"]')
      : null;
    if (!target) return;

    if (target.dataset.menu === 'open') {
      const el = nav();
      if (el) el.classList.add('mg-top-nav-hidden');
    } else {
      setTimeout(sync, 0);
    }
  }, true);

  // Settings must never show the fixed top navigation.
  document.addEventListener('click', function () {
    setTimeout(sync, 0);
  }, true);

  sync();
})();
