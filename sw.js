const CACHE='master-group-v362';
const CORE=[
  './','./index.html','./manifest.webmanifest','./css/styles.css',
  './js/state.js','./js/data-model.js','./js/storage.js','./js/catalog.js','./js/estimate-engine.js','./js/calculations.js','./js/analytics-tabs-v306.js','./js/finance-service.js','./js/estimate-ui.js','./js/zoom-lock.js','./js/estimate-core.js','./js/finance-ui.js','./js/estimate-templates.js','./js/app-core.js','./js/ui-refresh-fix.js','./js/print.js','./js/responsive-runtime-v354.js',
  './js/pwa.js','./js/mg-icons-v208.js','./js/settings-icon-runtime-v208.js','./js/finance-modal-v71.js','./js/finance-actions-v70.js',
  './js/settings-hub-v357.js','./js/direct-interaction-fix.js','./js/status-direct-fix.js','./js/filter-direct-fix.js','./js/finance-final-fix.js','./js/mobile-webview.js','./js/offline-engine.js','./js/firebase-client.js','./js/firebase-repository.js','./js/firebase-sync.js',
  './icons/direction-approved/clean.png','./icons/direction-approved/camera.png','./icons/direction-approved/plumbing.png','./icons/direction-approved/electrical.png','./icons/direction-approved/construction.png','./icons/direction-approved/masonry.png','./icons/direction-approved/welding.png','./icons/direction-approved/metal.png','./icons/direction-approved/paint.png','./icons/direction-approved/aircon.png','./icons/direction-approved/heating.png','./icons/direction-approved/ventilation.png','./icons/direction-approved/window.png','./icons/direction-approved/roof.png','./icons/direction-approved/finishing.png','./icons/direction-approved/landscape.png','./icons/direction-approved/excavator.png','./icons/direction-approved/transport.png','./icons/direction-approved/sewer.png','./icons/direction-approved/water.png','./icons/direction-approved/fence.png','./icons/direction-approved/flooring.png','./icons/direction-approved/tools.png','./icons/direction-approved/other.png','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});return r}).catch(()=>caches.match('./index.html')));return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>cached)));
});
