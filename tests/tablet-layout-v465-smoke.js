'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/desktop-layout-v465.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
if (!html.includes('css/desktop-layout-v465.css?v=465') || !html.includes('css/desktop-layout-v467.css?v=467')) throw new Error('Responsive base or sidebar override stylesheet is not linked');
if (!html.includes('<meta name="app-version" content="v468">')) throw new Error('app version did not advance to v465');
if (!sw.includes('master-group-v476-desktop-variant-a') || !sw.includes('./css/desktop-layout-v465.css?v=465')) throw new Error('Service Worker does not precache the new responsive stylesheet');
if (!css.includes('@media screen and (min-width:700px) and (min-height:600px) and (max-width:1099px)')) throw new Error('Tablet media query with phone-landscape guard is missing');
if (!css.includes('--mg-tablet-sidebar-width:218px') || !css.includes('--mg-tablet-sidebar-width:76px')) throw new Error('Tablet sidebar breakpoints are missing');
if (!css.includes('#estimatesScreen #estimatesList .mge-compact-estimate{display:flex!important') || !css.includes('#estimatesScreen #estimatesList .mge-estimates-desktop-table{display:none!important}')) throw new Error('Tablet estimate cards are not prioritized over the wide table');
for (const id of ['dashboard','editor','documentScreen','estimatesScreen','archiveScreen','statsScreen','notificationsScreen','settingsScreen']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Existing app screen missing: ${id}`);
}
if (!html.includes('class="drawer-icon"><svg') || !html.includes('class="home-quick-icon" aria-hidden="true"><svg')) throw new Error('Existing SVG app icons could not be found');
console.log('v465 tablet breakpoints / existing navigation / estimate cards / screen preservation: PASS');
