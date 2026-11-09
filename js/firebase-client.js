(function(){
  'use strict';
  const CONFIG={
    apiKey:'AIzaSyDEw5EzNYvaKa29c7izX6zNir3RU3m7vR0',
    authDomain:'master-group-3e18e.firebaseapp.com',
    databaseURL:'https://master-group-3e18e-default-rtdb.firebaseio.com',
    projectId:'master-group-3e18e'
  };
  let app=null,auth=null,db=null;
  function init(){
    if(!window.firebase||typeof window.firebase.initializeApp!=='function'||typeof window.firebase.auth!=='function'||typeof window.firebase.database!=='function'){
      throw Object.assign(new Error('Firebase SDK не загрузился. Проверьте подключение к gstatic.com.'),{code:'sdk/not-loaded'});
    }
    try{
      app=(window.firebase.apps||[]).find(x=>x.name==='[DEFAULT]')||window.firebase.initializeApp(CONFIG);
      auth=window.firebase.auth(app);
      db=window.firebase.database(app);
      return true;
    }catch(error){
      console.error('[Master Group] Firebase initialization failed:',error);
      throw error;
    }
  }
  function ready(){return !!(window.firebase&&typeof window.firebase.auth==='function'&&typeof window.firebase.database==='function'&&CONFIG.apiKey&&CONFIG.projectId&&CONFIG.databaseURL)}
  function getAuth(){if(!auth)init();return auth}
  function getDb(){if(!db)init();return db}
  function friendlyError(error,context){
    const code=String(error?.code||'');
    if(code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found')return 'Неверный email или пароль Firebase.';
    if(code==='auth/email-already-in-use')return 'Аккаунт с таким email уже существует. Войдите в него.';
    if(code==='auth/too-many-requests')return 'Слишком много попыток входа. Попробуйте позже.';
    if(code==='auth/network-request-failed'||code==='unavailable'||code==='database/unavailable')return 'Firebase временно недоступен. Проверьте интернет-соединение.';
    if(code==='database/permission-denied'||code==='PERMISSION_DENIED')return 'Firebase отклонил доступ. Проверьте правила Realtime Database.';
    if(context==='startup')return 'Не удалось подключиться к Firebase. Проверьте интернет и настройки проекта.';
    if(context==='sync')return 'Не удалось синхронизировать данные с Firebase. Локальные изменения сохранены и будут отправлены при восстановлении связи.';
    return error?.message||'Не удалось выполнить операцию Firebase.';
  }
  window.MGFirebaseClient={
    config:CONFIG,
    ready,
    init,
    friendlyError,
    getAuth,
    getDb,
    getLegacyDb:getDb,
    serverTimestamp:()=>Date.now()
  };
})();
