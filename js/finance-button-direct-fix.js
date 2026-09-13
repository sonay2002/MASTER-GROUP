/* Master Group v153 — direct finance action binding.
 * Critical finance buttons get direct handlers instead of relying only on delegated events.
 * This is intentionally self-contained and resolves dependencies at click time.
 */
(()=>{
  'use strict';
  const saved=()=>window.MGStorage?.saved?.()||[];
  const toast=m=>{try{window.__mgToast?.(m)}catch(e){console.warn(e)}};
  const find=id=>saved().find(x=>String(x.id)===String(id));
  const finance=()=>window.MGAppFinance||{};
  const normalize=e=>typeof finance().v59Normalize==='function'?finance().v59Normalize(JSON.parse(JSON.stringify(e||{}))):e||{};
  const payments=e=>typeof finance().v59Payments==='function'?finance().v59Payments(e):Array.isArray(e?.payments)?e.payments:[];
  const save=(id,patch)=>{
    const fn=finance().v59SaveEstimateFinance;
    if(typeof fn!=='function') throw new Error('Финансовый модуль ещё не загружен');
    return fn(id,patch);
  };
  const refresh=()=>{try{finance().v58RenderEstimates?.()}catch(e){} try{finance().v59RenderFinance?.()}catch(e){}};
  const modal=()=>window.MG71||window.MG70;
  const uid=()=>window.MGAppCore?.uid?.()||window.crypto?.randomUUID?.()||('pay-'+Date.now()+'-'+Math.random().toString(16).slice(2));
  async function addPayment(id){
    const e=find(id); if(!e){toast('Смета не найдена');return}
    try{
      const n=normalize(e), m=modal(); if(!m?.payment)throw new Error('Окно оплаты недоступно');
      const data=await m.payment(Number(n.balance)||0); if(!data)return;
      const next=payments(e).concat([{id:uid(),amount:Number(data.amount)||0,date:new Date().toLocaleDateString('ru-RU'),method:data.method||'другое',note:data.note||''}]);
      const result=save(id,{payments:next}); if(!result)throw new Error('Не удалось сохранить оплату');
      refresh(); toast('Оплата добавлена');
    }catch(err){console.error('MG finance payment',err);toast(err?.message||'Не удалось добавить оплату')}
  }
  async function editExpenses(id){
    const e=find(id); if(!e){toast('Смета не найдена');return}
    try{
      const n=normalize(e), m=modal(); if(!m?.expenses)throw new Error('Окно расходов недоступно');
      const data=await m.expenses({material:n.expenseMaterial,transport:n.expenseTransport,salary:n.expenseSalary,other:n.expenseOther}); if(!data)return;
      const result=save(id,{expenseMaterial:Number(data.material)||0,expenseTransport:Number(data.transport)||0,expenseSalary:Number(data.salary)||0,expenseOther:Number(data.other)||0});
      if(!result)throw new Error('Не удалось сохранить расходы');
      refresh(); toast('Расходы сохранены');
    }catch(err){console.error('MG finance expenses',err);toast(err?.message||'Не удалось сохранить расходы')}
  }
  window.__mgDirectAddPayment=addPayment;
  window.__mgDirectEditExpenses=editExpenses;
  function bind(root=document){
    root.querySelectorAll?.('[data-add-payment]').forEach(b=>{
      if(b.dataset.mgDirectFinance==='1')return;
      b.dataset.mgDirectFinance='1';
      b.style.pointerEvents='auto';
      b.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();addPayment(b.dataset.addPayment)},true);
    });
    root.querySelectorAll?.('[data-edit-expenses]').forEach(b=>{
      if(b.dataset.mgDirectFinance==='1')return;
      b.dataset.mgDirectFinance='1';
      b.style.pointerEvents='auto';
      b.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();editExpenses(b.dataset.editExpenses)},true);
    });
  }
  window.__mgBindFinanceButtons=bind;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>bind()); else bind();
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)bind(n)}))).observe(document.documentElement,{childList:true,subtree:true});
})();
