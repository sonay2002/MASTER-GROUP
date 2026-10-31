/* Master Group v178 — Settings + Company tab + Deleted Estimates Trash */
(()=>{
  'use strict';
  const TRASH='master_group_deleted_estimates_v1';
  const TAB='master_group_settings_tab_v1';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>(Number(n)||0).toFixed(2);
  const readTrash=()=>{try{const a=JSON.parse(localStorage.getItem(TRASH)||'[]');return Array.isArray(a)?a:[]}catch{return[]}};
  const writeTrash=a=>localStorage.setItem(TRASH,JSON.stringify(a.slice(0,100)));
  const saved=()=>window.MGStorage?.saved?.()||[];
  const persist=a=>window.MGStorage?.persist?.(a)!==false;
  function openSettings(){
    try{ $('drawerOverlay')?.classList.remove('open'); document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='settingsScreen'); window.MGState&&(window.MGState.screen='settingsScreen'); window.MGAppCore?.renderSettings?.(); if(window.__mgSettingsShowHub) window.__mgSettingsShowHub(); else { const tab=localStorage.getItem(TAB)||'catalog'; setTab(tab); window.scrollTo(0,0); } }
    catch(e){ console.warn(e); document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='settingsScreen'); }
  }
  function setTab(tab){
    if(window.__mgSettingsShowSection){ window.__mgSettingsShowSection(tab); return; }
    if(tab==='estimates'){
      // «Сметы» — отдельная вкладка настроек для выбора шаблона документа.
      localStorage.setItem(TAB,'estimates');
      document.querySelectorAll('[data-settings-tab]').forEach(b=>{
        const active=b.dataset.settingsTab==='estimates';
        b.classList.toggle('active',active);
        b.setAttribute('aria-selected',active?'true':'false');
      });
      const c=$('settingsPanelCatalog'), co=$('settingsPanelCompany'), t=$('settingsPanelTrash'), u=$('settingsPanelUpdates'), es=$('settingsPanelEstimates');
      if(c)c.hidden=true; if(co)co.hidden=true; if(t)t.hidden=true; if(u)u.hidden=true; if(es)es.hidden=false;
      return;
    }
    if(!['catalog','company','trash','updates'].includes(tab))tab='catalog';
    localStorage.setItem(TAB,tab);
    document.querySelectorAll('[data-settings-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.settingsTab===tab);b.setAttribute('aria-selected',b.dataset.settingsTab===tab?'true':'false')});
    const c=$('settingsPanelCatalog'), co=$('settingsPanelCompany'), t=$('settingsPanelTrash'), u=$('settingsPanelUpdates'), es=$('settingsPanelEstimates');
    if(c)c.hidden=tab!=='catalog'; if(co)co.hidden=tab!=='company'; if(t)t.hidden=tab!=='trash'; if(u)u.hidden=tab!=='updates'; if(es)es.hidden=true;
    if(tab==='company') window.v58RenderCompany?.();
    if(tab==='trash') renderTrash();
  }
  function formatDate(ts){try{return ts?new Date(ts).toLocaleString('ru-RU'):'—'}catch{return '—'}}
  function itemLines(e){
    const dirs=Array.isArray(e.directions)?e.directions:[];
    const rows=[]; dirs.forEach(d=>(d.items||[]).forEach(x=>rows.push({direction:d.name||'',name:x.name||'',qty:x.qty||0,unit:x.unit||'',price:x.price||0,total:(Number(x.qty)||0)*(Number(x.price)||0)})));
    if(!rows.length && Array.isArray(e.items)) e.items.forEach(x=>rows.push({direction:e.category||'',name:x.name||'',qty:x.qty||0,unit:x.unit||'',price:x.price||0,total:(Number(x.qty)||0)*(Number(x.price)||0)}));
    return rows;
  }
  function renderTrash(){
    const el=$('deletedEstimatesList'), count=$('trashCount'); if(!el)return;
    const a=readTrash(); if(count)count.textContent=a.length;
    if(!a.length){el.innerHTML='<div class="settings-empty settings-empty-main">Корзина пуста. Удалённые сметы появятся здесь.</div>';return;}
    el.innerHTML=a.map(e=>{
      const rows=itemLines(e), dirs=(e.directions||[]).map(d=>d.name).filter(Boolean).join(' · ')||e.category||'Без направления';
      return `<article class="estimate-card trash-estimate-card"><div class="estimate-main"><div class="estimate-badge">MG</div><div class="estimate-info"><b>Смета №${esc(String(e.number||e.estimateNumber||'—').replace(/^№\s*/,''))}</b><span>${esc(e.date||'')} · ${money(e.total)} MDL</span><small>${esc(e.client||'Без клиента')} · ${esc(e.phone||'Без телефона')}</small><small>${e.address?'· '+esc(e.address):''}</small><small>${esc(dirs)} · ${rows.length} позиций</small><small>Удалена: ${formatDate(e._deletedAt)}</small></div></div><div class="estimate-actions"><button type="button" class="btn secondary" data-trash-view="${esc(String(e.id))}">Посмотреть</button><button type="button" class="btn primary" data-trash-restore="${esc(String(e.id))}">Восстановить</button><button type="button" class="btn danger" data-trash-delete="${esc(String(e.id))}">Удалить навсегда</button></div></article>`;
    }).join('');
  }
  function find(id){return readTrash().find(e=>String(e.id)===String(id))}
  function viewTrash(id){
    const e=find(id); if(!e)return;
    const rows=itemLines(e); const dirs=(e.directions||[]).map(d=>d.name).filter(Boolean).join(' · ')||e.category||'—';
    let html=`<div class="trash-detail-head"><div><div class="section-kicker">УДАЛЁННАЯ СМЕТА</div><h2>Смета №${esc(String(e.number||e.estimateNumber||'—').replace(/^№\s*/,''))}</h2><p class="muted">${esc(e.date||'')} · ${money(e.total)} MDL</p></div></div><div class="trash-detail-grid"><div><b>Клиент</b><span>${esc(e.client||'—')}</span></div><div><b>Телефон</b><span>${esc(e.phone||'—')}</span></div><div><b>Адрес</b><span>${esc(e.address||e.object||'—')}</span></div><div><b>Направления</b><span>${esc(dirs)}</span></div><div><b>Статус</b><span>${esc(e.status||'—')}</span></div><div><b>Аванс</b><span>${money(e.paid)} MDL</span></div><div><b>Остаток</b><span>${money(e.balance)} MDL</span></div></div><h3 style="margin-top:20px">Услуги</h3><div class="trash-items">${rows.length?rows.map((x,i)=>`<div class="trash-item"><span>${i+1}. ${esc(x.direction?x.direction+' — ':'')}${esc(x.name)}</span><span>${esc(String(x.qty))} ${esc(x.unit)} × ${money(x.price)} = ${money(x.total)} MDL</span></div>`).join(''):'<div class="muted">Позиции не найдены.</div>'}</div><div class="trash-detail-actions"><button type="button" class="btn primary" data-trash-restore="${esc(String(e.id))}">Восстановить смету</button><button type="button" class="btn secondary" data-trash-close-view>Закрыть</button></div>`;
    let modal=$('trashDetailModal'); if(!modal){modal=document.createElement('div');modal.id='trashDetailModal';modal.className='modal-overlay';document.body.appendChild(modal)} modal.innerHTML=`<div class="confirm-modal trash-detail-modal">${html}</div>`;modal.classList.add('open');
  }
  function restore(id){
    const e=find(id); if(!e)return;
    if(saved().some(x=>String(x.id)===String(id))){alert('Смета с таким ID уже существует.');return;}
    const clean=JSON.parse(JSON.stringify(e));delete clean._deletedAt;delete clean._deletedFrom;
    const a=readTrash().filter(x=>String(x.id)!==String(id));writeTrash(a);
    if(!persist([clean,...saved()])){writeTrash([e,...a]);return}
    try{const k='master_group_cloud_deleted_v1';const d=JSON.parse(localStorage.getItem(k)||'[]').filter(x=>String(x?.id)!==String(id));localStorage.setItem(k,JSON.stringify(d));}catch{}
    try{window.__mgCloudMarkDirty?.([String(id)]);window.__mgCloudFlushRestore?.(clean);}catch{}
    renderTrash();$('trashDetailModal')?.classList.remove('open');
    window.MGAppCore?.renderEstimates?.();
    if(window.MGState?.screen==='settingsScreen'){};
    const toast=window.__mgToast; if(typeof toast==='function')toast('Смета восстановлена');
  }
  function hardDelete(id){
    const e=find(id);if(!e)return;if(!confirm(`Удалить смету ${e.number||''} навсегда?\nВосстановить её после этого будет невозможно.`))return;
    const next=readTrash().filter(x=>String(x.id)!==String(id));writeTrash(next);try{window.__mgCloudHardDelete?.(String(id));}catch(_){}renderTrash();$('trashDetailModal')?.classList.remove('open');window.__mgToast?.('Смета удалена навсегда');
  }
  const handler=e=>{
    const t=e.target?.closest?.('[data-menu-action="settings"]'); if(t){e.preventDefault();e.stopImmediatePropagation();openSettings();return;}
    const tab=e.target?.closest?.('[data-settings-tab]'); if(tab){e.preventDefault();e.stopImmediatePropagation();setTab(tab.dataset.settingsTab);return;}
    const v=e.target?.closest?.('[data-trash-view]');if(v){viewTrash(v.dataset.trashView);return;}
    const r=e.target?.closest?.('[data-trash-restore]');if(r){restore(r.dataset.trashRestore);return;}
    const d=e.target?.closest?.('[data-trash-delete]');if(d){hardDelete(d.dataset.trashDelete);return;}
    if(e.target?.closest?.('[data-trash-close-view]')){$('trashDetailModal')?.classList.remove('open');return;}
  };
  document.addEventListener('click',handler,true);
  document.addEventListener('pointerup',handler,true);
  document.addEventListener('touchend',handler,true);
  window.__mgForceOpenSettings=openSettings;window.__mgOpenSettingsDirect=openSettings;window.__mgSettingsSetTab=setTab;window.__mgRenderTrash=renderTrash;
})();
