// Node smoke test for v145 canonical data model.
const fs=require('fs'),vm=require('vm');
const ctx={window:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}} ,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/data-model.js','utf8'),ctx);
const M=ctx.window.MGDataModel;
if(!M||M.version!==2)throw new Error('data model missing');
const e=M.normalizeEstimate({id:'E1',category:'Клининг',items:[{name:'Покос',qty:'2',unit:'сотка',price:'150'}],prepayment:'100',expenseMaterial:'20'});
if(e.directions.length!==1||e.directions[0].items.length!==1)throw new Error('legacy directions migration failed');
if(e.total!==300||e.paid!==100||e.balance!==200||e.expenseTotal!==20||e.profit!==280)throw new Error('finance normalization failed');
if(!e.directions[0].items[0].id||!e.payments[0].id)throw new Error('deterministic ids failed');
console.log('data-model-smoke: OK');
