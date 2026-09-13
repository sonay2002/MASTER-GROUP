/* Master Group v153 — robust touch/click bridge.
 * Keeps critical navigation and finance actions working after module refactors.
 * Uses capture phase so a legacy/other handler cannot swallow the action first.
 */
(()=>{
  'use strict';
  const call=(fn,...args)=>{try{if(typeof fn==='function'){const r=fn(...args);if(r&&typeof r.catch==='function')r.catch(err=>console.warn('MG action:',err));return true}}catch(err){console.warn('MG action:',err)}return false};
  const finance=()=>window.MGAppFinance||{};
  const core=()=>window.MGAppCore||{};
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('[data-add-payment],[data-edit-expenses],[data-v58]');
    if(!el)return;
    const action=el.dataset.v58;
    if(action==='estimates'){
      e.preventDefault();e.stopPropagation();
      call(finance().showEstimates)||call(core().showEstimates);
    }else if(action==='stats'){
      e.preventDefault();e.stopPropagation();
      call(finance().showStats)||call(core().showStats);
    }
  },true);
})();
