/* Keep the installed PWA in sync with each deployment. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Do not reload after the first installation, only after a newer worker
      // takes control of an already installed app.
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
            // A build identifier changes on every deployment, including style-
            // only releases where the service-worker source stays the same.
            if (knownVersion && knownVersion !== version && !reloading) {
              reloading = true;
              window.location.reload();
            }
          })
          .catch(() => {});
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
