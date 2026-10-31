(function(){
  'use strict';
  const CONFIG={
    apiKey:'AIzaSyDEw5EzNYvaKa29c7izX6zNir3RU3m7vR0',
    authDomain:'master-group-3e18e.firebaseapp.com',
    databaseURL:'https://master-group-3e18e-default-rtdb.firebaseio.com',
    projectId:'master-group-3e18e'
  };
  let localUser=null,legacyAuth=null,legacyDb=null,restorePromise=null,pendingCredentials=null,heartbeatTimer=null,heartbeatBusy=false;
  const listeners=new Set();
  const emit=()=>listeners.forEach(callback=>{try{callback(localUser)}catch(error){console.error(error)}});
  async function api(path,method='GET',value){
    const response=await fetch(path,{method,credentials:'same-origin',headers:value===undefined?{}:{'Content-Type':'application/json'},body:value===undefined?undefined:JSON.stringify(value),cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(result.error||'Ошибка сервера Acer'),{code:response.status===401?'auth/invalid-credential':'server/unavailable'});
    return result;
  }
  async function importLegacy(uid){
    if(!pendingCredentials||!legacyAuth||!legacyDb||!window.MGServerRepository)return false;
    const state=await api('/api/migration/status');
    if(state.done)return false;
    const credentials=pendingCredentials;
    try{
      await legacyAuth.signInWithEmailAndPassword(credentials.email,credentials.password);
      const legacyUid=legacyAuth.currentUser.uid;
      const snapshot=await legacyDb.ref('users/'+legacyUid).once('value');
      await window.MGServerRepository.request('/api/migration/firebase','POST',{data:snapshot.val()||{}});
      await legacyAuth.signOut();
      return true;
    }catch(error){
      try{await legacyAuth.signOut()}catch(_){ }
      if(localUser)localUser.migrationWarning='Старые данные Firebase пока не перенесены. Проверьте прежний пароль и повторите вход.';
      console.warn('Legacy data import did not complete:',error?.code||error);
      return false;
    }
  }
  function startHeartbeat(){
    clearInterval(heartbeatTimer);
    heartbeatTimer=setInterval(async()=>{
      if(!localUser||heartbeatBusy)return;
      heartbeatBusy=true;
      try{const result=await api('/api/auth/session');localUser=result.user}
      catch(_){localUser=null;clearInterval(heartbeatTimer);emit()}
      finally{heartbeatBusy=false}
    },30000);
  }
  const localAuth={
    get currentUser(){return localUser},
    onAuthStateChanged(callback){
      listeners.add(callback);
      if(!restorePromise){
        restorePromise=api('/api/auth/session').then(result=>{localUser=result.user;startHeartbeat();emit()}).catch(()=>{localUser=null;emit()});
      }else restorePromise.then(()=>callback(localUser)).catch(()=>callback(null));
      return()=>listeners.delete(callback);
    },
    async setPersistence(){return true},
    async signInWithEmailAndPassword(email,password){
      pendingCredentials={email:String(email||'').trim(),password:String(password||'')};
      try{
        const result=await api('/api/auth/login','POST',pendingCredentials);
        localUser=result.user;
        startHeartbeat();
        try{await importLegacy(localUser.uid)}catch(error){localUser.migrationWarning='Старые данные Firebase пока не перенесены.'}
        emit();
        return{user:localUser};
      }finally{pendingCredentials=null}
    },
    async createUserWithEmailAndPassword(email,password){
      const result=await api('/api/auth/register','POST',{email:String(email||'').trim(),password:String(password||'')});
      localUser=result.user;
      startHeartbeat();
      emit();
      return{user:localUser};
    },
    async signOut(){await api('/api/auth/logout','POST',{});clearInterval(heartbeatTimer);heartbeatTimer=null;localUser=null;emit();return true},
    async sendPasswordResetEmail(){throw Object.assign(new Error('Сбросьте пароль командой администратора на Acer.'),{code:'auth/reset-via-server'})}
  };
  function init(){
    try{
      if(window.firebase&&CONFIG.apiKey){
        if(!window.__mgFirebaseInitialized){firebase.initializeApp(CONFIG);window.__mgFirebaseInitialized=true}
        legacyAuth=legacyAuth||firebase.auth();
        legacyDb=legacyDb||firebase.database();
      }
    }catch(error){console.warn('Legacy Firebase import is unavailable:',error)}
    return true;
  }
  function friendlyError(error,context){
    if(error?.code==='auth/invalid-credential')return 'Неверный email или пароль Acer.';
    if(error?.code==='auth/email-already-in-use')return 'Аккаунт с таким email уже существует. Войдите в него.';
    if(error?.code==='auth/reset-via-server')return error.message;
    if(context==='sync')return 'Не удалось сохранить данные на Acer. Проверьте, что сервер включён и доступен через Tailscale.';
    if(context==='startup')return 'Не удалось подключиться к серверу Acer. Данные пока останутся на этом устройстве.';
    return error?.message||'Не удалось выполнить действие.';
  }
  window.MGFirebaseClient={config:CONFIG,ready:()=>true,init,friendlyError,getAuth:()=>localAuth,getDb:()=>window.MGServerRepository?.db,getLegacyDb:()=>legacyDb,importLegacy,serverTimestamp:()=>Date.now()};
})();
