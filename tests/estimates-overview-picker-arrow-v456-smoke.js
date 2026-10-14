'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/estimates-editor-v456.css', 'utf8');
if (!html.includes('css/estimates-editor-v456.css?v=456')) throw new Error('Index does not load v456 CSS');
if (!sw.includes("master-group-v468-navigation-cleanup") || !sw.includes('./css/estimates-editor-v456.css?v=456')) throw new Error('Service worker does not cache v456 CSS');
const required = [
  '#estimatesScreen.mge-editing .mge-overview-stack .mge-field > .mge-field-control{',
  'display:grid!important;',
  'grid-template-columns:minmax(0,1fr) 30px!important;',
  '#estimatesScreen.mge-editing .mge-overview-stack .mge-field-control > input{',
  'padding-right:7px!important;',
  '#estimatesScreen.mge-editing .mge-overview-stack .mge-field-control > .mge-field-picker-button{',
  'position:static!important;',
  'grid-column:2!important;',
  'width:30px!important;'
];
for (const needle of required) if (!css.includes(needle)) throw new Error(`Arrow/input separation rule missing: ${needle}`);
const selector = css.slice(css.indexOf('/* v456: keep client/object picker arrows'), css.length);
if (!selector.includes('mge-overview-stack')) throw new Error('Fix must remain scoped to the first-level overview editor');
console.log('v456 picker arrows are in a dedicated column; input and button cannot overlap: PASS');
