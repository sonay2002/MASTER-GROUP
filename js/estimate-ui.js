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
   if(typeof window.MGIconSVG==='function') return window.MGIconSVG(icon,name);
   // Last-resort fallback still uses the approved PNG assets; never draw legacy SVGs or show emoji/text keys.
   const aliases={"🌿":"landscape","📹":"camera","⚙️":"metal","🔧":"plumbing","bolt":"electrical","home":"construction","brick":"masonry","brush":"finishing","snow":"aircon","drain":"sewer","tree":"landscape","case":"other","car":"transport","drill":"tools","dril":"tools"};
   const allowed=new Set(['clean','camera','plumbing','electrical','construction','masonry','welding','metal','paint','aircon','heating','ventilation','window','roof','finishing','landscape','excavator','transport','sewer','water','fence','flooring','tools','other']);
   let key=String(icon||'').trim().toLowerCase();
   if(aliases[key]) key=aliases[key];
   if(!allowed.has(key)){
     const n=String(name||'').toLowerCase();
     const rules=[[/клининг|уборк/,'clean'],[/видео|камер/,'camera'],[/сантех|труб/,'plumbing'],[/электрик|кабел/,'electrical'],[/строитель|стройк/,'construction'],[/кладк|кирпич/,'masonry'],[/сварк/,'welding'],[/металл/,'metal'],[/покраск|маляр/,'paint'],[/кондиционер|климат/,'aircon'],[/отоплен|радиатор/,'heating'],[/вентиляц/,'ventilation'],[/окн|двер/,'window'],[/кровл|крыша/,'roof'],[/отделоч/,'finishing'],[/дрель|монтаж/,'tools'],[/ландшафт|газон|дерев/,'landscape'],[/землян|экскават/,'excavator'],[/перевоз|вывоз|транспорт/,'transport'],[/канализац/,'sewer'],[/водоснаб|вода/,'water'],[/забор|огражден/,'fence'],[/наполь|пол/,'flooring'],[/инструмент|ремонт/,'tools']];
     key=(rules.find(([re])=>re.test(n))||[])[1]||'other';
   }
   const label=String(name||key).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
   return `<img src="./icons/direction-approved/${key}.png" class="mg-work-icon-image" alt="${label}" draggable="false" decoding="async">`;
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

  function renderDirectionServiceModal(){
    const overlay=ctx.$('directionServiceOverlay');
    const list=ctx.$('directionServiceList');
    const title=ctx.$('directionServiceTitle');
    const subtitle=ctx.$('directionServiceSubtitle');
    const icon=ctx.$('directionServiceIcon');
    const d=ctx.state.directions?.[ctx.state.activeDirection] || (ctx.state.pendingDirectionName ? {name:ctx.state.pendingDirectionName,items:[]} : null);
    if(!overlay||!list||!d)return;
    try{window.__mgResetServiceAi?.()}catch(_){}
    const cd=ctx.catalog.find(x=>x.name===d.name);
    const services=cd?.services||[];
    if(title)title.textContent=d.name;
    if(subtitle)subtitle.textContent='Выберите нужные услуги этого направления.';
    if(icon)icon.innerHTML=directionIcon(d);
    list.innerHTML=services.length?services.map(x=>{
      const n=x.name,u=x.unit,yes=d.items.some(item=>item.name===n);
      return `<button type="button" class="direction-service-row ${yes?'selected':''}" data-direction-service="${ctx.esc(n)}" data-direction-unit="${ctx.esc(u)}">
        <span class="direction-service-copy"><b>${ctx.esc(n)}</b><small>${ctx.esc(u)}</small></span>
        <span class="direction-service-check">${yes?'✓':''}</span>
      </button>`;
    }).join(''):'<div class="direction-service-empty">Для этого направления пока нет услуг в каталоге.</div>';
    const quick=ctx.$('directionServiceQuickInput');
    if(quick)quick.value='';
    const ai=ctx.$('directionServiceAiSuggestion');
    if(ai)ai.hidden=false;
    const aiStatus=ctx.$('directionServiceAiStatus');
    if(aiStatus)aiStatus.textContent='AI готов к работе';
    const aiMain=ai?.querySelector('[data-ai-apply]');
    if(aiMain){aiMain.textContent='Введите название услуги — AI поможет исправить';aiMain.disabled=true;aiMain.dataset.aiApply='';}
  }
  function openDirectionServiceModal(){
    const overlay=ctx.$('directionServiceOverlay');
    if(!overlay)return;
    renderDirectionServiceModal();
    overlay.hidden=false;
    requestAnimationFrame(()=>overlay.classList.add('open'));
  }
  function closeDirectionServiceModal(){
    try{window.__mgResetServiceAi?.()}catch(_){}
    const overlay=ctx.$('directionServiceOverlay');
    if(!overlay)return;
    // A direction is considered selected only after at least one service is chosen.
    // Closing an untouched temporary direction must not leave a phantom checkmark.
    if(ctx.state.pendingDirectionName){
      ctx.state.pendingDirectionName=null;
      if(!ctx.state.directions.length)ctx.state.activeDirection=0;
      renderCats();
    }
    overlay.classList.remove('open');
    setTimeout(()=>{overlay.hidden=true},160);
  }
  function removeActiveDirection(){
    if(ctx.state.pendingDirectionName){
      ctx.state.pendingDirectionName=null;
      ctx.state.activeDirection=Math.max(0,ctx.state.directions.length-1);
      closeDirectionServiceModal();
      renderCats();
      return;
    }
    const i=Number(ctx.state.activeDirection);
    if(!Number.isInteger(i)||i<0||!ctx.state.directions[i])return;
    ctx.state.directions.splice(i,1);
    ctx.state.activeDirection=Math.max(0,Math.min(i,ctx.state.directions.length-1));
    closeDirectionServiceModal();
    renderCats();
    renderItems();
  }

  function renderServiceDirections(){
    const root=ctx.$('serviceDirections');
    if(!root)return;
    const dirs=ctx.state.directions||[];
    if(!dirs.length){
      root.innerHTML='<div class="empty">Сначала выберите направление.</div>';
      return;
    }
    const active=Math.max(0,Math.min(Number(ctx.state.activeDirection)||0,dirs.length-1));
    ctx.state.activeDirection=active;
    root.innerHTML=dirs.map((d,i)=>{
      const isOpen=i===active;
      const cd=ctx.catalog.find(x=>x.name===d.name);
      const services=cd?.services||[];
      const serviceRows=services.length?services.map(x=>{
        const n=x.name,u=x.unit,yes=d.items.some(item=>item.name===n);
        return `<button type="button" class="mg-service-row ${yes?'selected':''}" data-service="${ctx.esc(n)}" data-unit="${ctx.esc(u)}">
          <span class="mg-service-row-copy"><b>${ctx.esc(n)}</b><small>Единица: ${ctx.esc(u)}</small></span>
          <span class="mg-service-check">${yes?'✓':'＋'}</span>
        </button>`;
      }).join(''):'<div class="mg-services-empty">Для этого направления пока нет услуг. Добавьте их в Настройки.</div>';
      return `<section class="mg-direction-accordion ${isOpen?'is-open':''}" data-direction-panel="${i}">
        <button type="button" class="mg-direction-toggle" data-dir="${i}" aria-expanded="${isOpen}">
          <span class="mg-direction-icon">${directionIcon(d)}</span>
          <span class="mg-direction-name">${ctx.esc(d.name)}</span>
          <span class="mg-direction-count">${d.items.length}</span>
          <span class="mg-direction-chevron" aria-hidden="true">${isOpen?'⌃':'›'}</span>
        </button>
        ${isOpen?`<div class="mg-direction-services">${serviceRows}</div>`:''}
      </section>`;
    }).join('');
    // The accordion now owns the service list. Keep the legacy container empty so old layout/styles cannot duplicate it.
    const legacy=ctx.$('services');
    if(legacy)legacy.innerHTML='';
  }
  function renderServices(){ renderServiceDirections(); }
  function calcServiceIcon(name,unit){
    const n=String(name||'').toLowerCase();
    if(/трав|газон|кос|озелен|дерев|куст|сад/.test(n)) return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 38c4-9 7-18 5-28M17 38c3-8 5-14 3-23M25 38c1-9 5-17 13-21M12 30c-5-4-7-8-7-13M20 28c-4-4-5-8-4-13M30 28c5-3 8-7 9-12"/></svg>';
    if(/виде|камер|наблюден/.test(n)) return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 16h24v17H7zM31 21l10-5v17l-10-5zM13 16l3-5h8l3 5"/></svg>';
    if(/убор|клининг|мусор/.test(n)) return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 14h24M17 14l2 25h10l2-25M20 9h8l2 5M21 20v12M27 20v12"/></svg>';
    if(/свар|металл|конструк/.test(n)) return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 12h30v7H26v7h13v7H26v7h-8V19H9z"/></svg>';
    if(/сантех|тру|вод|кран|канализ/.test(n)) return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M31 8a10 10 0 0 0 1 13L16 37a5 5 0 0 1-7-7l16-16a10 10 0 0 0 12-1l-5 5 5 5 5-5A10 10 0 0 0 31 8z"/></svg>';
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 13h28v22H10zM16 8h16M16 21h16M16 28h10"/></svg>';
  }
  function approvedDirectionIcon(icon,name=''){
    if(typeof window.MGIconSVG==='function') return window.MGIconSVG(icon,name);
    const known=new Set(['clean','camera','plumbing','electrical','construction','masonry','welding','metal','paint','aircon','heating','ventilation','window','roof','finishing','landscape','excavator','transport','sewer','water','fence','flooring','tools','other']);
    const aliases={"🌿":"landscape","📹":"camera","⚙️":"metal","🔧":"plumbing","bolt":"electrical","home":"construction","brick":"masonry","brush":"finishing","snow":"aircon","drain":"sewer","tree":"landscape","case":"other","car":"transport","drill":"tools","dril":"tools"};
    let key=String(icon||'').trim().toLowerCase();
    if(aliases[key]) key=aliases[key];
    if(!known.has(key)) key='other';
    const alt=String(name||key).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<img src="./icons/direction-approved/${key}.png" class="mg-work-icon-image" alt="${alt}" draggable="false" decoding="async">`;
  }
  function directionIcon(d){ return approvedDirectionIcon(d?.icon||'', d?.name||''); }

  function renderItems(){
    const arr=ctx.allItems();
    const categoryCount=ctx.state.directions.filter(d=>d.items.length).length;
    ctx.$('calcCount').textContent=arr.length+' '+(arr.length===1?'позиция':arr.length<5?'позиции':'позиций')+' · '+categoryCount+' '+(categoryCount===1?'категория':'категории');
    if(!arr.length){
      ctx.$('items').innerHTML='<div class="empty calc-empty"><b style="color:var(--ink)">Расчёт пока пуст</b><div style="margin-top:5px">Добавьте позицию кнопкой выше.</div></div>';
      ctx.$('total').textContent='0.00 MDL';
      return;
    }
    const collapsed=window.__mgCalcCollapsed||{};
    ctx.$('items').innerHTML=ctx.state.directions.map((d,di)=>{
      if(!d.items.length)return '';
      const sub=d.items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0);
      const isCollapsed=collapsed[di]===true;
      return `<section class="calc-group ${isCollapsed?'is-collapsed':''}" data-calc-group="${di}">
        <button type="button" class="calc-group-head" data-calc-collapse="${di}" aria-expanded="${!isCollapsed}">
          <span class="calc-direction-icon">${directionIcon(d)}</span>
          <span class="calc-group-title"><strong>${ctx.esc(d.name)}</strong><span>${d.items.length} ${d.items.length===1?'позиция':d.items.length<5?'позиции':'позиций'}</span></span>
          <span class="calc-subtotal">${ctx.money(sub)} MDL</span><span class="calc-chevron">⌃</span>
        </button>
        <div class="calc-group-body">${d.items.map(x=>`<article class="calc-row">
          <div class="calc-row-top"><div class="calc-service-main"><span class="calc-service-icon">${calcServiceIcon(x.name,x.unit)}</span><div><div class="calc-name">${ctx.esc(x.name)}</div><span class="calc-unit">${ctx.esc(x.unit)}</span></div></div><button type="button" class="calc-delete" data-delete="${x.id}" aria-label="Удалить услугу">×</button></div>
          <div class="calc-fields"><div class="calc-field"><label>Количество</label><div class="calc-stepper"><button type="button" data-minus="${x.id}">−</button><input data-qty="${x.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${x.qty}" autocomplete="off"><button type="button" data-plus="${x.id}">＋</button></div></div><div class="calc-field"><label>Цена за единицу</label><div class="calc-price"><input data-price="${x.id}" type="number" inputmode="decimal" min="0" step="0.01" value="${x.price}" autocomplete="off"><span>MDL</span></div></div></div>
          <div class="calc-line"><span>Итого</span><b data-line-total="${x.id}">${ctx.money(x.qty*x.price)} MDL</b></div>
        </article>`).join('')}</div>
      </section>`;
    }).join('');
    ctx.$('total').textContent=ctx.money(ctx.total())+' MDL';
  }
  function renderCalcDirectionPicker(){const list=ctx.catalog.map(d=>[d.name,d.icon||'•']);ctx.$('calcDirectionList').innerHTML=list.map(([n,ic])=>{const added=ctx.state.directions.some(d=>d.name===n);return `<button type="button" class="direction-picker-item ${added?'is-added':''}" data-calc-new-direction="${ctx.esc(n)}"><span class="mini-icon">${approvedDirectionIcon(ic,n)}</span><b>${ctx.esc(n)}</b>${added?'<small>Уже добавлено</small>':''}</button>`}).join('')}
  function renderCalcPicker(){
 const dirs=ctx.$('calcPickerDirs'), services=ctx.$('calcPickerServices');
 dirs.innerHTML=ctx.state.directions.map((d,i)=>`<button type="button" class="calc-picker-dir ${i===ctx.state.activeDirection?'active':''}" data-calc-dir="${i}">${ctx.esc(d.name)}</button>`).join('');
 const d=ctx.activeDir();
 if(!d){services.innerHTML='<div class="empty">Сначала добавьте направление.</div>';return}
 const cd=ctx.catalog.find(x=>x.name===d.name), list=cd?.services||[];
 services.innerHTML=list.length?list.map(x=>{const n=x.name,u=x.unit,added=d.items.some(i=>i.name===n);return `<button type="button" class="calc-picker-service ${added?'added':''}" data-calc-service="${ctx.esc(n)}" data-calc-unit="${ctx.esc(u)}"><span><b>${ctx.esc(n)}</b><small>${ctx.esc(u)}</small></span><span>${added?'✓':'＋'}</span></button>`}).join(''):'<div class="empty">Для этого направления нет услуг в каталоге.</div>';
}
  function renderReview(){const c=ctx.contactData();let html=`<div class="review-row"><span>Клиент</span><b>${ctx.esc(c.client||'—')}</b></div><div class="review-row"><span>Телефон</span><b>${ctx.esc(c.phone||'—')}</b></div><div class="review-row"><span>Адрес</span><b>${ctx.esc(c.address||'—')}</b></div>`;ctx.state.directions.forEach(d=>{html+=`<div class="review-row"><span><b>${ctx.esc(d.name)}</b></span><b>${ctx.money(d.items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0))} MDL</b></div>`;d.items.forEach((x,i)=>html+=`<div class="review-row"><span>${i+1}. ${ctx.esc(x.name)}<br><small style="color:#718096">${x.qty} ${ctx.esc(x.unit)} × ${ctx.money(x.price)} MDL</small></span><b>${ctx.money(x.qty*x.price)} MDL</b></div>`)});html+=`<div class="review-row"><span><b>ИТОГО</b></span><b>${ctx.money(ctx.total())} MDL</b></div>`;ctx.$('review').innerHTML=html}
  window.MGEstimateUI={init,renderCats,renderDirectionServiceModal,openDirectionServiceModal,closeDirectionServiceModal,removeActiveDirection,renderServiceDirections,renderServices,renderItems,renderCalcDirectionPicker,renderCalcPicker,renderReview};
})();
