/* Master Group v143 — estimate UI */
(()=>{
  let ctx=null;
  function init(next){ctx=next||{};}
  function renderCats(){
 ctx.$('categories').innerHTML=ctx.cats.map(([n,ic],i)=>{const d=ctx.state.directions.find(x=>x.name===n);return `<button type="button" class="category ${d?'selected':''}" data-category="${ctx.esc(n)}"><span class="cat-icon">${ic}</span><small>Направление ${i+1}</small><strong>${ctx.esc(n)}</strong><span class="mark">${d?'✓':'＋'}</span></button>`}).join('');
 ctx.$('selectionCount').textContent=ctx.state.directions.length;
 ctx.$('selectedDirections').innerHTML=ctx.state.directions.length?`<div class="selected-list"><b>Добавлено:</b>${ctx.state.directions.map((d,i)=>`<span>${ctx.esc(d.name)} · ${d.items.length} услуг</span>`).join('')}</div>`:'';
}
  function renderServiceDirections(){ ctx.$('serviceDirections').innerHTML=ctx.state.directions.map((d,i)=>`<button type="button" class="service-dir ${i===ctx.state.activeDirection?'active':''}" data-dir="${i}">${ctx.esc(d.name)} <b>${d.items.length}</b></button>`).join('') }
  function renderServices(){const d=ctx.activeDir();const cd=d?ctx.catalog.find(x=>x.name===d.name):null;const arr=cd?.services||[];ctx.$('services').innerHTML=d?(arr.map(x=>{const n=x.name,u=x.unit,yes=d.items.some(i=>i.name===n);return `<button type="button" class="service ${yes?'selected':''}" data-service="${ctx.esc(n)}" data-unit="${ctx.esc(u)}">${ctx.esc(n)}<small>Единица: ${ctx.esc(u)}</small><span class="check">${yes?'✓':'＋'}</span></button>`}).join('')||'<div class="empty">Для этого направления пока нет услуг. Добавьте их в Настройки.</div>'):'<div class="empty">Сначала выберите направление.</div>'}
  function renderItems(){
 const arr=ctx.allItems();
 ctx.$('calcCount').textContent=arr.length+' '+(arr.length===1?'позиция':arr.length<5?'позиции':'позиций');
 if(!arr.length){ctx.$('items').innerHTML='<div class="empty calc-empty"><b style="color:var(--ink)">Расчёт пока пуст</b><div style="margin-top:5px">Добавьте услуги кнопкой ниже — можно выбрать любое направление прямо здесь.</div></div>';ctx.$('total').textContent='0.00 MDL';return}
 ctx.$('items').innerHTML=ctx.state.directions.map((d,di)=>{
   if(!d.items.length)return '';
   const sub=d.items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0);
   return `<section class="calc-group"><div class="calc-group-head"><div><strong>${ctx.esc(d.name)}</strong><span style="display:block;margin-top:3px">${d.items.length} ${d.items.length===1?'позиция':d.items.length<5?'позиции':'позиций'}</span></div><span class="calc-subtotal">${ctx.money(sub)} MDL</span></div>${d.items.map((x,i)=>`<div class="calc-row"><div class="calc-row-top"><div><div class="calc-name">${ctx.esc(x.name)}</div><div class="calc-unit">За единицу: ${ctx.esc(x.unit)}</div></div><button type="button" class="calc-delete" data-delete="${x.id}" aria-label="Удалить услугу">×</button></div><div class="calc-fields"><div class="calc-field"><label>Количество</label><div class="calc-stepper"><button type="button" data-minus="${x.id}">−</button><input data-qty="${x.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${x.qty}" autocomplete="off"><button type="button" data-plus="${x.id}">＋</button></div></div><div class="calc-field"><label>Цена за ${ctx.esc(x.unit)}</label><div class="calc-price"><input data-price="${x.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${x.price}" autocomplete="off"><span>MDL</span></div></div></div><div class="calc-line"><span>Сумма позиции</span><b data-line-total="${x.id}">${ctx.money(x.qty*x.price)} MDL</b></div></div>`).join('')}</section>`;
 }).join('');
 ctx.$('total').textContent=ctx.money(ctx.total())+' MDL';
}
  function renderCalcDirectionPicker(){const list=ctx.catalog.map(d=>[d.name,d.icon||'•']);ctx.$('calcDirectionList').innerHTML=list.map(([n,ic])=>{const added=ctx.state.directions.some(d=>d.name===n);return `<button type="button" class="direction-picker-item ${added?'is-added':''}" data-calc-new-direction="${ctx.esc(n)}"><span class="mini-icon">${ic}</span><b>${ctx.esc(n)}</b>${added?'<small>Уже добавлено</small>':''}</button>`}).join('')}
  function renderCalcPicker(){
 const dirs=ctx.$('calcPickerDirs'), services=ctx.$('calcPickerServices');
 dirs.innerHTML=ctx.state.directions.map((d,i)=>`<button type="button" class="calc-picker-dir ${i===ctx.state.activeDirection?'active':''}" data-calc-dir="${i}">${ctx.esc(d.name)}</button>`).join('');
 const d=ctx.activeDir();
 if(!d){services.innerHTML='<div class="empty">Сначала добавьте направление.</div>';return}
 const cd=ctx.catalog.find(x=>x.name===d.name), list=cd?.services||[];
 services.innerHTML=list.length?list.map(x=>{const n=x.name,u=x.unit,added=d.items.some(i=>i.name===n);return `<button type="button" class="calc-picker-service ${added?'added':''}" data-calc-service="${ctx.esc(n)}" data-calc-unit="${ctx.esc(u)}"><span><b>${ctx.esc(n)}</b><small>${ctx.esc(u)}</small></span><span>${added?'✓':'＋'}</span></button>`}).join(''):'<div class="empty">Для этого направления нет услуг в каталоге.</div>';
}
  function renderReview(){const c=ctx.contactData();let html=`<div class="review-row"><span>Клиент</span><b>${ctx.esc(c.client||'—')}</b></div><div class="review-row"><span>Телефон</span><b>${ctx.esc(c.phone||'—')}</b></div><div class="review-row"><span>Город</span><b>${ctx.esc(c.city||'—')}</b></div><div class="review-row"><span>Адрес</span><b>${ctx.esc(c.address||'—')}</b></div>`;ctx.state.directions.forEach(d=>{html+=`<div class="review-row"><span><b>${ctx.esc(d.name)}</b></span><b>${ctx.money(d.items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0))} MDL</b></div>`;d.items.forEach((x,i)=>html+=`<div class="review-row"><span>${i+1}. ${ctx.esc(x.name)}<br><small style="color:#718096">${x.qty} ${ctx.esc(x.unit)} × ${ctx.money(x.price)} MDL</small></span><b>${ctx.money(x.qty*x.price)} MDL</b></div>`)});html+=`<div class="review-row"><span><b>ИТОГО</b></span><b>${ctx.money(ctx.total())} MDL</b></div>`;ctx.$('review').innerHTML=html}
  window.MGEstimateUI={init,renderCats,renderServiceDirections,renderServices,renderItems,renderCalcDirectionPicker,renderCalcPicker,renderReview};
})();
