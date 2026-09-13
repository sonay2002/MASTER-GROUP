/* Keep installed PWA clients in sync with deployments. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(registration => {
        const RELEASE_KEY = 'master-group-release';
        const checkRelease = () => fetch('build-info.json', { cache: 'no-store' })
          .then(response => response.ok ? response.json() : null)
          .then(build => {
            const version = String(build?.version || '');
            if (!version) return;
            const knownVersion = localStorage.getItem(RELEASE_KEY);
            localStorage.setItem(RELEASE_KEY, version);
            if (knownVersion && knownVersion !== version && !reloading) {
              reloading = true;
              window.location.reload();
            }
          }).catch(() => {});
        const checkForUpdate = () => {
          registration.update().catch(() => {});
          checkRelease();
        };
        checkForUpdate();
        window.setInterval(checkForUpdate, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      })
      .catch(error => console.warn('PWA registration failed:', error));
  });
}
