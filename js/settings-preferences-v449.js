/* Master Group v449 — preferences stored locally. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const keys={app:'mg_app_language_v1',doc:'mg_document_language_v1',theme:'mg_app_theme_v1'};
 const get=(k,d)=>{try{return localStorage.getItem(k)||d}catch(_){return d}};
 const set=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
 function applyTheme(theme){
   const t=theme==='dark'?'dark':'light'; document.documentElement.dataset.mgTheme=t;
   document.documentElement.style.colorScheme=t; set(keys.theme,t);
   let style=$('mgPreferencesThemeCss'); if(!style){style=document.createElement('style');style.id='mgPreferencesThemeCss';document.head.appendChild(style)}
   style.textContent=t==='dark'?`
    html[data-mg-theme="dark"],html[data-mg-theme="dark"] body{background:#111214!important;color:#f0f0f2!important;color-scheme:dark!important}
    html[data-mg-theme="dark"] .app,html[data-mg-theme="dark"] .screen,html[data-mg-theme="dark"] main{background:#111214!important;color:#f0f0f2!important}
    html[data-mg-theme="dark"] .card,html[data-mg-theme="dark"] .settings-card-v2,html[data-mg-theme="dark"] .settings-hub-card,html[data-mg-theme="dark"] .settings-topbar,html[data-mg-theme="dark"] .settings-group-v2,html[data-mg-theme="dark"] .modal,html[data-mg-theme="dark"] .sheet{background:#1b1c1f!important;color:#f0f0f2!important;border-color:#34363a!important;box-shadow:none!important}
    html[data-mg-theme="dark"] h1,html[data-mg-theme="dark"] h2,html[data-mg-theme="dark"] h3,html[data-mg-theme="dark"] b,html[data-mg-theme="dark"] label,html[data-mg-theme="dark"] .settings-hub-copy b{color:#f0f0f2!important}
    html[data-mg-theme="dark"] p,html[data-mg-theme="dark"] small,html[data-mg-theme="dark"] .muted,html[data-mg-theme="dark"] .settings-hub-copy small{color:#b5b7bc!important}
    html[data-mg-theme="dark"] input,html[data-mg-theme="dark"] select,html[data-mg-theme="dark"] textarea{background:#24262a!important;color:#f5f5f6!important;border-color:#44464b!important}
    html[data-mg-theme="dark"] button:not(.btn.primary),html[data-mg-theme="dark"] .btn.secondary{background:#24262a!important;color:#f0f0f2!important;border-color:#414348!important}
    html[data-mg-theme="dark"] .settings-hub-icon,html[data-mg-theme="dark"] .settings-symbol-v2{background:#292b2f!important;color:#f0f0f2!important;border-color:#414348!important}
    html[data-mg-theme="dark"] .settings-section-nav-v357{color:#f0f0f2!important}
   `:'';
 }
 function init(){
   const app=$('mgAppLanguage'),doc=$('mgDocumentLanguage');
   if(app){app.value=get(keys.app,'ru');app.addEventListener('change',()=>{set(keys.app,app.value);document.documentElement.lang=app.value;const st=$('mgPreferencesStatus');if(st)st.textContent=app.value==='ro'?'Limba interfeței a fost salvată. Unele ecrane încă așteaptă traducerea.':'Язык сохранён. Часть экранов ещё требует перевода.';});}
   if(doc){doc.value=get(keys.doc,'ru');doc.addEventListener('change',()=>{set(keys.doc,doc.value);const st=$('mgPreferencesStatus');if(st)st.textContent=doc.value==='ro'?'Limba documentelor a fost salvată.':'Язык документов сохранён.';});}
   document.documentElement.lang=get(keys.app,'ru');
   const theme=get(keys.theme,'light');applyTheme(theme);
   document.querySelectorAll('input[name="mgAppTheme"]').forEach(r=>{r.checked=r.value===theme;r.addEventListener('change',()=>{if(r.checked)applyTheme(r.value)});});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.MGPreferences={getAppLanguage:()=>get(keys.app,'ru'),getDocumentLanguage:()=>get(keys.doc,'ru'),getTheme:()=>get(keys.theme,'light')};
})();
