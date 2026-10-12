/* Master Group v465 — direct desktop/tablet shortcuts into existing settings screens. */
(()=>{
  'use strict';
  const allowed=new Set(['catalog','estimates','trash','updates']);
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-desktop-open-settings-section]');
    if(!button)return;
    const section=button.dataset.desktopOpenSettingsSection;
    if(!allowed.has(section))return;
    event.preventDefault();
    event.stopPropagation();
    const open=window.__mgOpenSettingsDirect||window.__mgForceOpenSettings;
    const show=window.__mgSettingsShowSection;
    if(typeof open==='function')open();
    if(typeof show==='function')show(section);
  },true);
})();
