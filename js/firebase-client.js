(function(){
  'use strict';
  /* Master Group v147 — Firebase client boundary.
     Configuration is not secret; security is enforced by Firebase Rules. */
  const CONFIG={
    apiKey:'AIzaSyDEw5EzNYvaKa29c7izX6zNir3RU3m7vR0',
    authDomain:'master-group-3e18e.firebaseapp.com',
    databaseURL:'https://master-group-3e18e-default-rtdb.firebaseio.com',
    projectId:'master-group-3e18e',
    storageBucket:'master-group-3e18e.firebasestorage.app',
    messagingSenderId:'124382225013',
    appId:'1:124382225013:web:32cb24cb0993647c234e3c',
    measurementId:'G-PVBS8KRYBQ'
  };
  let auth=null,db=null;
  const ready=()=>!!(CONFIG.apiKey&&!CONFIG.apiKey.startsWith('PASTE_')&&CONFIG.projectId&&!CONFIG.projectId.startsWith('PASTE_')&&CONFIG.databaseURL&&!CONFIG.databaseURL.includes('PASTE_FIREBASE'));
  function init(){
    try{
      if(!ready()) return false;
      if(!window.__mgFirebaseInitialized){
        firebase.initializeApp(CONFIG);
        window.__mgFirebaseInitialized=true;
      }
      auth=auth||firebase.auth();
      db=db||firebase.database();
      try{auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(e){console.warn('Firebase persistence:',e)}
      return true;
    }catch(e){console.error('Firebase client init:',e);return false}
  }
  function friendlyError(err,context){
    const code=String(err?.code||'').toLowerCase(),text=String(err?.message||'').toLowerCase();
    if(code.includes('permission-denied')||text.includes('permission_denied')||text.includes('permission denied')) return 'Нет доступа к облачным данным. Проверьте правила доступа Firebase Realtime Database и попробуйте ещё раз.';
    if(code.includes('network-request-failed')||code.includes('unavailable')||text.includes('network')||text.includes('offline')) return 'Нет соединения с облаком. Проверьте интернет и повторите попытку.';
    if(code.includes('invalid-api-key')||code.includes('app-not-authorized')||code.includes('invalid-argument')) return 'Не удалось настроить подключение к Firebase. Проверьте конфигурацию проекта.';
    if(code.includes('too-many-requests')) return 'Слишком много попыток. Подождите немного и попробуйте снова.';
    if(code.includes('email-already-in-use')) return 'Этот Email уже зарегистрирован. Войдите в аккаунт.';
    if(code.includes('invalid-email')) return 'Введите корректный Email.';
    if(code.includes('weak-password')) return 'Пароль слишком простой. Используйте более надёжный пароль.';
    if(code.includes('user-not-found')||code.includes('invalid-credential')||code.includes('wrong-password')) return 'Неверный Email или пароль.';
    if(code.includes('user-disabled')) return 'Этот аккаунт отключён. Обратитесь к владельцу проекта Firebase.';
    if(code.includes('operation-not-allowed')) return 'В Firebase не включён выбранный способ входа. Включите Email/Password в Authentication.';
    if(code.includes('expired-action-code')||code.includes('invalid-action-code')) return 'Ссылка действия устарела или недействительна. Повторите операцию.';
    if(context==='auth') return 'Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.';
    if(context==='sync') return 'Не удалось синхронизировать данные с облаком. Проверьте интернет и доступ Firebase.';
    if(context==='startup') return 'Не удалось подключиться к облаку. Сметы останутся на устройстве, пока соединение не будет восстановлено.';
    return 'Произошла ошибка облачного сервиса. Попробуйте ещё раз.';
  }
  window.MGFirebaseClient={config:CONFIG,ready,init,friendlyError,getAuth:()=>auth,getDb:()=>db,serverTimestamp:()=>firebase.database.ServerValue.TIMESTAMP};
})();
