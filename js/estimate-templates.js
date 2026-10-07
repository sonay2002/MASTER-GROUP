(() => {
  const KEY='master_group_estimate_template_v2';
  const allowed=['template1','template2'];
  const designs=[
    {id:'template1',name:'Классическая',desc:'Все работы в одной таблице'},
    {id:'template2',name:'По разделам',desc:'Группы работ и подытог по каждому разделу'}
  ];
  const legacy={
    '1':'template1','2':'template2','template3':'template1','template4':'template2','template5':'template1',
    'template6':'template2','template7':'template2','template8':'template1','template9':'template1','template10':'template2',
    'neo':'template1','corporate':'template2','minimal':'template1','premium':'template2','accent':'template1',
    'classic':'template1','strict':'template1','compact':'template1','business':'template1','modern':'template1',
    'elegant':'template2','bordered':'template1','detailed':'template2'
  };
  const normalize=value=>{const v=String(value??'').trim().toLowerCase();return allowed.includes(v)?v:(legacy[v]||null)};
  const get=()=>{try{return normalize(localStorage.getItem(KEY))||normalize(localStorage.getItem('master_group_estimate_template_v1'))||'template1'}catch(_){return 'template1'}};
  const resolveForEstimate=estimate=>{try{const selected=normalize(localStorage.getItem(KEY))||normalize(localStorage.getItem('master_group_estimate_template_v1'));if(selected)return selected}catch(_){}return normalize(estimate?.template)||'template1'};
  const set=value=>{
    const v=normalize(value)||'template1';
    try{localStorage.setItem(KEY,v);localStorage.removeItem('master_group_estimate_template_v1')}catch(_){}
    render(v);
    try{const app=window.MGAppCore,current=app?.state?.estimate;if(current){const updated={...current,template:v};app.state.estimate=updated;if(current.id&&typeof app.saved==='function'&&typeof app.persist==='function'){const list=app.saved(),i=list.findIndex(x=>String(x?.id)===String(current.id));if(i>=0){list[i]={...list[i],template:v};app.persist(list);try{if(typeof window.__mgCloudSaveEstimate==='function')window.__mgCloudSaveEstimate(updated)}catch(_){}}}}}catch(_){}
    try{window.dispatchEvent(new CustomEvent('mg-estimate-template-changed',{detail:{template:v}}))}catch(_){}
    return v;
  };
  const sample=[
    {direction:'Каркас',name:'Изготовление стального каркаса навеса',unit:'компл.',price:'18 500',qty:'1',sum:'18 500'},
    {direction:'Каркас',name:'Грунтовка антикоррозийная',unit:'м²',price:'120',qty:'32',sum:'3 840'},
    {direction:'Монтаж',name:'Монтаж каркаса на объекте',unit:'компл.',price:'6 200',qty:'1',sum:'6 200'},
    {direction:'Кровля',name:'Поликарбонат с комплектующими',unit:'м²',price:'980',qty:'24',sum:'23 520'}
  ];
  const preview=id=>{
    const grouped=id==='template2';
    const heads=grouped?['№','Работа / услуга','Ед.','Цена за ед.','Кол-во','Сумма']:['№','Направление','Работа / услуга','Ед.','Цена за ед.','Кол-во','Сумма'];
    let n=1,body='';
    if(grouped){
      const groups=[['КАРКАС',sample.slice(0,2),'22 340'],['МОНТАЖ',sample.slice(2,3),'6 200'],['КРОВЛЯ',sample.slice(3),'23 520']];
      for(const [title,items,subtotal] of groups){body+=`<tr class="tpl-section-row"><th colspan="6">${title}</th></tr>`;for(const x of items)body+=`<tr><td>${n++}</td><td>${x.name}</td><td>${x.unit}</td><td>${x.price}</td><td>${x.qty}</td><td>${x.sum}</td></tr>`;body+=`<tr class="tpl-subtotal-row"><td colspan="5">Подытог раздела</td><td>${subtotal}</td></tr>`}
    }else body=sample.map(x=>`<tr><td>${n++}</td><td>${x.direction}</td><td>${x.name}</td><td>${x.unit}</td><td>${x.price}</td><td>${x.qty}</td><td>${x.sum}</td></tr>`).join('');
    const total=grouped?'52 060':'52 060';
    return `<div class="estimate-template-preview"><div class="new-tpl-page ${id}"><div class="tpl-head"><span>СМЕТА № MG-0148</span><b>MASTER GROUP</b></div><div class="tpl-client"><b>КЛИЕНТ</b><span>Александр Иванов</span><small>Навес во дворе · Кишинёв</small></div><table><thead><tr>${heads.map((x,i)=>`<th class="${i===0||i>=3?'numeric':''}">${x}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><div class="tpl-total"><span>ИТОГО:</span><b>${total} MDL</b></div></div></div>`;
  };
  const render=(value=get())=>{
    const list=document.getElementById('estimateTemplateList');
    if(list&&!list.dataset.generated){
      list.innerHTML=designs.map((d,i)=>`<article class="estimate-template-card" data-estimate-template="${d.id}"><div class="estimate-template-card-head"><div><span class="estimate-template-number">0${i+1}</span><div><b>${d.name}</b><small>${d.desc}</small></div></div><button type="button" class="estimate-template-select" data-select-estimate-template="${d.id}">Выбрать</button></div>${preview(d.id)}</article>`).join('');
      list.dataset.generated='true';
    }
    document.querySelectorAll('[data-estimate-template]').forEach(card=>{const active=card.dataset.estimateTemplate===value;card.classList.toggle('is-selected',active);const button=card.querySelector('[data-select-estimate-template]');if(button){button.textContent=active?'Выбран':'Выбрать';button.setAttribute('aria-pressed',active?'true':'false')}});
  };
  const openSettings=()=>document.querySelector('[data-settings-tab="estimates"]')?.click();
  document.addEventListener('click',event=>{const button=event.target.closest('[data-select-estimate-template]');if(!button)return;event.preventDefault();event.stopPropagation();set(button.dataset.selectEstimateTemplate);const name=button.closest('[data-estimate-template]')?.querySelector('.estimate-template-card-head b')?.textContent||'Шаблон',toast=document.getElementById('toast');if(toast){toast.textContent=`Выбран шаблон: ${name}`;toast.classList.add('show');clearTimeout(window.__mgTemplateToastTimer);window.__mgTemplateToastTimer=setTimeout(()=>toast.classList.remove('show'),1800)}},true);
  window.MGEstimateTemplates={KEY,get,set,render,openSettings,resolveForEstimate,allowed:allowed.slice()};
  render();
})();
window.addEventListener('mg-estimate-template-changed',()=>{try{const core=window.MGAppCore,e=core?.state?.estimate;if(e&&core?.state?.screen==='documentScreen'&&typeof core.documentBody==='function')core.documentBody(e)}catch(err){console.warn('MG template refresh failed',err)}});
