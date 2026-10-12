'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/estimates-status-palette-v460.css', 'utf8');
const finance = fs.readFileSync('js/finance-ui.js', 'utf8');
const editor = fs.readFileSync('js/estimates-redesign-v454.js', 'utf8');
for (const token of [
  'css/estimates-status-palette-v460.css?v=460',
  'js/finance-ui.js?v=460',
  'js/estimates-redesign-v454.js?v=460',
  '<meta name="app-version" content="v465">'
]) if (!html.includes(token)) throw new Error(`Missing v460 app asset/version: ${token}`);
if (!sw.includes("master-group-v465-approved-workspace-layout") ||
    !sw.includes('./css/estimates-status-palette-v460.css?v=460') ||
    !sw.includes('./js/finance-ui.js?v=460') ||
    !sw.includes('./js/estimates-redesign-v454.js?v=460')) {
  throw new Error('Service Worker does not cache all v460 app assets');
}
if (/#estimatesScreen\s+\.status-filter/.test(css) || /#estimatesScreen\s+\.status-filter-card/.test(css)) {
  throw new Error('Top estimate filter-bar styling must remain at the v458 baseline');
}
for (const color of ['#f0eeeb','#e8e4ef','#dde8e5','#e7e8d8','#ece0dc']) {
  if (!css.includes(color)) throw new Error(`Missing approved status color ${color}`);
}
for (const statusClass of ['status-draft','status-sent','status-working','status-done','status-cancelled','pay-none','pay-partial','pay-full']) {
  if (!css.includes(statusClass)) throw new Error(`Missing status styling: ${statusClass}`);
}
if (!finance.includes('mge-status-select status-${v58cl(status)}') || !finance.includes('mge-table-status status-${v58cl(status)}')) {
  throw new Error('Status dropdowns do not reflect current status color');
}
if (!editor.includes("new CustomEvent('mg:estimate-updated'") || !editor.includes('requestAnimationFrame(refreshSavedViews)') || !editor.includes('window.MGAppFinance?.v58RenderEstimates?.()')) {
  throw new Error('Post-edit refresh notification path is missing');
}
console.log('v460 status palette only + original filter bar + post-edit refresh path: PASS');
