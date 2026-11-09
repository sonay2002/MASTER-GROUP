const fs=require('fs');
const auth=fs.readFileSync('js/firebase-client.js','utf8');
const sync=fs.readFileSync('js/firebase-sync.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['offline callback bypasses initial cloud sync',/if\(u\?\.offline\)[\s\S]*?unlockAuthGate\(\)[\s\S]*?refreshUi\(\)/.test(sync)],
 ['offline mode keeps cloud sync disabled',/if\(u\?\.offline\)[\s\S]*?cloudMode=false/.test(sync)],
 ['reconnect attempts online login',/auth\.reconnectOnline\(\)/.test(sync)],
 ['login form passes remember preference',/signInWithEmailAndPassword\(email,password,\{remember:/.test(sync)],
 ['offline availability message is connected to auth UI',/mg:auth-offline-available/.test(sync)&&/mg:auth-offline-available/.test(auth)],
 ['page can start when Firebase CDN is unavailable',/window\.firebase\?\.auth\?\.Auth\?\.Persistence/.test(sync)],
 ['Firebase CDN scripts do not block local JS startup',/script defer src=\"https:\/\/www\.gstatic\.com\/firebasejs/.test(html)&&/addEventListener\?\.\('load'/.test(auth)],
 ['offline database is loaded before app modules',html.indexOf('js/offline-db.js')<html.indexOf('js/state.js')],
 ['updated service worker caches the auth scripts',/master-group-v494-https-offline/.test(fs.readFileSync('sw.js','utf8'))&&/firebase-client\.js/.test(fs.readFileSync('sw.js','utf8'))]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`Offline auth integration smoke: ${checks.length} checks passed`);
