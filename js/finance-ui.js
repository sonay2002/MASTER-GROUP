(()=>{
const C=window.MGAppCore||{};
const {state,catalog,$,esc,money,uid,contactData,setContact,toast,saved,persist,drafts,persistDrafts,allItems,total,normalizeDirections,allItemsFromEstimate,screen,renderCats,renderServiceDirections,renderServices,renderItems,renderReview,activeDir,showArchives,showStats,showSettings,showEstimates,renderEstimates,dashboard,load,editSaved,openSaved,deleteSaved,archiveCurrent,discardCurrent,askArchive,resumeDraft,removeDraft}=C;
const F=window.MGAppFinance=window.MGAppFinance||{};
/* v58 integrated features */
const V58_STATUS=['Черновик','Отправлена','В работе','Выполнена','Отменена'],V58_COMPANY='master_group_company_v1',V58_FILTER='master_group_status_filter_v1';
let v58Filter=localStorage.getItem(V58_FILTER)||'Все';
const v58n=window.MGCalculations.number, v58st=e=>V58_STATUS.includes(e?.status)?e.status:'Черновик',v58cl=s=>s==='Выполнена'?'done':s==='В работе'?'work':s==='Отправлена'?'sent':s==='Отменена'?'cancel':'draft';
function v58Fin(){return {prepayment:v58n($('prepayment')?.value),material:v58n($('expenseMaterial')?.value),transport:v58n($('expenseTransport')?.value),salary:v58n($('expenseSalary')?.value),other:v58n($('expenseOther')?.value)}}
function v58Company(){try{return JSON.parse(localStorage.getItem(V58_COMPANY)||'{}')}catch{return {}}}
function v58RenderCompany(){const c=v58Company();[['companyName',c.name],['companyPhone',c.phone],['companyCity',c.city],['companyAddress',c.address],['companyDetails',c.details],['companyBank',c.bank],['companySignature',c.signature]].forEach(([id,v])=>{if($(id))$(id).value=v||''});if($('companyLogoPreview'))$('companyLogoPreview').innerHTML=c.logo?`<img src="${c.logo}" alt="Логотип">`:''}
function v58SaveCompany(){const c={name:$('companyName')?.value.trim()||'',phone:$('companyPhone')?.value.trim()||'',city:$('companyCity')?.value.trim()||'',address:$('companyAddress')?.value.trim()||'',details:$('companyDetails')?.value.trim()||'',bank:$('companyBank')?.value.trim()||'',signature:$('companySignature')?.value.trim()||'',logo:v58Company().logo||''};const f=$('companyLogo')?.files?.[0];if(f&&f.size>350000)return toast('Логотип слишком большой (макс. 350 КБ)');const save=()=>{localStorage.setItem(V58_COMPANY,JSON.stringify(c));try{if(window.__mgCloudMarkCompanyDirty)window.__mgCloudMarkCompanyDirty()}catch(e){}v58RenderCompany();toast('Профиль компании сохранён')};if(f){const r=new FileReader();r.onload=()=>{c.logo=r.result;save()};r.readAsDataURL(f)}else save()}
function v58Normalize(e){if(!e)return e;e.status=v58st(e);Object.assign(e,window.MGCalculations.normalizeFinance(e));return e}
function v58FinanceSummary(){if(!$('financeSummary'))return;const f=v58Fin(),t=total(),ex=f.material+f.transport+f.salary+f.other,bal=Math.max(0,t-f.prepayment);$('financeSummary').innerHTML=`<div><span>Сумма</span><b>${money(t)} MDL</b></div><div><span>Предоплата</span><b>${money(f.prepayment)} MDL</b></div><div><span>Остаток</span><b>${money(bal)} MDL</b></div><div><span>Расходы</span><b>${money(ex)} MDL</b></div><div class="profit"><span>Прибыль</span><b>${money(t-ex)} MDL</b></div>`}
function v58SetFinance(e){const f={prepayment:v58n(e?.prepayment),material:v58n(e?.expenseMaterial),transport:v58n(e?.expenseTransport),salary:v58n(e?.expenseSalary),other:v58n(e?.expenseOther)};[['prepayment',f.prepayment],['expenseMaterial',f.material],['expenseTransport',f.transport],['expenseSalary',f.salary],['expenseOther',f.other]].forEach(([id,v])=>{if($(id))$(id).value=v||''});v58FinanceSummary()}
function v58Build(){const old=state.estimate||{},f=v58Fin(),selectedTemplate=(window.MGEstimateTemplates?.get?.()||localStorage.getItem('master_group_estimate_template_v1')||'classic'),e={id:state.id||uid(),number:old.number||'MG-'+String((Number(localStorage.getItem('mg_counter')||0)+1)).padStart(4,'0'),client:contactData().client,phone:contactData().phone,address:contactData().address,object:contactData().address,directions:JSON.parse(JSON.stringify(state.directions)),category:state.directions.map(d=>d.name).join(', '),items:allItems().map(x=>({...x})),total:total(),date:old.date||new Date().toLocaleDateString('ru-RU'),status:v58st(old),template:selectedTemplate,prepayment:f.prepayment,expenseMaterial:f.material,expenseTransport:f.transport,expenseSalary:f.salary,expenseOther:f.other,payments:v59Payments(old),paid:v58n(old.paid)};return v59Normalize(e)}
async function v58Create(){let e=v58Build();if(!state.id&&window.__mgAllocateEstimateNumber){try{const n=await window.__mgAllocateEstimateNumber();if(n)e.number=n}catch(err){console.warn('MG number allocation:',err)}}const a=saved(),i=a.findIndex(x=>String(x.id)===String(e.id)),before=i>=0?JSON.parse(JSON.stringify(a[i])):null;if(!state.id)localStorage.setItem('mg_counter',String(Number(localStorage.getItem('mg_counter')||0)+1));if(i>=0)a[i]=e;else a.unshift(e);persist(a);try{const ds=drafts(),clean=ds.filter(x=>String(x?.id)!==String(e.id));if(clean.length!==ds.length)persistDrafts(clean)}catch(err){console.warn('MG archive draft cleanup:',err)}try{recordEstimateNotifications(before,e)}catch(err){}state.id=e.id;state.estimate=e;v58Document(e);let cloudSaved=false;try{if(window.__mgCloudSaveEstimate)cloudSaved=await window.__mgCloudSaveEstimate(e)}catch(err){cloudSaved=false}if(cloudSaved)toast('Смета сохранена в облаке');else if(typeof window.__mgCloudIsConnected==='function'&&window.__mgCloudIsConnected())toast('Смета сохранена на устройстве — повторяем отправку в облако');else toast('Смета сохранена на устройстве')}
function v58TemplateForEstimate(e){
  const allowed=window.MGEstimateTemplates?.allowed||['neo','corporate','minimal','premium','accent'];
  if(typeof window.MGEstimateTemplates?.resolveForEstimate==='function'){
    const resolved=window.MGEstimateTemplates.resolveForEstimate(e);
    if(allowed.includes(resolved)) return resolved;
  }
  try{
    const selected=localStorage.getItem('master_group_estimate_template_v1');
    if(allowed.includes(selected)) return selected;
  }catch(_){}
  return allowed.includes(e?.template)?e.template:'minimal';
}
function v58Document(e){
  const currentTemplate=v58TemplateForEstimate(e);
  e={...v58Normalize({...e}),template:currentTemplate};
  const c=v58Company();
  const dirs=Array.isArray(e.directions)&&e.directions.length?e.directions:(e.category?[{name:e.category,items:e.items||[]}]:[]);
  const escText=v=>esc(v||'—');
  const companyName=esc(c.name||'Master Group');
  const logo=c.logo?`<img class="mg-pdf-logo etp-logo" src="${c.logo}" alt="Логотип">`:'';
  const companyPhone=escText(c.phone), companyAddress=escText([c.city,c.address].filter(Boolean).join(', '));
  let rows='', rowNo=1;
  dirs.forEach(d=>{
    const items=Array.isArray(d.items)?d.items:[];
    items.forEach(x=>{
      const q=Number(x.qty)||0, pr=Number(x.price)||0;
      rows+=`<tr><td>${rowNo++}</td><td>${escText(x.name)}</td><td>${escText(String(x.qty??''))} ${escText(x.unit||'шт')}</td><td>${money(pr)}</td><td>${money(q*pr)}</td></tr>`;
    });
  });
  const notes=escText(e.note||e.notes||'');
  const client=escText(e.client), phone=escText(e.phone), address=escText(e.address||e.object);
  $('document').innerHTML=`<div class="estimate-template-page etp-${currentTemplate} mg-pdf-sheet" data-rendered-template="${currentTemplate}">
    <div class="etp-header mg-pdf-header">
      <div class="etp-company-block"><div class="mg-pdf-company etp-company-block">${logo}<div><strong>${companyName}</strong><span>СМЕТА НА УСЛУГИ</span>${companyPhone!=='—'||companyAddress!=='—'?`<div class="mg-pdf-company-meta">${companyPhone!=='—'?`Телефон · ${companyPhone}`:''}${companyPhone!=='—'&&companyAddress!=='—'?' · ':''}${companyAddress!=='—'?`Адрес · ${companyAddress}`:''}</div>`:''}</div></div></div>
      <div class="mg-pdf-docmeta"><b>СМЕТА №</b><strong>${escText(e.number)}</strong><small>${escText(e.date)}</small></div>
    </div>
    <div class="etp-parties mg-pdf-client">
      <div><label>КЛИЕНТ</label><b>${client}</b><span>Телефон · ${phone}</span><span>Адрес · ${address}</span></div>
      <div><label>ИСПОЛНИТЕЛЬ</label><b>${companyName}</b><span>Телефон · ${companyPhone}</span><span>Адрес · ${companyAddress}</span></div>
    </div>
    <div class="etp-title">Смета на услуги</div>
    <div class="mg-pdf-items">
      ${rows?`<table><thead><tr><th>№</th><th>Наименование услуги</th><th>Кол.</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="mg-pdf-empty">Услуги не добавлены</div>'}
    </div>
    <div class="etp-total mg-pdf-total"><b>ИТОГО</b><strong>${money(e.total)} <small>MDL</small></strong></div>
    ${notes?`<div class="mg-pdf-note"><span>Примечание</span><b>${notes}</b></div>`:''}
    <div class="etp-footer mg-pdf-footer"><span>${companyName}</span><span>${escText(e.number)} · ${escText(e.date)}</span></div>
  </div>`;
  try{if(state.estimate&&String(state.estimate.id)===String(e.id))state.estimate={...state.estimate,template:currentTemplate};}catch(_){ }
  screen('documentScreen');
}
function v58Review(){const c=contactData();let h=`<div class="review-row"><span>Клиент</span><b>${esc(c.client||'—')}</b></div><div class="review-row"><span>Телефон</span><b>${esc(c.phone||'—')}</b></div><div class="review-row"><span>Адрес</span><b>${esc(c.address||'—')}</b></div>`;state.directions.forEach(d=>{h+=`<div class="review-row"><span><b>${esc(d.name)}</b></span><b>${money(d.items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0))} MDL</b></div>`;d.items.forEach((x,i)=>h+=`<div class="review-row"><span>${i+1}. ${esc(x.name)}<br><small style="color:#718096">${x.qty} ${esc(x.unit)} × ${money(x.price)} MDL</small></span><b>${money(x.qty*x.price)} MDL</b></div>`)});h+=`<div class="review-row"><span><b>ИТОГО</b></span><b>${money(total())} MDL</b></div>`;if(state.id){h+=`<div class="finance-actions" style="margin-top:14px"><button type="button" class="btn primary" data-add-payment="${esc(String(state.id))}" onclick="window.__mgDirectAddPayment&&window.__mgDirectAddPayment(this.dataset.addPayment); return false;">＋ Добавить оплату</button><button type="button" class="btn secondary" data-edit-expenses="${esc(String(state.id))}" onclick="window.__mgDirectEditExpenses&&window.__mgDirectEditExpenses(this.dataset.editExpenses); return false;">Расходы</button></div>`}$('review').innerHTML=h;v58FinanceSummary()}
function v58RenderFilters(){if(!$('statusFilters'))return;$('statusFilters').innerHTML=['Все',...V58_STATUS].map(s=>`<button type="button" class="status-filter ${v58Filter===s?'active':''}" data-status-filter="${esc(s)}">${esc(s)}</button>`).join('')}
function v58RenderEstimates(){const a=saved().map(v59Normalize);const rawFilter=localStorage.getItem(V58_FILTER)||v58Filter||'Все';v58Filter=rawFilter==='Черновики'?'Черновик':rawFilter==='Отправленные'?'Отправлена':rawFilter==='Выполненные'?'Выполнена':rawFilter==='Отменённые'?'Отменена':(V58_STATUS.includes(rawFilter)?rawFilter:'Все');localStorage.setItem(V58_FILTER,v58Filter);v59RenderFilters();const list=v58Filter==='Все'?a:a.filter(e=>v58st(e)===v58Filter),el=$('estimatesList');if(!list.length){el.innerHTML=`<div class="empty"><b>Нет смет</b><small>${v58Filter==='Все'?'Создайте первую смету.':'В этой категории пока нет смет.'}</small></div>`;return}el.innerHTML=list.map(e=>{const pays=v59Payments(e);return `<article class="estimate-card estimate-unified-card"><button type="button" class="estimate-delete-corner" data-estimate-delete="${esc(String(e.id))}" aria-label="Удалить смету" title="Удалить смету">×</button><div class="estimate-main"><div class="estimate-badge">MG</div><div class="estimate-info"><b>${esc(e.number||'Смета')}</b><span>${esc(e.date||'')} · ${money(e.total)} MDL</span><small>${esc(e.client||'Без клиента')} · ${esc(e.object||'Без объекта')}</small><small>${esc((e.directions||[]).map(d=>d.name).join(' · ')||e.category||'Без направления')}</small><div class="estimate-meta-row"><span class="status-pill ${v58cl(e.status)}">Работа: ${esc(e.status)}</span><span class="status-pill ${v60PayClass(e)}">Оплата: ${esc(v60PayLabel(e))}</span></div></div></div><div class="estimate-finance-panel"><div class="estimate-finance-title"><b>Финансы по смете</b><span class="muted">${pays.length} ${pays.length===1?'оплата':'оплат'}</span></div><div class="finance-lines"><div class="finance-line"><span>Сумма</span><b>${money(e.total)} MDL</b></div><div class="finance-line"><span>Получено</span><b>${money(e.paid)} MDL</b></div><div class="finance-line"><span>Остаток</span><b>${money(e.balance)} MDL</b></div><div class="finance-line"><span>Расходы</span><b>${money(e.expenseTotal)} MDL</b></div><div class="finance-line"><span>Прибыль</span><b>${money(e.profit)} MDL</b></div></div>${pays.length?`<div class="payment-list">${pays.map(p=>`<div class="payment-row"><span>${esc(p.date||'')} · ${esc(p.method||'')}${p.note?' · '+esc(p.note):''}</span><b>${money(p.amount)} MDL <button type="button" class="settings-small-btn danger" data-delete-payment="${esc(String(e.id))}:${esc(String(p.id))}">×</button></b></div>`).join('')}</div>`:''}<div class="estimate-finance-actions"><button type="button" class="btn primary" data-add-payment="${esc(String(e.id))}" onclick="window.__mgDirectAddPayment&&window.__mgDirectAddPayment(this.dataset.addPayment); return false;">＋ Оплата</button><button type="button" class="btn secondary" data-edit-expenses="${esc(String(e.id))}" onclick="window.__mgDirectEditExpenses&&window.__mgDirectEditExpenses(this.dataset.editExpenses); return false;">Расходы</button></div></div><div class="estimate-actions"><select class="settings-input" data-estimate-status="${esc(String(e.id))}" aria-label="Статус работы"><option value="" disabled>Статус работы</option>${V58_STATUS.map(s=>`<option value="${esc(s)}" ${e.status===s?'selected':''}>${esc(s)}</option>`).join('')}</select><button type="button" class="btn secondary" data-estimate-edit="${esc(String(e.id))}">Редактировать</button><button type="button" class="btn secondary" data-estimate-open="${esc(String(e.id))}">Открыть</button></div></article>`}).join('')}
function v58SetStatus(id,status){if(!V58_STATUS.includes(status))return;const a=saved(),i=a.findIndex(e=>String(e.id)===String(id));if(i<0)return;const before=JSON.parse(JSON.stringify(a[i]));const e=v58Normalize(JSON.parse(JSON.stringify(a[i])));e.status=status;a[i]=e;try{if(persist(a)===false)return}catch(err){toast('Не удалось сохранить статус');return}try{recordEstimateNotifications(before,e)}catch(e){}if(state.estimate&&String(state.estimate.id)===String(id))state.estimate=e;v58RenderEstimates();dashboard();toast('Статус: '+status)}
function v58RenderStats(){const a=saved().map(v58Normalize),rev=a.reduce((s,e)=>s+v58n(e.total),0),exp=a.reduce((s,e)=>s+v58n(e.expenseTotal),0),profit=rev-exp,pre=a.reduce((s,e)=>s+v58n(e.prepayment),0),bal=a.reduce((s,e)=>s+v58n(e.balance),0),done=a.filter(e=>e.status==='Выполнена').length,work=a.filter(e=>e.status==='В работе').length;const g={},sv={};a.forEach(e=>(e.directions||[]).forEach(d=>{g[d.name]=(g[d.name]||0)+1;(d.items||[]).forEach(x=>sv[x.name]=(sv[x.name]||0)+1)}));const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5);const monthRev=a.filter(e=>{const d=(e.date||'').split('.'),n=new Date();return d.length===3&&+d[1]-1===n.getMonth()&&+d[2]===n.getFullYear()}).reduce((s,e)=>s+v58n(e.total),0);$('statCount').textContent=a.length;$('statMonth').textContent=money(monthRev)+' MDL';$('statProfit').textContent=money(profit)+' MDL';$('statExpenses').textContent=money(exp)+' MDL';document.querySelector('#statsScreen .stats-grid').innerHTML=`<div class="stats-big"><b>${a.length}</b><span>Всего смет</span></div><div class="stats-big"><b>${money(monthRev)} MDL</b><span>Выручка за месяц</span></div><div class="stats-big"><b>${money(profit)} MDL</b><span>Чистая прибыль</span></div><div class="stats-big"><b>${money(exp)} MDL</b><span>Расходы</span></div><div class="stats-big"><b>${money(pre)} MDL</b><span>Предоплаты</span></div><div class="stats-big"><b>${money(bal)} MDL</b><span>Остатки</span></div><div class="stats-big"><b>${done}</b><span>Выполнено</span></div><div class="stats-big"><b>${work}</b><span>В работе</span></div>`;const m={};a.forEach(e=>{const d=(e.date||'').split('.');if(d.length===3){const k=d[1]+'.'+d[2];m[k]=(m[k]||0)+v58n(e.total)}});const keys=Object.keys(m).sort((x,y)=>{const [xm,xy]=x.split('.').map(Number),[ym,yy]=y.split('.').map(Number);return new Date(yy,xm-1)-new Date(y,ym-1)}).slice(0,6);$('monthStats').innerHTML=(keys.length?keys.map(k=>`<div class="month-row"><b>${k}</b><span>${money(m[k])} MDL</span></div>`).join(''):'<div class="empty">Пока нет сохранённых смет.</div>')+`<div style="margin-top:15px"><b>Лучшие направления</b>${top(g).map(([k,v])=>`<div class="month-row"><span>${esc(k)}</span><span>${v} смет</span></div>`).join('')||'<div class="muted">Нет данных</div>'}<b style="display:block;margin-top:14px">Самые используемые услуги</b>${top(sv).map(([k,v])=>`<div class="month-row"><span>${esc(k)}</span><span>${v}</span></div>`).join('')||'<div class="muted">Нет данных</div>'}</div>`}
function v58Dashboard(){const a=saved().map(v58Normalize);if($('count'))$('count').textContent=a.length;if($('sum'))$('sum').textContent=money(a.reduce((s,e)=>s+v58n(e.total),0));$('saved').innerHTML=a.length?a.slice(0,8).map(e=>`<div class="saved"><div><b>${esc(e.number||'Смета')}</b><small>${esc(e.client||'Без клиента')} · ${money(e.total)} MDL</small><small>${esc(e.address||e.object||'Без адреса')} · ${esc(e.date||'')}</small><div class="estimate-meta-row"><span class="status-pill ${v58cl(e.status)}">${esc(e.status)}</span></div></div><button class="open" data-open="${esc(String(e.id))}">Открыть</button></div>`).join(''):'<div class="empty">Пока нет сохранённых смет.<br>Создайте первую через «Новая».</div>'}
/* v59: analytics + internal finance + settings tabs */
const V59_PAYMENTS='master_group_payments_v1',V59_SETTINGS_TAB='master_group_settings_tab_v1',V59_ANALYTICS_TAB='master_group_analytics_tab_v1';
function v59Payments(e){if(Array.isArray(e?.payments))return e.payments;if(v58n(e?.prepayment)>0)return [{id:'legacy-prepayment-'+String(e?.id||'estimate'),amount:v58n(e.prepayment),date:e?.date||new Date().toLocaleDateString('ru-RU'),method:'аванс',note:'Перенесено из старой версии'}];return []}
function v59SaveEstimateFinance(id,patch){const a=saved(),i=a.findIndex(e=>String(e.id)===String(id));if(i<0)return null;const before=JSON.parse(JSON.stringify(a[i]));let e=MGFinance.normalize(JSON.parse(JSON.stringify(a[i])));Object.assign(e,patch||{});e=MGFinance.normalize(e);a[i]=e;if(persist(a)===false)return null;try{window.dispatchEvent(new CustomEvent('mg:finance-updated',{detail:{id:String(id),estimate:e}}))}catch(_){}try{recordEstimateNotifications(before,e)}catch(err){}if(state.estimate&&String(state.estimate.id)===String(id))state.estimate=e;try{if(typeof window.__mgCloudSaveEstimate==='function')window.__mgCloudSaveEstimate(e).catch(()=>{})}catch(err){}return e}
async function v59AddPayment(id){const e=saved().find(x=>String(x.id)===String(id));if(!e)return;const n=v59Normalize(JSON.parse(JSON.stringify(e)));const data=await MG71.payment(n.balance);if(!data)return;try{v59SaveEstimateFinance(id,MGFinance.addPayment(n,data));v58RenderEstimates();v59RenderFinance();toast('Оплата добавлена')}catch(err){toast(err.message||'Не удалось добавить оплату')}}
async function v59DeletePayment(id,pid){const e=saved().find(x=>String(x.id)===String(id));if(!e)return;if(!await MG71.confirm('Удалить оплату?','Это удалит выбранную запись об оплате.','Удалить','Отмена'))return;const n=v59Normalize(JSON.parse(JSON.stringify(e)));v59SaveEstimateFinance(id,MGFinance.deletePayment(n,pid));v58RenderEstimates();v59RenderFinance();toast('Оплата удалена')}
function v59FinanceCard(e){e=v59Normalize({...e});const pays=v59Payments(e);return `<article class="finance-estimate"><div class="finance-estimate-head"><div><b>${esc(e.number||'Смета')}</b><div class="muted" style="margin-top:4px">${esc(e.client||'Без клиента')} · ${esc(e.date||'')}</div></div><span class="status-pill ${v58cl(e.status)}">${esc(e.status)}</span></div><div class="finance-lines"><div class="finance-line"><span>Смета</span><b>${money(e.total)} MDL</b></div><div class="finance-line"><span>Получено</span><b>${money(e.paid)} MDL</b></div><div class="finance-line"><span>Остаток</span><b>${money(e.balance)} MDL</b></div><div class="finance-line"><span>Расходы</span><b>${money(e.expenseTotal)} MDL</b></div><div class="finance-line"><span>Прибыль</span><b>${money(e.profit)} MDL</b></div><div class="finance-line"><span>Материалы</span><b>${money(e.expenseMaterial)} MDL</b></div><div class="finance-line"><span>Транспорт</span><b>${money(e.expenseTransport)} MDL</b></div><div class="finance-line"><span>Зарплата</span><b>${money(e.expenseSalary)} MDL</b></div></div><div class="payment-list">${pays.length?pays.map(p=>`<div class="payment-row"><span>${esc(p.date||'')} · ${esc(p.method||'')} ${p.note?'· '+esc(p.note):''}</span><b>${money(p.amount)} MDL</b></div>`).join(''):'<div class="muted" style="margin-top:10px">Платежей пока нет.</div>'}</div></article>`}
function v59RenderFinance(){const a=saved().map(v59Normalize),rev=a.reduce((s,e)=>s+v58n(e.total),0),paid=a.reduce((s,e)=>s+v58n(e.paid),0),bal=a.reduce((s,e)=>s+v58n(e.balance),0),exp=a.reduce((s,e)=>s+v58n(e.expenseTotal),0),profit=rev-exp;const ov=$('financeOverview');if(ov)ov.innerHTML=`<section class="card"><div class="finance-kpis"><div class="finance-kpi"><span>Получено</span><b>${money(paid)} MDL</b></div><div class="finance-kpi"><span>Ожидается</span><b>${money(bal)} MDL</b></div><div class="finance-kpi"><span>Расходы</span><b>${money(exp)} MDL</b></div><div class="finance-kpi profit"><span>Чистая прибыль</span><b>${money(profit)} MDL</b></div></div></section>`;const list=$('financeEstimates');if(list)list.innerHTML=a.length?a.map(v59FinanceCard).join(''):'<div class="empty">Смет пока нет.</div>'}
function v59SetAnalyticsTab(tab){localStorage.setItem(V59_ANALYTICS_TAB,tab);document.querySelectorAll('[data-analytics-tab]').forEach(b=>b.classList.toggle('active',b.dataset.analyticsTab===tab));if($('analyticsPanelOverview'))$('analyticsPanelOverview').hidden=tab!=='overview';if($('analyticsPanelFinance'))$('analyticsPanelFinance').hidden=tab!=='finance';if(tab==='finance')v59RenderFinance()}
function v59SetSettingsTab(tab){const allowed=['catalog','company','trash','updates','estimates'];if(!allowed.includes(tab))tab='catalog';localStorage.setItem(V59_SETTINGS_TAB,tab);document.querySelectorAll('[data-settings-tab]').forEach(b=>{const active=b.dataset.settingsTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',active?'true':'false')});[['Catalog','catalog'],['Company','company'],['Trash','trash'],['Updates','updates'],['Estimates','estimates']].forEach(([name,key])=>{const panel=$('settingsPanel'+name);if(panel)panel.hidden=tab!==key});if(tab!=='estimates'){const es=$('settingsPanelEstimates');if(es)es.hidden=true}if(tab==='company')v58RenderCompany()}
function v59ShowStats(){screen('statsScreen');v59RenderOverview();v59SetAnalyticsTab(localStorage.getItem(V59_ANALYTICS_TAB)||'overview');if((localStorage.getItem(V59_ANALYTICS_TAB)||'overview')==='finance')v59RenderFinance()}
function v59ShowSettings(){renderSettings();if(typeof renderNewDirectionIconPicker==='function')renderNewDirectionIconPicker();screen('settingsScreen');v59SetSettingsTab(localStorage.getItem(V59_SETTINGS_TAB)||'catalog')}
/* internal finance must never be rendered in the client document */
v58Document=function(e){
 e=v59Normalize({...e}); const c=v58Company();
 const dirs=Array.isArray(e.directions)&&e.directions.length?e.directions:(e.category?[{name:e.category,items:e.items||[]}]:[]);
 const money2=v=>money(v);
 let rows='', idx=1;
 dirs.forEach(d=>{
   const items=Array.isArray(d.items)?d.items:[];
   if(!items.length)return;
   rows+=`<div class="mg-doc-direction"><div class="mg-doc-direction-title"><span>${esc(d.name||'Услуги')}</span><span>${money2(items.reduce((s,x)=>s+(Number(x.qty)||0)*(Number(x.price)||0),0))} MDL</span></div><table><thead><tr><th class="num">№</th><th>Наименование услуги</th><th class="qty">Кол.</th><th class="price">Цена</th><th class="sum">Сумма</th></tr></thead><tbody>`;
   items.forEach(x=>{
     const q=Number(x.qty)||0, pr=Number(x.price)||0;
     rows+=`<tr><td class="num">${idx++}</td><td class="service">${esc(x.name||'Услуга')}</td><td class="qty">${esc(String(x.qty??''))} ${esc(x.unit||'шт')}</td><td class="price">${money2(pr)}</td><td class="sum">${money2(q*pr)}</td></tr>`;
   });
   rows+='</tbody></table></div>';
 });
 const logo=c.logo?`<img class="mg-doc-logo" src="${c.logo}" alt="Логотип">`:'';
 const companyName=esc(c.name||'Master Group');
 const companyLine=[c.phone,c.city,c.address].filter(Boolean).map(esc).join('  ·  ');
 const clientRows=[['Клиент',e.client],['Телефон',e.phone],['Адрес',e.address||e.object]].filter(x=>x[1]);
 const mgTemplate=v58TemplateForEstimate(e);
 $('document').innerHTML=`<div class="estimate-template-page etp-${esc(mgTemplate)} mg-doc-pro mg-doc-sheet" data-rendered-template="${esc(mgTemplate)}">
   <header class="mg-doc-top etp-header"><div class="mg-doc-brand">${logo}<div><h1>${companyName}</h1><div class="mg-doc-subtitle">СМЕТА НА УСЛУГИ</div>${companyLine?`<div class="mg-doc-company-line">${companyLine}</div>`:''}</div></div><div class="mg-doc-number"><span>СМЕТА</span><strong>${esc(e.number||'MG-0001')}</strong><time>${esc(e.date||'')}</time></div></header>
   <section class="mg-doc-parties etp-parties">
     <div class="mg-doc-party"><div class="mg-doc-label">КЛИЕНТ</div>${clientRows.map(([k,v])=>`<div class="mg-doc-party-row"><span>${k}</span><b>${esc(v||'—')}</b></div>`).join('')}</div>
     <div class="mg-doc-party mg-doc-party-executor"><div class="mg-doc-label">ИСПОЛНИТЕЛЬ</div>
       <div class="mg-doc-party-row"><span>Компания</span><b>${companyName}</b></div>
       ${c.phone?`<div class="mg-doc-party-row"><span>Телефон</span><b>${esc(c.phone)}</b></div>`:''}
       ${c.address?`<div class="mg-doc-party-row"><span>Адрес</span><b>${esc(c.address)}</b></div>`:''}
     </div>
   </section>
   <section class="mg-doc-services"><div class="etp-title">Смета на услуги</div>${rows||'<div class="mg-doc-empty">Услуги не добавлены</div>'}</section>
   <div class="mg-doc-grand etp-total"><span>ИТОГО</span><strong>${money2(e.total)} <small>MDL</small></strong></div>
   <footer class="mg-doc-footer etp-footer"><span>${companyName}</span><span>${esc(e.number||'')} · ${esc(e.date||'')}</span></footer>
 </div>`;
 screen('documentScreen');
}

function v59Normalize(e){return MGFinance.normalize(e||{})}
function v60PayLabel(e){const total=v58n(e.total),paid=v58n(e.paid);if(paid<=0)return 'Не оплачено';if(paid>=total&&total>0)return 'Оплачено';return 'Частично оплачено'}
function v60PayClass(e){const total=v58n(e.total),paid=v58n(e.paid);return paid<=0?'pay-none':paid>=total&&total>0?'pay-full':'pay-partial'}
function v59RenderFilters(){if(!$('statusFilters'))return;const filters=[['Все','Все'],['Черновики','Черновик'],['Отправленные','Отправлена'],['В работе','В работе'],['Выполненные','Выполнена'],['Отменённые','Отменена']];$('statusFilters').innerHTML=filters.map(([label,value])=>`<button type="button" class="status-filter ${v58Filter===value?'active':''}" data-status-filter="${esc(value)}">${label}</button>`).join('')}
function v59RenderOverview(){const a=saved().map(v59Normalize),rev=a.reduce((s,e)=>s+v58n(e.total),0),exp=a.reduce((s,e)=>s+v58n(e.expenseTotal),0),profit=rev-exp;$('statCount').textContent=a.length;$('statMonth').textContent=money(a.filter(e=>{const d=(e.date||'').split('.'),now=new Date();return d.length===3&&+d[1]-1===now.getMonth()&&+d[2]===now.getFullYear()}).reduce((s,e)=>s+v58n(e.total),0))+' MDL';$('statProfit').textContent=money(profit)+' MDL';$('statExpenses').textContent=money(exp)+' MDL';const m={};a.forEach(e=>{const d=(e.date||'').split('.');if(d.length===3){const k=d[1]+'.'+d[2];m[k]=(m[k]||0)+v58n(e.total)}});const keys=Object.keys(m).sort((x,y)=>{const [xm,xy]=x.split('.').map(Number),[ym,yy]=y.split('.').map(Number);return new Date(yy,xm-1)-new Date(y,ym-1)}).slice(0,6);$('monthStats').innerHTML=keys.length?keys.map(k=>`<div class="month-row"><b>${k}</b><span>${money(m[k])} MDL</span></div>`).join(''):'<div class="empty">Пока нет сохранённых смет.</div>'}
async function v59EditExpenses(id){const e=saved().find(x=>String(x.id)===String(id));if(!e)return;const n=v59Normalize(e);const data=await MG71.expenses({material:n.expenseMaterial,transport:n.expenseTransport,salary:n.expenseSalary,other:n.expenseOther});if(!data)return;v59SaveEstimateFinance(id,MGFinance.setExpenses(n,data));v58RenderEstimates();v59RenderFinance();toast('Расходы сохранены')}

// Publish finance-aware replacements without mutating the base module scope.
C.create=v58Create;C.documentBody=v58Document;C.renderReview=v58Review;C.renderEstimates=v58RenderEstimates;C.renderStats=v58RenderStats;C.dashboard=v58Dashboard;C.showStats=v59ShowStats;C.showSettings=v59ShowSettings;C.showEstimates=()=>{v58RenderEstimates();screen('estimatesScreen')};

shareTo=async function(kind){
 const baseEstimate=v59Normalize(state.estimate||{});
 const e={...baseEstimate,template:v58TemplateForEstimate(baseEstimate)};
 if(e.id){try{v58Document(e)}catch(err){console.warn('template document refresh failed',err)}}
 if(!e.id){toast('Сначала сохраните смету');return}
 const text=`Master Group — Смета ${e.number}\nКлиент: ${e.client||'—'}\nТелефон: ${e.phone||'—'}\nАдрес: ${e.address||e.object||'—'}\n\n`+allItemsFromEstimate(e).map((x,i)=>`${i+1}. ${x.direction?x.direction+' — ':''}${x.name} — ${x.qty} ${x.unit} × ${money(x.price)} = ${money(x.qty*x.price)} MDL`).join('\n')+`\n\nИТОГО: ${money(e.total)} MDL`;
 const markSentSafe=()=>{try{if(v58st(e)==='Черновик')v58SetStatus(e.id,'Отправлена')}catch(err){console.warn('status update failed',err)}};
 if(kind==='wa'||kind==='tg'){
   const url=kind==='wa'?'https://wa.me/?text='+encodeURIComponent(text):'https://t.me/share/url?url=&text='+encodeURIComponent(text);
   try{window.open(url,'_blank','noopener,noreferrer');}catch(err){location.href=url}
   markSentSafe(); return;
 }
 if(navigator.share){
   try{await navigator.share({title:'Master Group — Смета '+e.number,text});markSentSafe();return}catch(err){if(err?.name==='AbortError')return;console.warn('Web Share failed',err)}
 }
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast('Смета скопирована — можно отправить клиенту');markSentSafe();return}}catch(err){console.warn('clipboard failed',err)}
 toast('Поделиться недоступно в этом браузере. Используйте WhatsApp, Telegram или меню браузера.');
};
share=()=>shareTo('share');

const originalStep=step;step=function(n){if(n===5){if(!allItems().length)return toast('Добавьте услугу');const c=contactData();if(!c.client&&!c.phone&&!c.address)return toast('Заполните контактную информацию')}originalStep(n);if(n===5){v58SetFinance(state.estimate||{});v58FinanceSummary()}};
// keep company fields ready
v58RenderCompany();
Object.assign(F,{v58n,v58st,v58cl,v58Normalize,v59Normalize,v58Payments,v58TemplateForEstimate,v58SetStatus,v59SaveEstimateFinance,v58RenderEstimates,v59RenderOverview,v59RenderFinance,v59AddPayment,v59DeletePayment,v59EditExpenses,v59SetAnalyticsTab,v59SetSettingsTab,v59ShowStats,v59ShowSettings,v58SaveCompany,v58RenderCompany});
F.share=()=>F.shareTo('share');
F.shareTo=shareTo;
F.step=step;
F.create=v58Create;F.documentBody=v58Document;F.renderReview=v58Review;F.renderEstimates=v58RenderEstimates;F.renderStats=v58RenderStats;F.dashboard=v58Dashboard;F.showStats=v59ShowStats;F.showSettings=v59ShowSettings;F.showEstimates=()=>{v58RenderEstimates();screen('estimatesScreen')};
v58Dashboard();
document.addEventListener('input',e=>{if(['prepayment','expenseMaterial','expenseTransport','expenseSalary','expenseOther'].includes(e.target.id))v58FinanceSummary();});
document.addEventListener('change',e=>{const st=e.target.closest('[data-estimate-status]');if(st&&st.value){v58SetStatus(st.dataset.estimateStatus,st.value);}});
document.addEventListener('click',e=>{const v=e.target.closest('[data-v58]');if(v){const a=v.dataset.v58;if(a==='estimates')(C.showEstimates||showEstimates)();else if(a==='stats')(C.showStats||showStats)();else if(a==='saveCompany')v58SaveCompany();return}const f=e.target.closest('[data-status-filter]');if(f){v58Filter=f.dataset.statusFilter;localStorage.setItem(V58_FILTER,v58Filter);v58RenderEstimates();return}});
document.addEventListener('click',e=>{const st=e.target.closest('[data-settings-tab]');if(st){v59SetSettingsTab(st.dataset.settingsTab);return}const at=e.target.closest('[data-analytics-tab]');if(at){v59SetAnalyticsTab(at.dataset.analyticsTab);return}const dp=e.target.closest('[data-delete-payment]');if(dp){const [id,pid]=dp.dataset.deletePayment.split(':');v59DeletePayment(id,pid);return}const fo=e.target.closest('[data-finance-open]');if(fo){openSaved(fo.dataset.financeOpen);return}});


})();
