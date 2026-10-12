'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const css = read('css/estimates-editor-v456.css');
const sw = read('sw.js');
if (!html.includes('css/estimates-editor-v456.css?v=456')) throw new Error('Index does not load v455 layout CSS');
if (!sw.includes('master-group-v467-mobile-palette-sidebar') || !sw.includes('./css/estimates-editor-v456.css?v=456')) throw new Error('Service Worker does not precache v455 layout CSS');
for (const rule of ['flex-direction:column!important','overflow:hidden!important','flex:1 1 auto!important;min-height:0!important;max-height:none!important','position:relative!important;top:auto!important;bottom:auto!important','white-space:nowrap!important','@media(max-width:360px)']) {
  if (!css.includes(rule)) throw new Error(`Missing responsive alignment rule: ${rule}`);
}
if (!css.includes('#estimatesScreen.mge-editing .mge-overview-stack') || !css.includes('#estimatesScreen.mge-editing .mge-overview-footer')) throw new Error('Layout rules are not scoped to the first-level estimate editor');
console.log('v455 compact estimate overview alignment and responsive layout: PASS');
