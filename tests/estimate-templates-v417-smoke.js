const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const selector = fs.readFileSync(path.join(root, 'js/estimate-templates.js'), 'utf8');
const pack = fs.readFileSync(path.join(root, 'js/estimate-template-pack-v417.js'), 'utf8');
const finance = fs.readFileSync(path.join(root, 'js/finance-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');

for (const id of ['basic','modern','strict','compact','table']) {
  if (!html.includes(`data-estimate-template="${id}"`)) throw new Error(`Missing template ${id}`);
  if (!css.includes(`tpl-${id}`)) throw new Error(`Missing renderer style ${id}`);
}
for (const old of ['neo','corporate','minimal','premium','accent','Нео','Корпоративный','Минималистичный','Премиум','Акцент']) {
  if (html.includes(`data-estimate-template="${old}"`) || html.includes(`etp-${old}`)) throw new Error(`Legacy template still rendered: ${old}`);
  if (selector.includes(old)) throw new Error(`Legacy template still in selector: ${old}`);
}
if (!pack.includes('window.__mgRenderEstimateDocument')) throw new Error('New document renderer missing');
if (!finance.includes('if(window.__mgRenderEstimateDocument)')) throw new Error('Finance UI does not delegate to new renderer');
if (!finance.includes('master_group_estimate_template_v2')) throw new Error('New template key is not wired');
console.log('estimate-templates-v417 smoke: OK');
