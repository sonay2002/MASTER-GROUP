/* Master Group v551 — flat 2D direction icon set. */
// Caches the app shell and approved direction image assets.
const CACHE = 'master-group-v566-animated-startup';
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./js/zoom-lock.js",
  "./css/styles.css?v=501",
  "./css/sf-pro-v499.css?v=499",
  "./css/admin-monitor-v503.css?v=509",

  "./css/contact-card-final.css?v=440",
  "./css/soft-ui.css?v=443",
  "./css/estimates-editor-v456.css?v=456",
  "./css/team-estimate-editor-v517.css?v=517",
  "./css/wizard-v518.css?v=562",
  "./js/wizard-v518.js?v=562",
  "./css/estimates-list-compact-v458.css?v=458",
  "./css/estimates-status-palette-v460.css?v=460",
  "./css/desktop-layout-v465.css?v=465",
  "./css/desktop-layout-v467.css?v=467",
  "./css/desktop-layout-v469.css?v=469",
  "./css/desktop-master-detail-v470.css?v=470",
  "./css/desktop-home-v471.css?v=471",
  "./css/desktop-editor-v472.css?v=472",
  "./css/desktop-pages-v473.css?v=473",
  "./css/desktop-flow-v475.css?v=475",
  "./css/desktop-wizard-v476.css?v=476",
  "./css/desktop-catalog-v477.css?v=477",
  "./css/fix-hidden-screens-v478.css?v=478",
  "./css/desktop-workspace-nav-v483.css?v=488",
  "./js/account-data-scope-v510.js",
  "./js/offline-db.js",
  "./js/state.js",
  "./js/data-model.js",
  "./js/storage.js",
  "./js/responsive-runtime-v351.js",
  "./js/catalog.js?v=533",
  "./js/estimate-engine.js",
  "./js/calculations.js",
  "./js/finance-service.js",
  "./js/estimate-ui.js",
  "./js/mg-ai-service.js",
  "./js/estimate-core.js?v=512",
  "./js/finance-ui.js?v=481",
  "./js/estimates-redesign-v512.js?v=512",
  "./js/document-actions-v419.js?v=431",
  "./js/desktop-workspace-v465.js?v=468",
  "./js/desktop-master-detail-v470.js?v=470",
  "./js/desktop-home-v471.js?v=481",
  "./js/desktop-workspace-nav-v483.js?v=488",
  "./js/desktop-wizard-v476.js?v=476",
  "./js/desktop-catalog-v477.js?v=477",
  "./js/estimate-templates.js",
  "./js/app-core.js",
  "./js/ui-refresh-fix.js",
  "./js/print.js",
  "./js/pwa.js",
  "./js/finance-modal-v71.js",
  "./js/finance-actions-v70.js",
  "./js/mobile-webview.js",
  "./js/offline-engine.js",
  "./js/firebase-client.js",
  "./js/firebase-repository.js",
  "./js/firebase-sync.js?v=510",
  "./js/admin-monitor-v500.js?v=509",
  "./js/direct-interaction-fix.js",
  "./js/settings-trash-fix.js",
  "./js/status-direct-fix.js",
  "./js/filter-direct-fix.js",
  "./js/finance-final-fix.js",
  "./js/analytics-tabs-v310.js?v=311",
  "./js/mg-icons-v208.js?v=560",
  "./js/settings-icon-runtime-v208.js",
  "./js/new-direction-icon-picker-v211.js?v=560",
  "./js/v280-fixed-top-nav.js",
  "./js/v282-fixed-top-nav-visibility.js",
  "./js/v284-settings-cleanup.js",
  "./js/settings-hub-v357.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/direction-approved/clean.png?v=561",
"./icons/direction-approved/camera.png?v=560",
"./icons/direction-approved/metal.png?v=560",
"./icons/direction-approved/plumbing.png?v=560",
"./icons/direction-approved/construction.png?v=560",
"./icons/direction-approved/electrical.png?v=560",
"./icons/direction-approved/excavator.png?v=560",
"./icons/direction-approved/fence.png?v=565",
"./icons/direction-approved/finishing.png?v=560",
"./icons/direction-approved/flooring.png?v=561",
"./icons/direction-approved/heating.png?v=560",
"./icons/direction-approved/landscape.png?v=561",
"./icons/direction-approved/masonry.png?v=560",
"./icons/direction-approved/paint.png?v=560",
"./icons/direction-approved/sewer.png?v=560",
"./icons/direction-approved/transport.png?v=563",
"./icons/direction-approved/roof.png?v=561",
"./icons/direction-approved/ventilation.png?v=560",
"./icons/direction-approved/water.png?v=560",
"./icons/direction-approved/welding.png?v=560",
"./icons/direction-approved/window.png?v=560",
"./icons/direction-approved/aircon.png?v=560",
"./icons/direction-approved/tools.png?v=560",
"./icons/direction-approved/other.png?v=563"];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never handle cross-origin resources (Firebase CDN, etc.) here.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/monitor') return;
  const isNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  const isAppAsset = /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  const isApprovedIcon = /\/icons\/direction-approved\/[^/]+\.png$/i.test(url.pathname);
  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(async cache => {
              await cache.put(event.request, copy);
              await cache.put('./index.html', response.clone());
            }).catch(() => {});
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || caches.match('./index.html'))
    );
    return;
  }
  // JS/CSS/config files are network-first so GitHub Pages never gets stuck
  // on an old cached build after a new commit. Offline fallback remains available.
  if (isApprovedIcon) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  if (isAppAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Images and other local resources: cache-first with network fallback.
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }))
      .catch(() => caches.match(event.request))
  );
});
