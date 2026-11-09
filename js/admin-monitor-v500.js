/* Master Group v500 — account activity administration panel. */
(function(){
  'use strict';
  const ADMIN_EMAIL='berjan608@gmail.com';
  let employeeReadUid='';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=value=>{const n=Number(value)||0;if(!n)return '—';try{return new Date(n).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return '—'}};
  const ago=value=>{const n=Number(value)||0;if(!n)return 'Нет данных';const d=Math.max(0,Date.now()-n);if(d<60000)return 'только что';if(d<3600000)return Math.floor(d/60000)+' мин. назад';if(d<86400000)return Math.floor(d/3600000)+' ч. назад';return Math.floor(d/86400000)+' дн. назад'};
  const actionLabel={created:'Создание',updated:'Изменение',deleted:'Удаление'};
  const actionIcon={created:'＋',updated:'✎',deleted:'×'};
  let auth=null,db=null,currentUser=null,directory={},audit={},teamMembers={},directoryRef=null,auditRef=null,teamMembersRef=null,search='';
  function authorized(user=currentUser){return !!user&&String(user.email||'').toLowerCase()===ADMIN_EMAIL&&user.emailVerified===true;}
  function buttonState(user){
    currentUser=user||null;
    const button=$('mgAdminMenuItem'),verify=$('mgAdminVerifyButton');
    const owner=!!user&&String(user.email||'').toLowerCase()===ADMIN_EMAIL;
    const allowed=authorized(user);
    if(button)button.hidden=!allowed;
    if(verify){verify.hidden=!(owner&&!user.emailVerified);verify.onclick=async()=>{try{await user.sendEmailVerification();window.__mgToast?.('Письмо для подтверждения отправлено на '+ADMIN_EMAIL);}catch(e){window.__mgToast?.('Не удалось отправить письмо: '+(e?.message||'ошибка Firebase'));}}}
    if(!allowed){
      stop();directory={};audit={};closeEmployeeWork();
      if($('adminMonitorScreen')&&!$('adminMonitorScreen').hidden)window.MGAppCore?.screen?.('dashboard');
    }
  }
  function stop(){closeEmployeeWork();try{directoryRef?.off('value',onDirectory);auditRef?.off('value',onAudit);teamMembersRef?.off('value',onTeamMembers)}catch(_){ }directoryRef=auditRef=teamMembersRef=null;teamMembers={};}
  function onDirectory(snap){directory=snap.val()||{};render();}
  function onAudit(snap){audit=snap.val()||{};render();}
  function onTeamMembers(snap){teamMembers=snap.val()||{};render();}
  async function acceptIntoTeam(uid){
    const user=await refreshAuth();
    if(!authorized(user)||!uid||uid===user.uid){window.__mgToast?.('Нет доступа для добавления этого аккаунта.');return;}
    try{
      await db.ref('teamMembers/'+uid).set({accepted:true,acceptedAt:Date.now(),acceptedBy:user.uid,email:directory[uid]?.profile?.email||''});
      const check=await db.ref('teamMembers/'+uid+'/accepted').once('value');
      if(check.val()!==true)throw new Error('Firebase не подтвердил добавление сотрудника.');
      window.__mgToast?.('Пользователь добавлен в команду.');
    }catch(error){console.error('MG team accept failed:',error);window.__mgToast?.('Не удалось добавить пользователя. Проверьте правила Firebase.');}
  }
  async function refreshAuth(){
    const u=auth?.currentUser||currentUser;
    if(!u)return null;
    try{await u.reload();await u.getIdToken(true);}catch(e){console.warn('MG admin auth refresh:',e?.code||e)}
    currentUser=auth?.currentUser||u;buttonState(currentUser);return currentUser;
  }
  function usersList(){
    return Object.entries(directory||{}).map(([uid,node])=>{
      const profile=node?.profile||{},presence=node?.presence||{};
      const sessions=Object.values(presence).filter(Boolean);
      const active=sessions.filter(p=>p.online===true&&Date.now()-(Number(p.lastSeenAt)||0)<95000);
      const lastSeen=Math.max(Number(profile.lastSeenAt)||0,...sessions.map(p=>Number(p.lastSeenAt)||0));
      const stats={created:0,updated:0,deleted:0};
      Object.values((audit||{})[uid]||{}).forEach(ev=>{if(ev&&Object.prototype.hasOwnProperty.call(stats,ev.action))stats[ev.action]++;});
      return {uid,profile,presence:sessions,online:active.length>0,lastSeen,stats};
    }).sort((a,b)=>Number(b.online)-Number(a.online)||(b.lastSeen-a.lastSeen));
  }
  function eventList(){
    const rows=[];
    Object.entries(audit||{}).forEach(([uid,items])=>Object.values(items||{}).forEach(ev=>{if(ev&&typeof ev==='object')rows.push({...ev,uid:ev.actorUid||uid})}));
    return rows.sort((a,b)=>(Number(b.at)||Number(b.clientAt)||0)-(Number(a.at)||Number(a.clientAt)||0));
  }
  function aggregate(){
    const events=eventList(),counts={created:0,updated:0,deleted:0};
    for(const e of events)if(counts[e.action]!==undefined)counts[e.action]++;
    return {events,counts};
  }
  function render(){
    const users=usersList(),{events,counts}=aggregate();
    const online=users.filter(u=>u.online).length;
    if($('mgAdminUsersCount'))$('mgAdminUsersCount').textContent=String(users.length);
    if($('mgAdminOnlineCount'))$('mgAdminOnlineCount').textContent=String(online);
    if($('mgAdminCreatedCount'))$('mgAdminCreatedCount').textContent=String(counts.created);
    if($('mgAdminChangedCount'))$('mgAdminChangedCount').textContent=String(counts.updated)+' / '+String(counts.deleted);
    if($('mgAdminEventsCount'))$('mgAdminEventsCount').textContent=events.length+' событий';
    const filtered=users.filter(u=>String(u.profile.email||'').toLowerCase().includes(search));
    if($('mgAdminUsers'))$('mgAdminUsers').innerHTML=filtered.length?filtered.map(u=>{
      const p=u.profile||{},st=u.presence||[];
      const devices=[...new Set(st.map(x=>x.device).filter(Boolean))].join(', ')||'Устройство не определено';
      const id=esc(u.uid.slice(0,9)+'…');
      return `<article class="mg-admin-user-card"><div class="mg-admin-user-head"><div class="mg-admin-avatar">${esc(String(p.email||'?').slice(0,1).toUpperCase())}</div><div class="mg-admin-user-main"><b>${esc(p.email||'Email не указан')}</b><small>${esc(p.displayName||'Пользователь')} · UID ${id}</small></div><span class="mg-admin-status ${u.online?'online':'offline'}"><i></i>${u.online?'Онлайн':'Не в сети'}</span></div><div class="mg-admin-user-meta"><span>Регистрация: ${esc(fmt(p.createdAt||p.registeredAt))}</span><span>Последняя активность: ${esc(ago(u.lastSeen))}</span><span>Устройство: ${esc(devices)}</span></div><div class="mg-admin-user-counts"><span>Создано: <b>${u.stats.created}</b></span><span>Изменено: <b>${u.stats.updated}</b></span><span>Удалено: <b>${u.stats.deleted}</b></span></div><div class="mg-admin-user-last">Последнее действие: <b>${esc(p.lastAction||'Нет данных')}</b>${p.lastActionAt?' · '+esc(ago(p.lastActionAt)):''}</div><div class="mg-admin-user-actions"><button type="button" class="mg-admin-view-work" data-view-employee="${esc(u.uid)}">Просмотреть рабочие данные</button>${u.uid===currentUser?.uid?'<span class="mg-admin-team-self">Ваш аккаунт</span>':teamMembers[u.uid]?.accepted===true?'<button type="button" class="mg-admin-team-added" data-team-open>В команде</button>':`<button type="button" class="mg-admin-team-accept" data-team-accept="${esc(u.uid)}">Добавить в команду</button>`}</div></article>`;
    }).join(''):'<div class="mg-admin-empty">'+(users.length?'Пользователи не найдены.':'Пока нет зарегистрированных аккаунтов. Они появятся после входа в v500.')+'</div>';
    const recent=events.filter(e=>!search||String(e.actorEmail||'').toLowerCase().includes(search)).slice(0,120);
    if($('mgAdminEvents'))$('mgAdminEvents').innerHTML=recent.length?recent.map(e=>{
      const act=e.action||'updated',at=Number(e.at)||Number(e.clientAt)||0;
      return `<article class="mg-admin-event"><span class="mg-admin-event-icon ${esc(act)}">${actionIcon[act]||'•'}</span><div class="mg-admin-event-copy"><b>${esc(actionLabel[act]||'Действие')} · ${esc(e.estimateNumber||'Смета')}</b><small>${esc(e.actorEmail||'Неизвестный аккаунт')}${e.clientName?' · клиент: '+esc(e.clientName):''}</small><small>${esc(fmt(at))}</small></div><span class="mg-admin-event-total">${Number(e.total)>0?esc((Number(e.total)||0).toLocaleString('ru-RU'))+' MDL':''}</span></article>`;
    }).join(''):'<div class="mg-admin-empty">История действий пока пуста. Действия будут записываться после обновления приложения.</div>';
  }
  async function openEmployeeWork(uid){
    if(!authorized(await refreshAuth())){window.__mgToast?.('Доступ администратора не подтверждён.');return;}
    const panel=$('mgAdminEmployeePanel'),list=$('mgAdminEmployeeEstimates');
    if(!panel||!list)return;
    employeeReadUid=String(uid||'');
    const person=directory[employeeReadUid]?.profile||{};
    $('mgAdminEmployeeTitle').textContent='Сметы · '+(person.email||employeeReadUid);
    panel.hidden=false;
    list.innerHTML='<div class="mg-admin-empty">Загружаю сметы сотрудника…</div>';
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const snap=await db.ref('users/'+employeeReadUid+'/estimates').once('value');
      if(employeeReadUid!==String(uid||''))return;
      const data=snap.val()||{};
      const rows=Object.values(data).filter(x=>x&&typeof x==='object').sort((a,b)=>(Number(b.updatedAt||b._cloudUpdatedAt||b.date)||0)-(Number(a.updatedAt||a._cloudUpdatedAt||a.date)||0));
      if(!rows.length){list.innerHTML='<div class="mg-admin-empty">У этого аккаунта пока нет сохранённых смет.</div>';return;}
      list.innerHTML=rows.map(e=>{
        const deleted=!!(e._deleted||e.deleted||e.status==='deleted');
        const number=e.number||e.estimateNumber||e.id||'Без номера';
        const client=e.client||e.clientName||e.customer||'Клиент не указан';
        const total=Number(e.total||e.grandTotal||e.sum)||0;
        const when=e.updatedAt||e._cloudUpdatedAt||e.createdAt||e.date||0;
        return `<article class="mg-admin-employee-estimate"><div><b>${esc(number)}</b><small>${esc(client)}</small><small>${esc(fmt(when))}</small></div><div class="mg-admin-employee-estimate-side"><strong>${total?esc(total.toLocaleString('ru-RU'))+' MDL':'—'}</strong><span class="${deleted?'deleted':'saved'}">${deleted?'Удалена':'Сохранена'}</span></div></article>`;
      }).join('');
    }catch(e){
      console.warn('MG employee read failed:',e?.code||e);
      list.innerHTML='<div class="mg-admin-empty mg-admin-error">Не удалось прочитать сметы. Проверьте и опубликуйте обновлённые правила Realtime Database из этого архива.</div>';
    }
  }
  function closeEmployeeWork(){employeeReadUid='';const panel=$('mgAdminEmployeePanel');if(panel)panel.hidden=true;}
  function failPermission(error){
    console.warn('MG admin monitor read failed:',error?.code||error);
    const msg='Firebase отказал в доступе. Опубликуйте database.rules.json из архива v500 в Realtime Database → Rules, затем нажмите «Обновить».';
    if($('mgAdminUsers'))$('mgAdminUsers').innerHTML='<div class="mg-admin-empty mg-admin-error">'+esc(msg)+'</div>';
    if($('mgAdminEvents'))$('mgAdminEvents').innerHTML='<div class="mg-admin-empty mg-admin-error">Журнал пока недоступен.</div>';
  }
  async function open(){
    // Use the current Firebase auth state for instant navigation. Network
    // refresh and the first data snapshots happen after the screen is visible.
    const u=auth?.currentUser||currentUser;
    if(!authorized(u)){
      window.__mgToast?.(u&&String(u.email||'').toLowerCase()===ADMIN_EMAIL?'Сначала подтвердите Gmail администратора.':'Нет доступа к панели администратора.');
      return false;
    }
    $('drawerOverlay')?.classList.remove('open');
    window.MGAppCore?.screen?.('adminMonitorScreen');
    if($('mgAdminIdentity'))$('mgAdminIdentity').textContent=u.email+' · администратор';
    if($('mgAdminUsers'))$('mgAdminUsers').innerHTML='<div class="mg-admin-empty">Загрузка пользователей…</div>';
    if($('mgAdminEvents'))$('mgAdminEvents').innerHTML='<div class="mg-admin-empty">Загрузка истории…</div>';
    if(!window.MGFirebaseClient?.ready()){window.__mgToast?.('Firebase недоступен.');return false;}
    try{
      db=window.MGFirebaseClient.getDb();
      stop();
      directoryRef=db.ref('userDirectory');auditRef=db.ref('userAudit');teamMembersRef=db.ref('teamMembers');
      directoryRef.on('value',onDirectory,failPermission);
      auditRef.on('value',onAudit,failPermission);
      teamMembersRef.on('value',onTeamMembers,failPermission);
      // Verify in background; navigation never waits for token/network refresh.
      refreshAuth().then(user=>{if(!authorized(user)){stop();window.MGAppCore?.screen?.('dashboard');}})
        .catch(error=>console.warn('Background monitor auth refresh:',error));
      return true;
    }catch(e){window.__mgToast?.('Не удалось подключиться к Firebase.');return false;}
  }

  function init(){
    try{auth=window.MGFirebaseClient?.getAuth?.();}catch(_){auth=null}
    if(auth?.onAuthStateChanged)auth.onAuthStateChanged(buttonState);
    window.addEventListener('mg:auth-state',()=>buttonState(auth?.currentUser||null));
    const refreshVerifiedOwner=()=>{const u=auth?.currentUser;if(u&&String(u.email||'').toLowerCase()===ADMIN_EMAIL)refreshAuth();};
    window.addEventListener('focus',refreshVerifiedOwner);
    window.addEventListener('pageshow',refreshVerifiedOwner);
    $('mgAdminRefresh')?.addEventListener('click',async()=>{const u=await refreshAuth();if(!authorized(u)){stop();buttonState(u);return;}try{const [a,b,c]=await Promise.all([db.ref('userDirectory').once('value'),db.ref('userAudit').once('value'),db.ref('teamMembers').once('value')]);directory=a.val()||{};audit=b.val()||{};teamMembers=c.val()||{};render();}catch(e){failPermission(e)}});
    $('mgAdminBack')?.addEventListener('click',()=>{stop();window.MGAppCore?.screen?.('dashboard')});
    $('mgAdminSearch')?.addEventListener('input',e=>{search=String(e.target.value||'').trim().toLowerCase();render()});
    $('mgAdminUsers')?.addEventListener('click',e=>{const accept=e.target.closest('[data-team-accept]');if(accept){acceptIntoTeam(accept.getAttribute('data-team-accept'));return;}const openTeam=e.target.closest('[data-team-open]');if(openTeam){window.MGAppCore?.askArchive?.(()=>window.MGTeamWorkflow?.open?.());return;}const btn=e.target.closest('[data-view-employee]');if(btn)openEmployeeWork(btn.getAttribute('data-view-employee'));});
    $('mgAdminEmployeeClose')?.addEventListener('click',closeEmployeeWork);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('adminMonitorScreen')&&!$('adminMonitorScreen').hidden){stop();window.MGAppCore?.screen?.('dashboard')}});
    buttonState(auth?.currentUser||null);
  }
  window.MGAdminMonitor={open,stop,refresh:render};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
