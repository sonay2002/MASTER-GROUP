const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('css/desktop-layout-v469.css', 'utf8');
assert.ok(html.includes('css/desktop-layout-v469.css?v=469'), 'index.html must load desktop-layout-v469.css');
assert.ok(html.indexOf('desktop-layout-v469.css') > html.indexOf('desktop-layout-v467.css'), 'v469 must load after v467');
assert.ok(sw.includes('./css/desktop-layout-v469.css?v=469'), 'Service Worker must precache desktop-layout-v469.css');
// Phone UI must stay untouched: every rule sits inside a >=700px media query.
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
let depth = 0, top = [];
for (let i = 0; i < stripped.length; i++) {
  const ch = stripped[i];
  if (ch === '{') { if (depth === 0) top.push(stripped.slice(Math.max(0, stripped.lastIndexOf('}', i) + 1), i).trim()); depth++; }
  else if (ch === '}') depth--;
}
assert.ok(top.length > 0 && top.every(h => /^@media/.test(h)), 'all v469 rules must be inside @media blocks');
assert.ok(top.some(h => /min-width:700px/.test(h)), 'main block must start at 700px');
assert.ok(top.every(h => /min-width:(700|1100)px|prefers-reduced-motion/.test(h)), 'no phone-width rules allowed');
console.log('v469 desktop polish smoke test passed');
