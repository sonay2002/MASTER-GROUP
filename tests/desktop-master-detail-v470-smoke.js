const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/desktop-master-detail-v470.css', 'utf8');
const js = fs.readFileSync('js/desktop-master-detail-v470.js', 'utf8');
assert.ok(html.includes('css/desktop-master-detail-v470.css?v=470'), 'index.html must load the v470 css');
assert.ok(html.includes('js/desktop-master-detail-v470.js?v=470'), 'index.html must load the v470 js');
assert.ok(html.indexOf('desktop-master-detail-v470.css') > html.indexOf('desktop-layout-v469.css'), 'v470 css must load after v469');
assert.ok(sw.includes('./css/desktop-master-detail-v470.css?v=470') && sw.includes('./js/desktop-master-detail-v470.js?v=470'), 'Service Worker must precache v470 files');
assert.ok(/min-width:1100px/.test(css) && !/@media[^{]*max-width/.test(css), 'master/detail css must be desktop-only');
assert.ok(js.includes("matchMedia('(min-width:1100px)"), 'js must be gated by the desktop media query');
['data-estimate-status', 'data-estimate-edit', 'data-estimate-open', 'data-estimate-delete'].forEach(a => assert.ok(js.includes(a), 'js must reuse ' + a));
assert.ok(!/localStorage\.setItem|MGStorage\.persist|persist\(/.test(js), 'the detail pane must never write data');
console.log('v470 master/detail smoke test passed');
// Регрессия QA: в списке смет считаем только карточки-article. Старая десктопная таблица (TR с тем же
// data-estimate-card) раньше рисовалась под карточками и получала фокус с клавиатуры.
{
  const jsSrc = fs.readFileSync('js/desktop-master-detail-v470.js', 'utf8');
  const cssSrc = fs.readFileSync('css/desktop-master-detail-v470.css', 'utf8');
  assert.ok(jsSrc.includes(":scope > article[data-estimate-card]"), 'cards must be article-only');
  assert.ok(!/querySelectorAll\('\[data-estimate-card\]'\)/.test(jsSrc), 'no unscoped card selector');
  assert.ok(/mge-estimates-desktop-table\s*\{\s*display:\s*none/.test(cssSrc), 'old desktop table must be hidden in master/detail mode');
  console.log('v470 regression (no duplicate table) passed');
}
