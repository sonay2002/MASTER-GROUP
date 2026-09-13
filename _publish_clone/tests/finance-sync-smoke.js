// Node smoke tests for finance invariants.
const assert=require('assert');
const C={number:v=>Math.max(0,Number(v)||0)};
const payments=e=>(Array.isArray(e.payments)?e.payments:[]).reduce((s,p)=>s+C.number(p.amount),0);
const expenses=e=>C.number(e.expenseMaterial)+C.number(e.expenseTransport)+C.number(e.expenseSalary)+C.number(e.expenseOther);
const normalize=e=>{const total=C.number(e.total),paid=payments(e),exp=expenses(e);return {...e,paid,prepayment:paid,balance:Math.max(0,total-paid),expenseTotal:exp,profit:total-exp}};
let e=normalize({id:'x',total:1000,payments:[{id:'p1',amount:250},{id:'p2',amount:150}],expenseMaterial:100,expenseTransport:50,expenseSalary:200,expenseOther:25});
assert.equal(e.paid,400); assert.equal(e.balance,600); assert.equal(e.expenseTotal,375); assert.equal(e.profit,625);
e=normalize({...e,payments:e.payments.filter(p=>p.id!=='p1')}); assert.equal(e.paid,150); assert.equal(e.balance,850);
console.log('finance-sync-smoke: OK');
