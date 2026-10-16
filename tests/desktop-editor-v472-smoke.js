const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/desktop-editor-v472.css', 'utf8');
assert.ok(html.includes('css/desktop-editor-v472.css?v=472'), 'index.html must load the v472 css');
assert.ok(html.indexOf('desktop-editor-v472.css') > html.indexOf('desktop-home-v471.css'), 'v472 css must load after v471');
assert.ok(sw.includes('./css/desktop-editor-v472.css?v=472'), 'Service Worker must precache the v472 css');
assert.ok(/min-width:1100px/.test(css) && !/@media[^{]*max-width/.test(css), 'editor css must be desktop-only');
// Шаги мастера скрываются атрибутом hidden: grid нельзя навешивать на скрытый шаг.
assert.ok(/#step3\.calc-step-screen:not\(\[hidden\]\)/.test(css), 'step3 grid must be limited to :not([hidden])');
assert.ok(!/#step[0-9]\s*\{[^}]*display\s*:\s*(grid|flex)/.test(css.replace(/:not\(\[hidden\]\)/g, '')), 'no unguarded display on step containers');
console.log('v472 desktop editor smoke test passed');
