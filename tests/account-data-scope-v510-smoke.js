const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const store = new Map();
const makeStorage = map => ({
  getItem(k){ return map.has(String(k)) ? map.get(String(k)) : null; },
  setItem(k,v){ map.set(String(k),String(v)); },
  removeItem(k){ map.delete(String(k)); }
});
const localStorage = makeStorage(store);
const sessionStorage = makeStorage(new Map());
const events=[];
const window = { dispatchEvent(e){events.push(e);}, addEventListener(){}, crypto:null };
class CustomEvent { constructor(type, init={}){this.type=type;this.detail=init.detail;} }
const context = vm.createContext({window,localStorage,sessionStorage,console,Date,Math,JSON,Set,Map,Array,String,Number,Object,WeakSet,CustomEvent});
const run = file => vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
localStorage.setItem('master_group_estimates_v8', JSON.stringify([{id:'legacy-A'},{id:'legacy-B'}]));
run('js/account-data-scope-v510.js');
run('js/data-model.js');
run('js/storage.js');
run('js/offline-engine.js');

assert.strictEqual(window.__mgSetDataAccountScope('uid-A'), true);
assert.deepStrictEqual(Array.from(window.MGStorage.saved()).map(x=>x.id), []);
window.MGStorage.persist([{id:'estimate-A',client:'Account A'}]);
window.MGSyncEngine.enqueue('estimate','estimate-A');
assert.strictEqual(window.MGSyncEngine.pending(),1);

assert.strictEqual(window.__mgSetDataAccountScope('uid-B'), true);
assert.deepStrictEqual(Array.from(window.MGStorage.saved()).map(x=>x.id), []);
assert.strictEqual(window.MGSyncEngine.pending(),0);
window.MGStorage.persist([{id:'estimate-B',client:'Account B'}]);
window.MGSyncEngine.enqueue('estimate','estimate-B');
assert.strictEqual(window.MGSyncEngine.pending(),1);

window.__mgSetDataAccountScope('uid-A');
assert.deepStrictEqual(Array.from(window.MGStorage.saved()).map(x=>x.id), ['estimate-A']);
assert.deepStrictEqual(Array.from(window.MGSyncEngine.due()).map(x=>x.id), ['estimate-A']);
window.__mgSetDataAccountScope('uid-B');
assert.deepStrictEqual(Array.from(window.MGStorage.saved()).map(x=>x.id), ['estimate-B']);
assert.deepStrictEqual(Array.from(window.MGSyncEngine.due()).map(x=>x.id), ['estimate-B']);
assert.deepStrictEqual(JSON.parse(localStorage.getItem('master_group_estimates_v8')).map(x=>x.id), ['legacy-A','legacy-B']);
assert.deepStrictEqual(JSON.parse(localStorage.getItem('master_group_estimates_v8__account_guest')), []);
assert.strictEqual(localStorage.getItem('master_group_data_model_version_v2'), null);
assert.strictEqual(events.length,4);
console.log('account-data-scope-v510-smoke: PASS — UID data and sync queues remain isolated; legacy cache untouched');
