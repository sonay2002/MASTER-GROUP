/* Master Group v144 — finance service: single source of truth for estimate money fields. */
(()=>{
  const C=window.MGCalculations;
  if(!C) throw new Error('MGCalculations must load before finance-service.js');
  function normalize(e){ return C.normalizeEstimate(JSON.parse(JSON.stringify(e||{}))); }
  function addPayment(e,p){
    const out=normalize(e);
    const amount=C.number(p?.amount);
    if(amount<=0) throw new Error('Payment amount must be greater than zero');
    if(amount>out.balance+0.000001) throw new Error('Payment exceeds estimate balance');
    out.payments=(out.payments||[]).concat([{id:String(p?.id||crypto.randomUUID()),amount,date:String(p?.date||new Date().toLocaleDateString('ru-RU')),method:String(p?.method||'другое'),note:String(p?.note||'')}]);
    return normalize(out);
  }
  function deletePayment(e,id){
    const out=normalize(e);
    out.payments=(out.payments||[]).filter(p=>String(p.id)!==String(id));
    return normalize(out);
  }
  function setExpenses(e,x){
    const out=normalize(e);
    out.expenseMaterial=C.number(x?.material);out.expenseTransport=C.number(x?.transport);out.expenseSalary=C.number(x?.salary);out.expenseOther=C.number(x?.other);
    return normalize(out);
  }
  window.MGFinance={normalize,addPayment,deletePayment,setExpenses};
})();
