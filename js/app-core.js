/* Master Group v146 — application facade.
 * Domain code is split into estimate-core.js and finance-ui.js.
 */
(()=>{
  'use strict';
  const C=window.MGAppCore||{};
  window.MGApp={version:240,core:C,finance:window.MGAppFinance||{}};
  window.__mgAppReady=true;
})();
