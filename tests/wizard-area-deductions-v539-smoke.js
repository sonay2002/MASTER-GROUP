const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('js/wizard-v518.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

// The calculator accepts only generic height/width deductions, without
// hard-coded window/door categories, and subtracts them from gross area.
assert(source.includes('function deductionValue() { return num(calc.dv.h) * num(calc.dv.w); }'));
assert(source.includes('const sum = Math.max(0, gross - deduction);'));
assert(!source.includes('Общая площадь ${fmt(gross)} м² − вычеты ${fmt(deduction)} м²'));
assert(source.includes('data-wz-cdh'));
assert(source.includes('data-wz-cdw'));
assert(source.includes('data-wz-cdadd'));
assert(source.includes('data-wz-cddel'));
assert(source.includes('calc.deductions.push({ value: v, label: deductionLabel() })'));
assert(source.includes('чистая площадь: ${fmt(sum)} м²'));
assert(html.includes('css/wizard-v518.css?v=551'));
assert(html.includes('js/wizard-v518.js?v=551'));
assert(sw.includes('"./js/mg-icons-v208.js?v=551"'));

// Example: 30 m² gross - (1.2 × 1.5) - (0.9 × 2) = 26.4 m² net.
const gross = 5 * 6;
const deduction = 1.2 * 1.5 + 0.9 * 2;
assert.strictEqual(Math.round((gross - deduction) * 100) / 100, 26.4);
console.log('wizard-area-deductions-regression: OK');
