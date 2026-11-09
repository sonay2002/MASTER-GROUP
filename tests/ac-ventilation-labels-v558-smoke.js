// Regression check retained from v558. The app's cache and asset query versions
// intentionally advance independently; validate the current approved icon assets
// instead of pinning this historical test to the v558 cache name.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const keys = ['clean','camera','metal','plumbing','construction','electrical','excavator','fence','finishing','flooring','heating','landscape','masonry','paint','sewer','transport','roof','ventilation','water','welding','window','aircon','tools','other'];
const dir = path.join(root, 'icons', 'direction-approved');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const iconEntries = [...sw.matchAll(/["']\.\/icons\/direction-approved\/([a-z]+\.png)(?:\?v=[^"']*)?["']/g)].map(m => m[1]);
assert.strictEqual(new Set(iconEntries).size, 24, 'Service Worker must precache all 24 approved direction icons');
for (const key of keys) {
  const file = path.join(dir, `${key}.png`);
  assert(fs.existsSync(file), `${key} icon must exist`);
  const b = fs.readFileSync(file);
  assert.strictEqual(b.readUInt32BE(0), 0x89504e47, `${key} must be a PNG`);
  assert(iconEntries.includes(`${key}.png`), `${key} must be precached`);
}
for (const key of ['aircon', 'ventilation']) {
  const b = fs.readFileSync(path.join(dir, `${key}.png`));
  assert.strictEqual(b.readUInt32BE(16), 256, `${key} icon width`);
  assert.strictEqual(b.readUInt32BE(20), 256, `${key} icon height`);
  assert(b.length > 10000, `${key} icon asset is present`);
}
assert(/const CACHE = 'master-group-v566-[^']+'/.test(sw), 'Service Worker must use the current v566 cache');
assert(html.includes('mg-icons-v208.js?v=560'), 'icon resolver must be loaded');
assert(html.includes('wizard-v518.js?v=562'), 'estimate wizard must be loaded');
console.log('direction icon assets and current precache: PASS');
