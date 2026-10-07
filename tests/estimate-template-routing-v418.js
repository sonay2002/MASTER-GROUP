#!/usr/bin/env node
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const finance=fs.readFileSync(path.join(root,'js','finance-ui.js'),'utf8');
const templates=fs.readFileSync(path.join(root,'js','estimate-templates.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','styles.css'),'utf8');
for(const id of ['template1','template2','template3','template4','template5']){
  if(!index.includes(`data-estimate-template="${id}"`)) throw new Error(`missing settings ${id}`);
  if(!css.includes(`.tpl-${id.replace('template','template')}`)) throw new Error(`missing document CSS ${id}`);
  if(!index.includes(`class="new-tpl-page ${id}"`)) throw new Error(`missing preview ${id}`);
}
if((finance.match(/function v58Document\(/g)||[]).length!==1) throw new Error('more than one document renderer');
if(!finance.includes('window.MGEstimateTemplates?.get?.()')) throw new Error('settings selection not authoritative');
if(!finance.includes('data-rendered-template="${currentTemplate}"')) throw new Error('rendered template marker missing');
if(finance.includes('ЗАКУПЩИК')||finance.includes('purchaserName')||finance.includes('buyerName')) throw new Error('purchaser leaked into document renderer');
for(const col of ['Направление','Услуга / работа','Ед. изм.','Цена за единицу','Количество','Сумма']) if(!finance.includes(col)) throw new Error(`missing ${col}`);
if(!finance.includes('tpl-client-final')) throw new Error('client-only block missing');
if(!templates.includes("const allowed = ['template1','template2','template3','template4','template5']")) throw new Error('template registry mismatch');
console.log('estimate-template-routing-v418: OK');
