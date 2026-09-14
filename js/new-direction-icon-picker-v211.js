/* Master Group v212 — replacement direction icon picker with reliable open/close behavior.
 * The old picker is intentionally not reused. This component owns its markup,
 * state, open/close behavior and selection so it is available on first open.
 */
(()=>{
  'use strict';
  const icons=[
    ['clean','Клининг участка'],['camera','Видеонаблюдение'],['plumbing','Сантехника'],['electrical','Электрика'],
    ['construction','Строительство'],['masonry','Кладочные работы'],['welding','Сварка'],['metal','Металлоконструкции'],
    ['paint','Покраска'],['aircon','Кондиционирование'],['heating','Отопление'],['ventilation','Вентиляция'],
    ['window','Окна и двери'],['roof','Кровля'],['finishing','Отделочные работы'],['landscape','Ландшафт'],
    ['excavator','Земляные работы'],['transport','Вывоз мусора'],['sewer','Канализация'],['water','Водоснабжение'],
    ['fence','Заборы'],['flooring','Напольные покрытия'],['tools','Ремонт техники'],['other','Другие работы']
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const iconPath=ic=>`./icons/direction-approved/${ic}.png`;

  function build(){
    const wrap=document.querySelector('.new-direction-icon-picker');
    const input=document.getElementById('newDirectionIcon');
    if(!wrap||!input)return;
    const current=icons.some(x=>x[0]===input.value)?input.value:'other';
    const label=(icons.find(x=>x[0]===current)||icons[icons.length-1])[1];
    wrap.className='new-direction-icon-picker-v211';
    wrap.setAttribute('data-mg-icon-picker','v211');
    wrap.innerHTML=`
      <button type="button" class="mg211-icon-button" data-mg211-toggle aria-expanded="false">
        <span class="mg211-current-icon"><img src="${iconPath(current)}" alt="" draggable="false"></span>
        <span class="mg211-current-text"><b>${esc(label)}</b><small>Нажмите, чтобы выбрать иконку</small></span>
        <span class="mg211-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="mg211-icon-list" data-mg211-list hidden>
        ${icons.map(([ic,name])=>`<button type="button" class="mg211-icon-choice${current===ic?' active':''}" data-mg211-icon="${ic}" aria-label="Выбрать иконку: ${esc(name)}">
          <span class="mg211-icon-box"><img src="${iconPath(ic)}" alt="" draggable="false"></span><span>${esc(name)}</span>
        </button>`).join('')}
      </div>`;
  }

  function close(wrap){
    const list=wrap?.querySelector('[data-mg211-list]');
    const toggle=wrap?.querySelector('[data-mg211-toggle]');
    if(list)list.hidden=true;
    if(toggle)toggle.setAttribute('aria-expanded','false');
    wrap?.classList.remove('open');
  }

  document.addEventListener('click',event=>{
    const toggle=event.target.closest?.('[data-mg211-toggle]');
    if(toggle){
      event.preventDefault();
      event.stopPropagation();
      const wrap=toggle.closest('.new-direction-icon-picker-v211');
      if(!wrap)return;
      const list=wrap.querySelector('[data-mg211-list]');
      const open=!wrap.classList.contains('open');
      document.querySelectorAll('.new-direction-icon-picker-v211.open').forEach(x=>{if(x!==wrap)close(x)});
      wrap.classList.toggle('open',open);
      if(list)list.hidden=!open;
      toggle.setAttribute('aria-expanded',open?'true':'false');
      return;
    }
    const choice=event.target.closest?.('[data-mg211-icon]');
    if(choice){
      event.preventDefault();
      event.stopPropagation();
      const wrap=choice.closest('.new-direction-icon-picker-v211');
      const input=document.getElementById('newDirectionIcon');
      if(!wrap||!input)return;
      const ic=choice.dataset.mg211Icon||'other';
      input.value=ic;
      wrap.querySelectorAll('[data-mg211-icon]').forEach(x=>x.classList.toggle('active',x===choice));
      const img=wrap.querySelector('.mg211-current-icon img');
      const text=wrap.querySelector('.mg211-current-text b');
      const name=(icons.find(x=>x[0]===ic)||icons[icons.length-1])[1];
      if(img)img.src=iconPath(ic);
      if(text)text.textContent=name;
      close(wrap);
      return;
    }
    if(!event.target.closest?.('.new-direction-icon-picker-v211')){
      document.querySelectorAll('.new-direction-icon-picker-v211.open').forEach(close);
    }
  },true);

  function ensure(){
    const old=document.querySelector('.new-direction-icon-picker');
    if(old && old.getAttribute('data-mg-icon-picker')!=='v211')build();
    else if(!document.querySelector('.new-direction-icon-picker-v211'))build();
  }

  // Build immediately, not after the first direction is created.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
  else ensure();

  // renderSettings() can rebuild the surrounding settings markup. Recreate the
  // picker whenever that happens, and after adding a direction reset it to "other".
  new MutationObserver(()=>ensure()).observe(document.getElementById('settingsScreen')||document.body,{childList:true,subtree:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-settings-add-direction]'))setTimeout(ensure,0);
  },true);
  window.MGNewDirectionIconPickerV211={build,closeAll:()=>document.querySelectorAll('.new-direction-icon-picker-v211.open').forEach(close)};
})();
