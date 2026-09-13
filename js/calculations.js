/* Master Group v144 — calculation engine */
(()=>{
  const number=v=>Math.max(0,Number(v)||0);
  const itemTotal=x=>number(x?.qty)*number(x?.price);
  const directionTotal=d=>(Array.isArray(d?.items)?d.items:[]).reduce((sum,x)=>sum+itemTotal(x),0);
  const estimateTotal=e=>Array.isArray(e?.directions)&&e.directions.length
    ? e.directions.reduce((sum,d)=>sum+directionTotal(d),0)
    : (Array.isArray(e?.items)?e.items.reduce((sum,x)=>sum+itemTotal(x),0):number(e?.total));
  const paymentsTotal=e=>(Array.isArray(e?.payments)?e.payments:[]).reduce((sum,p)=>sum+number(p?.amount),0);
  const expenseTotal=e=>number(e?.expenseMaterial)+number(e?.expenseTransport)+number(e?.expenseSalary)+number(e?.expenseOther);
  const balance=(e,paid)=>Math.max(0,number(e?.total)-number(paid));
  const profit=(e,expenses)=>number(e?.total)-number(expenses);
  function normalizePayments(e){
    const source=Array.isArray(e?.payments)?e.payments:[];
    return source.map((p,i)=>({
      id:String(p?.id||('legacy-payment-'+i)),
      amount:number(p?.amount),
      date:String(p?.date||e?.date||''),
      method:String(p?.method||'другое'),
      note:String(p?.note||'')
    })).filter(p=>p.amount>0);
  }
  function normalizeFinance(e){
    const material=number(e?.expenseMaterial),transport=number(e?.expenseTransport),salary=number(e?.expenseSalary),other=number(e?.expenseOther);
    const hasPayments=Array.isArray(e?.payments);
    const payments=hasPayments?normalizePayments(e):((number(e?.prepayment)>0)?[{id:'legacy-prepayment-'+String(e?.id||'estimate'),amount:number(e.prepayment),date:String(e?.date||''),method:'аванс',note:'Перенесено из старой версии'}]:[]);
    const paid=payments.reduce((sum,p)=>sum+p.amount,0);
    const total=number(e?.total);
    const expenses=material+transport+salary+other;
    return {payments,paid,prepayment:paid,expenseMaterial:material,expenseTransport:transport,expenseSalary:salary,expenseOther:other,expenseTotal:expenses,balance:Math.max(0,total-paid),profit:total-expenses};
  }
  function normalizeEstimate(e){
    const out={...(e||{})};
    const calcTotal=estimateTotal(out);
    if(Array.isArray(out.directions)||Array.isArray(out.items)) out.total=calcTotal;
    Object.assign(out,normalizeFinance(out));
    return out;
  }
  window.MGCalculations={number,itemTotal,directionTotal,estimateTotal,paymentsTotal,expenseTotal,balance,profit,normalizePayments,normalizeFinance,normalizeEstimate};
})();
