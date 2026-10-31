/* Master Group v158: direct and persistent estimate status switching */
(function(){
  function api(){ return window.MGAppFinance||window.MGAppCore||{}; }
  function setStatus(select){
    if(!select || !select.value) return;
    const id=select.dataset.estimateStatus;
    const fn=api().v58SetStatus || window.MGAppFinance?.v58SetStatus;
    if(typeof fn==='function'){ fn(id,select.value); return; }
    try{
      const key=window.MGStorage?.KEY||'master_group_estimates_v1';
      const a=JSON.parse(localStorage.getItem(key)||'[]');
      const i=a.findIndex(e=>String(e.id)===String(id));
      if(i<0)return;
      a[i].status=select.value;
      localStorage.setItem(key,JSON.stringify(a));
      window.MGAppCore?.showEstimates?.();
    }catch(err){ console.error('MG status save failed',err); }
  }
  document.addEventListener('change',function(e){
    const s=e.target.closest?.('[data-estimate-status]');
    if(s){ e.stopImmediatePropagation(); setStatus(s); }
  },true);
  document.addEventListener('input',function(e){
    const s=e.target.closest?.('[data-estimate-status]');
    if(s) setStatus(s);
  },true);
})();
