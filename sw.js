/* Network-first keeps published releases fresh; the cache is offline backup. */
const CACHE = 'master-group-offline-v1';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/state.js', './js/data-model.js', './js/storage.js', './js/catalog.js',
  './js/estimate-engine.js', './js/calculations.js', './js/finance-service.js',
  './js/estimate-ui.js', './js/zoom-lock.js', './js/estimate-core.js',
  './js/finance-ui.js', './js/app-core.js', './js/ui-refresh-fix.js',
  './js/print.js', './js/pwa.js', './js/finance-modal-v71.js',
  './js/finance-actions-v70.js', './js/mobile-webview.js',
  './js/offline-engine.js', './js/firebase-client.js',
  './js/firebase-repository.js', './js/firebase-sync.js',
  './js/direct-interaction-fix.js', './js/settings-trash-fix.js',
  './js/status-direct-fix.js', './js/filter-direct-fix.js',
  './js/finance-final-fix.js', './icons/icon-192.png',
  './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => Promise.allSettled(CORE.map(url => cache.add(url))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('master-group-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Bypass the browser's HTTP cache after a deployment. The Cache Storage
      // copy below remains the offline fallback, but it must never mask a new
      // CSS or JavaScript release.
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch (_) {
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./'));
      return (await cache.match(request)) || Response.error();
    }
  })());
});
