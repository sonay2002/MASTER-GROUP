const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/desktop-flow-v475.css', 'utf8');
assert.ok(html.includes('css/desktop-flow-v475.css?v=475'), 'index.html must load the v475 css');
assert.ok(html.indexOf('desktop-flow-v475.css') > html.indexOf('desktop-pages-v473.css'), 'v475 css must load after v473');
assert.ok(sw.includes('./css/desktop-flow-v475.css?v=475'), 'Service Worker must precache the v475 css');
assert.ok(/min-width:1100px/.test(css) && !/@media[^{]*max-width/.test(css), 'flow css must be desktop-only');
assert.strictEqual(css.split('{').length, css.split('}').length, 'css braces must be balanced');
['#step4', '#step5', '#documentScreen', '#mgEstimateEditPanel', '#deletedEstimatesList', '#notificationsScreen'].forEach(s => assert.ok(css.includes(s), 'must style ' + s));
// Документ: display:grid только для видимого экрана.
assert.ok(/#documentScreen:not\(\[hidden\]\)/.test(css), 'documentScreen grid must be limited to :not([hidden])');
console.log('v475 desktop flow smoke test passed');
