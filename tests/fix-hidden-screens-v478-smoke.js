const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/fix-hidden-screens-v478.css', 'utf8');
// Регрессия: скрытый экран «Сметы» в режиме правки не должен оставаться на странице (кнопка «Архив» и весь переход из правки).
assert.ok(/#estimatesScreen\.mge-editing\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css), 'hidden editing screen must stay hidden');
assert.ok(!/@media/.test(css), 'the fix must apply at every width');
assert.ok(html.includes('css/fix-hidden-screens-v478.css?v=478'), 'index.html must load the fix');
assert.ok(sw.includes('./css/fix-hidden-screens-v478.css?v=478'), 'Service Worker must precache the fix');
// Исправление грузится последним среди наших таблиц стилей.
const fixAt = html.indexOf('fix-hidden-screens-v478.css');
['desktop-layout-v465.css', 'estimates-editor-v454.css', 'estimates-editor-v456.css'].forEach(n => {
  const at = html.indexOf(n);
  if (at > -1) assert.ok(fixAt > at, 'fix must load after ' + n);
});
// Правила, которые принудительно показывают экран, действительно есть в исходных стилях (чтобы тест не устарел молча).
const base = fs.readFileSync('css/desktop-layout-v465.css', 'utf8');
assert.ok(/#estimatesScreen\.mge-editing\s*\{[^}]*display:\s*block\s*!important/.test(base), 'the original forcing rule is expected to exist');
console.log('v478 hidden screens fix smoke test passed');
