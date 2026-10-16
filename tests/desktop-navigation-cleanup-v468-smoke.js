const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.match(html, /name="app-version" content="v468"/);
assert.match(sw, /master-group-v476-desktop-variant-a/);
// Keep all existing actions in the fixed top panel.
assert.match(html, /class="mg-fixed-nav-btn mg-new-estimate-btn" data-action="new"/);
assert.match(html, /class="mg-fixed-nav-btn mg-archive-nav-btn"/);
assert.match(html, /class="mg-fixed-nav-btn mg-notification-btn"/);
// Remove only the duplicate action inside the estimates page heading.
const heading = html.match(/<div id="mgDesktopEstimatesHeading"[\s\S]*?<\/div><div id="mgEstimateEditPanel"/)?.[0];
assert.ok(heading, 'Estimates page heading still exists');
assert.doesNotMatch(heading, /data-action="new"/, 'Duplicate New Estimate button remains on estimates page');
// Keep the existing create button in the drawer and all other sidebar destinations.
assert.match(html, /class="drawer-create" data-menu-action="new"/);
for (const action of ['home', 'estimates', 'stats', 'settings']) {
  assert.match(html, new RegExp('data-menu-action="' + action + '"'), `Sidebar destination ${action} was removed`);
}
assert.match(html, /data-open-archives/, 'Sidebar archive shortcut was removed');
for (const section of ['catalog', 'estimates', 'trash', 'updates']) {
  assert.match(html, new RegExp('data-desktop-open-settings-section="' + section + '"'), `Settings shortcut ${section} was removed`);
}
assert.doesNotMatch(html, /drawer-item mg-desktop-only-nav" data-menu-action="notifications"/, 'Notifications item remains in sidebar');
console.log('v468 desktop navigation cleanup smoke test passed');
