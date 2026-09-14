/* Master Group v143 — estimate UI */
(()=>{
  let ctx=null;
  function init(next){ctx=next||{};}
  function renderCats(){
 const descriptions={
   'Клининг участка':'Уборка территории, вывоз мусора, уход за участком',
   'Установка видеонаблюдения':'Монтаж и настройка систем видеонаблюдения',
   'Металлоконструкции и сварка':'Изготовление и монтаж металлоконструкций',
   'Сантехнические работы':'Монтаж и ремонт сантехники, водопровода, канализации'
 };
 const iconSvg=(icon,name)=>{
   if(window.MGIconSVG) return window.MGIconSVG(icon,name);
   const key=String(icon||'').toLowerCase();
   const map={
     '🌿':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 36c8-1 15-7 18-15M13 32c-3-6-1-12 5-17 5 6 5 11 1 16M21 25c2-7 7-11 14-12 0 8-4 13-12 15"/></svg>`,
     '📹':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 17h24v15H8zM32 21l9-5v17l-9-5zM14 17l3-5h8l3 5"/></svg>`,
     '⚙️':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 8h12l2 6 5 3 5-2 4 9-5 4v6l5 4-4 9-5-2-5 3-2 6H18l-2-6-5-3-5 2-4-9 5-4v-6l-5-4 4-9 5 2 5-3z"/><circle cx="24" cy="27" r="6"/></svg>`,
     '🔧':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M31 10a10 10 0 0 0 1 12L16 38a5 5 0 0 1-7-7l16-16a10 10 0 0 0 12-1l-5 5 5 5 5-5a10 10 0 0 0-11-9z"/><path d="M34 34l5 5M37 31l5 5"/></svg>`,
     'clean':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 36c8-1 15-7 18-15M14 32c-3-6-1-12 5-17 5 6 5 11 1 16M22 25c2-7 7-11 14-12 0 8-4 13-12 15"/></svg>`,
     'camera':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 18h25v15H7zM32 22l9-5v17l-9-5zM13 18l3-5h8l3 5"/></svg>`,
     'metal':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 13h32v7H27v6h13v7H27v8H19V20H8z"/></svg>`,
     'plumbing':`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M31 9a10 10 0 0 0 1 12L16 37a5 5 0 0 1-7-7l16-16a10 10 0 0 0 12-1l-5 5 5 5 5-5a10 10 0 0 0-11-9z"/><path d="M35 34c0 4-5 6-5 10h10c0-4-5-6-5-10z"/></svg>`
   };
   if(map[key]) return map[key];
   if(/клининг/i.test(name)) return map.clean;
   if(/видеонаблюдение/i.test(name)) return map.camera;
   if(/металлоконструкции|сварка/i.test(name)) return map.metal;
   if(/сантех/i.test(name)) return map.plumbing;
   return `<span class="icon-fallback">${ctx.esc(icon||'•')}</span>`;
 };
 ctx.$('categories').innerHTML=ctx.cats.map(([n,ic],i)=>{
   const d=ctx.state.directions.find(x=>x.name===n), selected=!!d;
   const desc=descriptions[n]||'Работы и услуги по выбранному направлению';
   return `<button type="button" class="category ${selected?'selected':''}" data-category="${ctx.esc(n)}">
     <span class="cat-icon">${iconSvg(ic,n)}</span>
     <span class="category-copy"><strong>${ctx.esc(n)}</strong><em>${ctx.esc(desc)}</em></span>
     <span class="category-chevron">›</span><span class="mark">${selected?'✓':''}</span>
   </button>`
 }).join('');
 ctx.$('selectionCount').innerHTML=`<b>${ctx.state.directions.length}</b><small>выбрано</small>`;
 ctx.$('selectedDirections').innerHTML='';
 const count=ctx.state.directions.length;
 const label=ctx.$('directionSelectedLabel'),hint=ctx.$('directionSelectedHint');
 if(label) label.textContent=`Выбрано: ${count}`;
 if(hint) hint.textContent=count?'Можно выбрать ещё направления':'Выберите хотя бы одно направление';
 const btn=document.querySelector('#step1 .direction-continue');
 if(btn){btn.classList.toggle('is-disabled',count===0);btn.setAttribute('aria-disabled',count===0?'true':'false')}
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
  function renderCalcDirectionPicker(){const list=ctx.catalog.map(d=>[d.name,d.icon||'•']);ctx.$('calcDirectionList').innerHTML=list.map(([n,ic])=>{const added=ctx.state.directions.some(d=>d.name===n);return `<button type="button" class="direction-picker-item ${added?'is-added':''}" data-calc-new-direction="${ctx.esc(n)}"><span class="mini-icon">${window.MGIconSVG?window.MGIconSVG(ic,n):ic}</span><b>${ctx.esc(n)}</b>${added?'<small>Уже добавлено</small>':''}</button>`}).join('')}
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
