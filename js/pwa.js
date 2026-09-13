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
        const showUpdateNotice = () => {
          if (document.getElementById('mgUpdateNotice')) return;
          const notice = document.createElement('div');
          notice.id = 'mgUpdateNotice';
          notice.className = 'mg-update-notice';
          notice.innerHTML = '<span>Доступно обновление приложения</span><button type="button">Обновить</button>';
          notice.querySelector('button').addEventListener('click', () => window.location.reload());
          document.body.append(notice);
        };
        const checkRelease = () => fetch('build-info.json', { cache: 'no-store' })
          .then(response => response.ok ? response.json() : null)
          .then(build => {
            const version = String(build?.version || '');
            if (!version) return;
            const knownVersion = localStorage.getItem(RELEASE_KEY);
            localStorage.setItem(RELEASE_KEY, version);
            if (knownVersion && knownVersion !== version && !reloading) {
              showUpdateNotice();
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
