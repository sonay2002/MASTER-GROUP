# Master Group v32 — GitHub-ready

This is a static PWA. The application entry point is `index.html` in the repository root.

## GitHub Pages

1. Upload the contents of this folder to the repository root (do not upload the parent folder itself).
2. Commit to the `main` branch.
3. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.
4. The workflow in `.github/workflows/main.yml` validates JavaScript and smoke tests, then deploys GitHub Pages.

Firebase client settings are already contained in `js/firebase-client.js`; Firebase Web configuration values are not treated as secrets. Access control is enforced by Firebase Security Rules.

## Local tests

Run from the repository root:

```bash
node tests/calculations-smoke.js
node tests/data-model-smoke.js
node tests/finance-sync-smoke.js
node tests/firebase-sync-boundary-smoke.js
node tests/offline-engine-smoke.js
node tests/smart-dictionary-load-order-smoke.js
node tests/smart-dictionary-smoke.js
node tests/smart-dictionary-v29-input-smoke.js
```
