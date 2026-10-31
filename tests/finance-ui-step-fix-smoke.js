const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('js/finance-ui.js', 'utf8');
const line3 = src.split('\n')[2];
// Регрессия: «step is not defined» — finance-ui.js переопределяет step, но не получал её из MGAppCore.
assert.ok(/^let \{/.test(line3), 'destructuring from MGAppCore must be `let` because step is reassigned below');
assert.ok(/[,{]step,/.test(line3), 'step must be taken from MGAppCore');
assert.ok(/[,{]renderSettings[,}]/.test(line3), 'renderSettings must be taken from MGAppCore (used by v59ShowSettings)');
assert.ok(/originalStep=step;step=function/.test(src), 'step wrapper must stay in place');
// Опечатка v58Payments → v59Payments: функция определена только как v59Payments.
assert.ok(/function v59Payments\(/.test(src), 'v59Payments must exist');
assert.ok(!/v58Payments/.test(src), 'v58Payments does not exist and must not be exported');
assert.ok(/Object\.assign\(F,\{[^}]*v59Payments/.test(src), 'v59Payments must be exported on MGAppFinance');
// Экспорт ядра действительно содержит эти функции.
const core = fs.readFileSync('js/estimate-core.js', 'utf8');
const exp = core.slice(core.lastIndexOf('window.MGAppCore='));
['step', 'renderSettings'].forEach(n => assert.ok(new RegExp('[{,]' + n + '[,}]').test(exp), 'MGAppCore must export ' + n));
console.log('finance-ui step fix smoke test passed');
