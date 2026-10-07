const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const templates=fs.readFileSync(path.join(root,'js','estimate-templates.js'),'utf8');
const finance=fs.readFileSync(path.join(root,'js','finance-ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','styles.css'),'utf8');
for(let i=1;i<=10;i++){
 const id=`template${i}`;
 if(!css.includes(`.tpl-${id}`)) throw new Error(`Missing document style ${id}`);
}
if(!index.includes('id="estimateTemplateList" class="estimate-template-list"></div>')) throw new Error('Template list should be replaced dynamically');
if(!templates.includes('length:10')) throw new Error('Template registry is not ten items');
if(!finance.includes('data-rendered-template="${currentTemplate}"')) throw new Error('Rendered template binding missing');
if(!finance.includes("['template6','template7','template10']")) throw new Error('Grouped template routing missing');
for(const col of ['Направление','Услуга / работа','Ед. изм.','Цена за единицу','Количество','Сумма']) if(!finance.includes(col)) throw new Error(`Missing work column: ${col}`);
console.log('estimate-templates-ten-smoke: OK');
