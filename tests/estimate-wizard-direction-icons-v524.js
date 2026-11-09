'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const wizard = read('js/wizard-v518.js');
const icons = read('js/mg-icons-v208.js');
const index = read('index.html');
const css = read('css/wizard-v518.css');
const sw = read('sw.js');
const keys = ['clean','camera','plumbing','electrical','construction','masonry','welding','metal','paint','aircon','heating','ventilation','window','roof','finishing','landscape','excavator','transport','sewer','water','fence','flooring','tools','other'];
for (const key of keys) {
  const p = path.join(root, 'icons', 'direction-approved', `${key}.png`);
  if (!fs.existsSync(p)) throw new Error(`Missing approved icon: ${key}`);
}
if (!wizard.includes('icons/direction-approved/${key}.png')) throw new Error('Step 1 wizard is not using the approved PNG icon assets');
if (wizard.includes('const icon = (ic, name) => `<svg class="wz-ic"')) throw new Error('Legacy inline SVG icon renderer is still active');
if (!css.includes('.wz-dir-ib .mg-work-icon-image')) throw new Error('3D image sizing is missing from wizard CSS');
if (!index.includes('js/mg-icons-v208.js?v=550') || !index.includes('js/wizard-v518.js?v=550') || !index.includes('css/wizard-v518.css?v=550')) throw new Error('Versioned wizard assets are not loaded');
if (!sw.includes('master-group-v550-clean-centered-icons')) throw new Error('Service worker cache version not advanced');

// Execute the real wizard icon resolver with a minimal DOM shim and check its actual Step 1 output.
const win = { addEventListener() {} };
const doc = { readyState: 'loading', addEventListener() {} };
const context = { window: win, document: doc, console, setTimeout, clearTimeout, MutationObserver: function(){}, requestAnimationFrame(){} };
vm.createContext(context);
vm.runInContext(icons, context, { filename: 'mg-icons-v208.js' });
vm.runInContext(wizard, context, { filename: 'wizard-v518.js' });
const render = win.MGWizardIcons518?.svg;
if (typeof render !== 'function') throw new Error('Wizard icon renderer was not exposed');
const cleaning = render('🌿', 'Клининг участка');
const welding = render('⚙️', 'Металлоконструкции и сварка');
const cctv = render('📹', 'Установка видеонаблюдения');
const plumbing = render('🔧', 'Сантехнические работы');
for (const [name, html, key] of [['cleaning',cleaning,'clean'],['welding',welding,'welding'],['camera',cctv,'camera'],['plumbing',plumbing,'plumbing']]) {
  if (!html.includes(`./icons/direction-approved/${key}.png?v=550`)) throw new Error(`${name} resolves to the wrong icon: ${html}`);
}
console.log('v549 estimate Step 1 renders the approved 3D PNG icons for all four default directions: PASS');

// Explicit valid catalog keys are authoritative; legacy names can still resolve emoji aliases correctly.
for (const [key,label] of [['clean','Клининг и уборка'],['heating','Отопление'],['sewer','Канализация'],['water','Водоснабжение'],['metal','Металлоконструкции']]) {
  if (win.MGIconKey(key,label)!==key) throw new Error(`Canonical key ${key} was overridden`);
}
if (win.MGIconKey('🌿','Клининг участка')!=='clean') throw new Error('Legacy cleaning direction resolved to the wrong icon');
if (win.MGIconKey('⚙️','Металлоконструкции и сварка')!=='welding') throw new Error('Legacy welding direction resolved to the wrong icon');
