const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const source = fs.readFileSync('js/firebase-client.js', 'utf8');
const storage = new Map();
const events = [];
let online = true;
let sessionUser = null;
let loginCalls = 0;
let registered = false;
class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } }
const localStorage = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k,v) { storage.set(String(k), String(v)); },
  removeItem(k) { storage.delete(String(k)); }
};
const window = {
  crypto: webcrypto,
  navigator: {get onLine(){return online;}},
  localStorage,
  MGOfflineDB: {
    ready: Promise.resolve(),
    async put(key,value) { storage.set('idb:'+key, String(value)); },
    async remove(key) { storage.delete('idb:'+key); }
  },
  dispatchEvent(event) { events.push(event); }
};
function response(status, body) {
  return { ok: status>=200 && status<300, status, async json(){ return body; } };
}
async function fetch(url, options={}) {
  if (!online) throw new TypeError('Failed to fetch');
  if (url==='/api/auth/session') {
    return sessionUser ? response(200,{user:sessionUser}) : response(401,{error:'No session'});
  }
  if (url==='/api/auth/login') {
    loginCalls++;
    const body=JSON.parse(options.body||'{}');
    if (body.email==='registered@example.com' && body.password==='Register!234') {
      sessionUser={uid:'u-reg',email:body.email}; return response(200,{user:sessionUser});
    }
    if (body.email==='user@example.com' && body.password==='Correct!234') {
      sessionUser={uid:'u-1',email:body.email}; return response(200,{user:sessionUser});
    }
    return response(401,{error:'Invalid credentials'});
  }
  if (url==='/api/auth/register') {
    const body=JSON.parse(options.body||'{}');
    if(body.email==='registered@example.com' && body.password==='Register!234'){
      registered=true;sessionUser={uid:'u-reg',email:body.email};return response(200,{user:sessionUser});
    }
    return response(409,{error:'Already exists'});
  }
  if (url==='/api/auth/logout') { sessionUser=null; return response(200,{ok:true}); }
  return response(404,{});
}
const context={window,localStorage,fetch,crypto:webcrypto,navigator:window.navigator,TextEncoder,btoa,atob,CustomEvent,console,
  setInterval(){return 1;},clearInterval(){},Date,JSON,String,Number,Promise,Error,Uint8Array,Array,Object,Map,Set,Math};
vm.runInNewContext(source,context,{filename:'firebase-client.js'});
const auth=window.MGFirebaseClient.getAuth();
const grantKey='mg_offline_auth_v1';
const check=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message)};
(async()=>{
  // Successful online login establishes only a salted verifier, never the raw password.
  const result=await auth.signInWithEmailAndPassword('user@example.com','Correct!234',{remember:true});
  check(result.user.uid==='u-1' && result.user.offline===false,'online login succeeds');
  const grantRaw=storage.get(grantKey);
  check(!!grantRaw && !grantRaw.includes('Correct!234'),'offline verifier is persisted without plaintext password');
  check(storage.has('idb:'+grantKey),'offline verifier is also backed up in IndexedDB');

  // Simulate page refresh while offline: no API request is made, but UI is told that a local grant exists.
  online=false;
  let authState='not-called';
  auth.onAuthStateChanged(user=>{authState=user;});
  await new Promise(resolve=>setTimeout(resolve,0));
  check(authState===null && events.some(event=>event.type==='mg:auth-offline-available'&&event.detail?.available===true),'offline startup advertises the cached account without waiting for the server');
  const loginCallsBeforeOffline=loginCalls;
  const offline=await auth.signInWithEmailAndPassword('user@example.com','Correct!234',{remember:true});
  check(loginCalls===loginCallsBeforeOffline,'offline login does not send credentials to the unavailable server');
  check(offline.user.uid==='u-1' && offline.user.offline===true && offline.user.offlineLogin===true,'correct credentials unlock the local account offline');
  let rejected=false;
  try{await auth.signInWithEmailAndPassword('user@example.com','Wrong!234',{remember:true});}catch(e){rejected=e.code==='auth/offline-login-unavailable';}
  check(rejected,'wrong password is rejected while offline');

  // Network returns: the credentials held in memory are used for a fresh server login.
  online=true;
  const reconnected=await auth.reconnectOnline();
  check(reconnected===true && auth.currentUser.offline===false && auth.currentUser.offlineLogin===false,'offline session re-authenticates to the server after reconnect');

  // A server-side 401 is a real credential rejection, never an offline fallback.
  online=true;
  rejected=false;
  try{await auth.signInWithEmailAndPassword('user@example.com','Wrong!234',{remember:true});}catch(e){rejected=e.code==='auth/invalid-credential';}
  check(rejected,'server rejects incorrect credentials without offline bypass');

  // Remember-me=false must not create a persistent offline grant.
  await auth.signInWithEmailAndPassword('user@example.com','Correct!234',{remember:false});
  check(!storage.has(grantKey),'unchecked remember-me does not persist offline access');

  // Registration also establishes an offline grant when requested.
  await auth.createUserWithEmailAndPassword('registered@example.com','Register!234',{remember:true});
  check(registered && storage.has(grantKey),'new account receives offline grant after successful registration');

  // Offline sign-out removes both copies of the local grant.
  online=false;
  await auth.signInWithEmailAndPassword('registered@example.com','Register!234',{remember:true});
  await auth.signOut();
  check(!storage.has(grantKey) && !storage.has('idb:'+grantKey),'offline sign-out removes local auth grant from local and IndexedDB stores');
  console.log('Offline auth end-to-end smoke: 11 scenarios passed');
})().catch(error=>{console.error(error);process.exit(1);});
