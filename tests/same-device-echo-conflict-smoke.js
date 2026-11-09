/* Regression checks for same-browser Firebase echoes and RTDB serialization. */
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const s=fs.readFileSync(path.join(__dirname,'../js/firebase-sync.js'),'utf8');
const repo=fs.readFileSync(path.join(__dirname,'../js/firebase-repository.js'),'utf8');
const checks=[];
const check=(name,ok)=>{checks.push([name,!!ok]);console.log((ok?'PASS ':'FAIL ')+name)};

// Reproduce the repository's sanitizer contract, then model RTDB dropping null object children.
function sanitize(value,seen){
  if(value===undefined)return null;
  if(typeof value==='number'&&!Number.isFinite(value))return 0;
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
  if(!seen)seen=new WeakSet();
  if(typeof value==='object'){
    if(seen.has(value))return null;seen.add(value);
    if(Array.isArray(value))return value.map(v=>sanitize(v,seen));
    const out={};for(const [k,v] of Object.entries(value)){if(/[.#$\[\]\/]/.test(k))continue;out[k]=sanitize(v,seen)}return out;
  }
  return null;
}
function rtdbShape(value){
  if(Array.isArray(value))return value.map(v=>v&&typeof v==='object'?rtdbShape(v):v);
  if(value&&typeof value==='object'){
    const out={};for(const [k,v] of Object.entries(value)){if(v===null||v===undefined)continue;out[k]=rtdbShape(v)}return out;
  }
  return value;
}
const match=s.match(/function estimateContentSignature\(value\)\{[\s\S]*?\n  \}/);
check('content signature helper exists',!!match);
let signature=null;
if(match)signature=vm.runInNewContext('('+match[0]+')',{FIREBASE_REPO:{sanitize}});
const local={id:'id-66',number:'MG-0066',clientOptional:undefined,invalid:{'bad.key':'x',keep:1},items:[{name:'Работа',optional:undefined,qty:2}],_syncUpdatedAt:100,_serverRevision:0};
const remote=rtdbShape(sanitize({...local,_cloudUpdatedAt:123456,_clientUpdatedAt:100,_clientId:'device-a',_deleted:false}));
check('local and Firebase echo compare equally after RTDB serialization',!!signature&&signature(local)===signature(remote));
const genuinelyDifferent={...remote,number:'MG-0066',items:[{name:'ДРУГАЯ работа',qty:2}]};
check('genuinely changed remote content remains distinguishable',!!signature&&signature(local)!==signature(genuinelyDifferent));
check('per-browser client ID is persisted',/master_group_firebase_client_id_v1/.test(s));
check('per-browser client ID is written to Firebase estimate payload',/payload\._clientId=clientId/.test(s));
check('dirty same-device echoes are ignored',/const sameDevice=String\(v\._clientId\|\|''\)===String\(clientId\);\s*if\(sameDevice\|\|sameContent\)return;/.test(s));
check('different-device newer content can still surface a conflict',/if\(remoteAt>oldAt\|\|remoteClientAt>oldAt\)/.test(s));
check('Firebase repository continues using the existing users/{uid}/estimates path',/ref\('users\/ '\+uid\)/.test(repo)||/ref\('users\/'\+uid\)/.test(repo));
const failed=checks.filter(x=>!x[1]).length;
if(failed)process.exit(1);
console.log(`Same-device echo checks: ${checks.length} passed`);
