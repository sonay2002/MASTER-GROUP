#!/usr/bin/env node
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const templates=fs.readFileSync(path.join(root,'js','estimate-templates.js'),'utf8');
const finance=fs.readFileSync(path.join(root,'js','finance-ui.js'),'utf8');
for(const id of ['template1','template2','template3','template4','template5']){
  if(!index.includes(`data-estimate-template="${id}"`)) throw new Error(`Missing settings template ${id}`);
  if(!templates.includes(`'${id}'`)) throw new Error(`Missing template id ${id}`);
  if(!finance.includes('data-rendered-template=\"${currentTemplate}\"') && !finance.includes('tpl-${currentTemplate}')) throw new Error(`Missing renderer binding for ${id}`);
}
for(const legacy of ['data-estimate-template="neo"','data-estimate-template="corporate"','data-estimate-template="minimal"','data-estimate-template="premium"','data-estimate-template="accent"']){
  if(index.includes(legacy)) throw new Error(`Legacy template remains in settings: ${legacy}`);
}
for(const label of ['Направление','Услуга / работа','Ед. изм.','Цена за единицу','Количество','Сумма']){
  if(!finance.includes(label)) throw new Error(`Missing work column: ${label}`);
}
if(!finance.includes('ЗАКУПЩИК')) throw new Error('Missing purchaser block');
if(!finance.includes('<div class="tpl-final-total"><span>ИТОГО</span>')) throw new Error('Missing final total block');
console.log('estimate-templates-five-smoke: OK');
