/* Master Group v427 — GitHub Pages safe Service Worker */
const CACHE = 'master-group-v427';
const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./js/zoom-lock.js",
  "./css/styles.css?v=427",
  "./js/state.js",
  "./js/data-model.js",
  "./js/storage.js",
  "./js/responsive-runtime-v351.js",
  "./js/catalog.js",
  "./js/estimate-engine.js",
  "./js/calculations.js",
  "./js/finance-service.js",
  "./js/estimate-ui.js",
  "./js/mg-ai-service.js",
  "./js/estimate-core.js",
  "./js/finance-ui.js",
  "./js/document-actions-v419.js?v=427",
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
  "./js/firebase-sync.js",
  "./js/direct-interaction-fix.js",
  "./js/settings-trash-fix.js",
  "./js/status-direct-fix.js",
  "./js/filter-direct-fix.js",
  "./js/finance-final-fix.js",
  "./js/analytics-tabs-v310.js?v=310",
  "./js/mg-icons-v208.js",
  "./js/settings-icon-runtime-v208.js",
  "./js/new-direction-icon-picker-v211.js?v=213",
  "./js/v280-fixed-top-nav.js",
  "./js/v282-fixed-top-nav-visibility.js",
  "./js/v284-settings-cleanup.js",
  "./js/settings-hub-v357.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
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
  const isNavigation = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  const isAppAsset = /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // JS/CSS/config files are network-first so GitHub Pages never gets stuck
  // on an old cached build after a new commit. Offline fallback remains available.
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
