const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const wizard = read('js/wizard-v518.js');
const css = read('css/wizard-v518.css');
const sw = read('sw.js');

assert(!html.includes('Выберите одно или несколько направлений для этой сметы.'), 'helper sentence must be removed');
assert(html.includes('css/wizard-v518.css?v=562'), 'HTML must load v562 CSS');
assert(html.includes('js/wizard-v518.js?v=562'), 'HTML must load v562 JS');
assert(wizard.includes('data-wz-directions-toggle'), 'arrow control must be rendered');
assert(wizard.includes('directionsExpanded = !directionsExpanded'), 'arrow must expand/collapse the panel');
assert(wizard.includes("t.closest('[data-wz-directions-toggle]')"), 'toggle click handler must exist');
assert(wizard.includes('directionsExpanded = false;\n      pickDirection(name);'), 'choosing a category must collapse the same panel');
assert(wizard.includes('assetKey = key === \'welding\' ? \'metal\' : key'), 'welding must not display the concrete crop');
assert(css.includes('.mg-direction-panel.is-expanded{'), 'expanded overlay style must exist');
assert(css.includes('position:absolute!important;'), 'expanded panel must overlay instead of changing layout flow');
assert(css.includes('grid-template-columns:repeat(auto-fill,60px)!important;'), 'expanded panel must reflow to a grid');
assert(css.includes('overflow-y:auto!important;'), 'expanded grid must scroll vertically');
assert(css.includes('grid-auto-flow:column!important;'), 'collapsed rail must remain horizontal');
assert(sw.includes("master-group-v562-expandable-directions-icon-audit"), 'service worker cache must be bumped');
assert(sw.includes('"./css/wizard-v518.css?v=562"'), 'service worker must include v562 CSS');
assert(sw.includes('"./js/wizard-v518.js?v=562"'), 'service worker must include v562 JS');

// Execute the actual catalog module with a minimal browser storage stub.
const store = new Map();
const window = { addEventListener() {}, dispatchEvent() {}, __mgAccountStorageKey: k => k };
const context = {
  window,
  localStorage: {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  CustomEvent: function CustomEvent() {},
  console, Date, JSON, Array, Map, String, Number
};
vm.createContext(context);
vm.runInContext(read('js/catalog.js'), context);
const cats = context.window.MGCatalog.cats;
assert.strictEqual(cats.length, 24, 'catalog must contain 24 direction categories');
const alias = { welding: 'metal' };
const dir = path.join(root, 'icons', 'direction-approved');
const allKeys = ['clean','camera','metal','plumbing','electrical','construction','masonry','welding','paint','aircon','heating','ventilation','window','roof','finishing','landscape','excavator','transport','sewer','water','fence','flooring','tools','other'];
for (const key of allKeys) {
  const file = path.join(dir, key + '.png');
  assert(fs.existsSync(file), `missing icon file ${key}.png`);
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', `${key}: invalid PNG file`);
  assert.strictEqual(b.readUInt32BE(16), 256, `${key}: width must be 256px`);
  assert.strictEqual(b.readUInt32BE(20), 256, `${key}: height must be 256px`);
  assert.strictEqual(b[25], 6, `${key}: image must be RGBA`);
}
assert(fs.readFileSync(path.join(dir, 'aircon.png')).equals(fs.readFileSync(path.join(dir, 'ventilation.png'))), 'HVAC artwork copies should stay identical');
const mapped = [];
for (const [name, key] of cats) {
  const asset = alias[key] || key;
  const file = path.join(dir, asset + '.png');
  assert(fs.existsSync(file), `${name}: missing image asset ${asset}.png`);
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', `${asset}: invalid PNG file`);
  assert.strictEqual(b.readUInt32BE(16), 256, `${asset}: width must be 256px`);
  assert.strictEqual(b.readUInt32BE(20), 256, `${asset}: height must be 256px`);
  assert.strictEqual(b[25], 6, `${asset}: image must be RGBA`);
  mapped.push(`${name} -> ${asset}.png`);
}
assert.strictEqual(new Set(cats.map(([n]) => n)).size, 24, 'category names must be unique');
console.log('v562 direction panel + 24 category image audit: PASS');
console.log(mapped.join('\n'));
