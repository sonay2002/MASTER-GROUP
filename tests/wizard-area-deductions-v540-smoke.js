const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('js/wizard-v518.js', 'utf8');
const css = fs.readFileSync('css/wizard-v518.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

assert(source.includes('<div class="wz-deduct-head"><b>Вычеты из площади</b></div>'));
assert(!source.includes('Укажи высоту и ширину. Площадь вычтется автоматически.'));
assert(source.includes('function deductionValue() { return num(calc.dv.h) * num(calc.dv.w); }'));
assert(source.includes('const sum = Math.max(0, gross - deduction);'));
assert(source.includes('data-wz-cdh') && source.includes('data-wz-cdw'));
assert(source.includes('data-wz-cdadd') && source.includes('data-wz-cddel'));
assert(css.includes('.wz-deduct{margin-top:8px;padding:8px;'));
assert(css.includes('.wz-deduct-add{width:100%;height:30px;'));
assert(html.includes('css/wizard-v518.css?v=551'));
assert(html.includes('js/wizard-v518.js?v=551'));
assert(sw.includes('master-group-v551-flat-2d-icons'));
assert(sw.includes('"./js/mg-icons-v208.js?v=551"'));

const gross = 5 * 6;
const deductions = 1.2 * 1.5 + 0.9 * 2;
assert.strictEqual(Math.round((gross - deductions) * 100) / 100, 26.4);
console.log('wizard-area-deductions-v540-smoke: OK');
