/* Master Group v162 — reliable estimates status filters */
(function(){
  'use strict';
  const KEY='master_group_status_filter_v1';
  const MAP={
    'Все':'Все','Черновики':'Черновик','Черновик':'Черновик',
    'Отправленные':'Отправлена','Отправлена':'Отправлена',
    'В работе':'В работе','Выполненные':'Выполнена','Выполнена':'Выполнена',
    'Отменённые':'Отменена','Отменена':'Отменена'
  };
  function canonical(value){return MAP[String(value||'').trim()]||'Все';}
  function apply(value){
    const status=canonical(value);
    localStorage.setItem(KEY,status);
    const finance=window.MGAppFinance;
    const core=window.MGAppCore;
    /* Keep the finance renderer as the single source of truth. */
    if(finance&&typeof finance.v58RenderEstimates==='function') finance.v58RenderEstimates();
    else if(finance&&typeof finance.showEstimates==='function') finance.showEstimates();
    else if(core&&typeof core.showEstimates==='function') core.showEstimates();
    return status;
  }
  function onClick(event){
    const button=event.target&&event.target.closest&&event.target.closest('[data-status-filter]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    apply(button.dataset.statusFilter);
  }
  document.addEventListener('click',onClick,true);
  window.__mgApplyStatusFilter=apply;
})();
