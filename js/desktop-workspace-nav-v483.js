/* Master Group v483 — compact workspace navigation for desktop and tablet. */
(() => {
  'use strict';
  const nav = document.querySelector('#mgFixedTopNav .mg-workspace-nav');
  if (!nav) return;

  const screens = {
    home: 'dashboard', stats: 'statsScreen', estimates: 'estimatesScreen', settings: 'settingsScreen'
  };
  const updateActive = () => {
    for (const button of nav.querySelectorAll('[data-workspace-go]')) {
      const screen = document.getElementById(screens[button.dataset.workspaceGo]);
      const active = !!screen && !screen.hidden;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  };
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-workspace-go]');
    if (!button) return;
    const selector = {
      home: '[data-menu-action="home"]', stats: '[data-menu-action="stats"]',
      estimates: '[data-menu-action="estimates"]', settings: '[data-menu-action="settings"]'
    }[button.dataset.workspaceGo];
    document.querySelector(`#drawerOverlay ${selector}`)?.click();
    setTimeout(updateActive, 80);
  });
  new MutationObserver(updateActive).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  updateActive();

  // Suppress competing breakpoint transitions while the window is being resized.
  let resizeTimer;
  window.addEventListener('resize', () => {
    document.documentElement.classList.add('mg-screen-resizing');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => document.documentElement.classList.remove('mg-screen-resizing'), 140);
  }, { passive: true });
})();
