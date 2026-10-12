const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const core = fs.readFileSync('js/estimate-core.js', 'utf8');
const finance = fs.readFileSync('js/finance-ui.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

if (!html.includes('#dashboard.mg-home-render-pending{visibility:hidden!important}')) {
  throw new Error('Dashboard must remain hidden until the current renderer completes first render');
}
if (!core.includes('window.__MGRenderDashboard || window.MGAppFinance?.dashboard')) {
  throw new Error('Legacy dashboard calls do not route to the canonical renderer');
}
const start = core.indexOf('function dashboard(){');
const end = core.indexOf('\nfunction allDraftItems', start);
if (start < 0 || end < 0) throw new Error('Could not isolate dashboard dispatcher');
const dashboardSource = core.slice(start, end);
if (dashboardSource.includes('savedHtml') || dashboardSource.includes('class="saved"')) {
  throw new Error('Legacy estimate-card markup still exists in the dashboard dispatcher');
}
if (!finance.includes('window.__MGRenderDashboard=v58Dashboard')) {
  throw new Error('Canonical dashboard renderer is not registered globally');
}
if (!finance.includes('savedNode.innerHTML=recent.length?recent.map(e=>') || !finance.includes('home-estimate-card')) {
  throw new Error('Expected compact recent-estimates card renderer is missing');
}
if (!finance.includes("dashboardNode.classList.remove('mg-home-render-pending')")) {
  throw new Error('Dashboard render gate is not released after current markup is rendered');
}
if (!html.includes('js/estimate-core.js?v=447') || !html.includes('js/finance-ui.js?v=460') || !sw.includes('master-group-v462-desktop-workspace')) {
  throw new Error('Renderer assets are not cache-busted');
}
// Legacy reference must be a no-op before finance-ui registers; it must not render old HTML.
const pendingContext = { window: {} };
vm.runInNewContext(dashboardSource + '\ndashboard();', pendingContext, { timeout: 1000 });
// After registration, it delegates exactly once to the canonical renderer.
const context = { window: { __MGRenderDashboard() { context.renderCount++; } }, renderCount: 0 };
vm.runInNewContext(dashboardSource + '\ndashboard();', context, { timeout: 1000 });
if (context.renderCount !== 1) throw new Error('Dashboard dispatcher did not delegate exactly once');
console.log('Dashboard canonical-renderer regression test passed');
