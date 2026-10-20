const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/desktop-pages-v473.css', 'utf8');
assert.ok(html.includes('css/desktop-pages-v473.css?v=473'), 'index.html must load the v473 css');
assert.ok(html.indexOf('desktop-pages-v473.css') > html.indexOf('desktop-editor-v472.css'), 'v473 css must load after v472');
assert.ok(sw.includes('./css/desktop-pages-v473.css?v=473'), 'Service Worker must precache the v473 css');
assert.ok(/min-width:1100px/.test(css), 'pages css must contain the desktop block');
// Единственное исключение для планшета: форма «Новое направление» (700–1099px).
(css.match(/@media[^{]*max-width[^{]*/g) || []).forEach(m => assert.ok(/min-width:700px\) and \(max-width:1099px/.test(m), 'unexpected max-width media: ' + m));
['#settingsScreen', '#archiveScreen', '#analyticsPanelFinance', '#estimateTemplateList'].forEach(s => assert.ok(css.includes(s), 'must style ' + s));
// Не должно быть правил, которые прячут рабочие панели целиком.
assert.ok(!/#settingsPanel\w*\s*\{[^}]*display\s*:\s*none/.test(css), 'must not hide settings panels');
console.log('v473 desktop pages smoke test passed');
