(function(){
const C=window.MGAppCore||{},F=window.MGAppFinance||{};
const {state,saved,persist,money,uid,allItemsFromEstimate,toast}=C;
const {v59Normalize,v59Payments,v59SaveEstimateFinance,v58RenderEstimates,v59RenderFinance,v58SetStatus,v58st}=F;
const MG70={
  backdrop:null,
  close(){if(this.backdrop){this.backdrop.remove();this.backdrop=null}},
  modal(title,subtitle,body){
    this.close();
    const b=document.createElement('div');b.className='mg70-modal-backdrop';
    b.innerHTML='<div class="mg70-modal" role="dialog" aria-modal="true"><h3>'+title+'</h3><p>'+subtitle+'</p>'+body+'</div>';
    b.addEventListener('click',e=>{if(e.target===b)this.close()});document.body.appendChild(b);this.backdrop=b;return b.querySelector('.mg70-modal');
  },
  askSent(){return new Promise(resolve=>{
    const m=this.modal('Смета отправлена клиенту?','После подтверждения статус сметы будет сохранён как «Отправлена».','<div class="mg70-choice"><button type="button" class="primary" data-mg70="yes">Да, отправлена</button><button type="button" data-mg70="no">Нет, не отправлена</button></div>');
    m.querySelector('[data-mg70="yes"]').onclick=()=>{this.close();resolve(true)};m.querySelector('[data-mg70="no"]').onclick=()=>{this.close();resolve(false)};
  })},
  payment(balance){return new Promise(resolve=>{
    const m=this.modal('Добавить оплату','Доступный остаток: '+money(balance)+' MDL','<div class="mg70-field"><label>Сумма, MDL</label><input id="mg70Amount" inputmode="decimal" type="number" min="0.01" step="0.01" placeholder="0.00"></div><div class="mg70-field"><label>Способ оплаты</label><select id="mg70Method"><option>наличные</option><option>карта</option><option>перевод</option><option>другое</option></select></div><div class="mg70-field"><label>Комментарий</label><textarea id="mg70Note" placeholder="Необязательно"></textarea></div><div class="mg70-error" id="mg70Error"></div><div class="mg70-actions"><button type="button" data-mg70="cancel">Отмена</button><button type="button" class="primary" data-mg70="save">Сохранить</button></div>');
    const amount=m.querySelector('#mg70Amount');const err=m.querySelector('#mg70Error');setTimeout(()=>amount.focus(),50);
    m.querySelector('[data-mg70="cancel"]').onclick=()=>{this.close();resolve(null)};
    m.querySelector('[data-mg70="save"]').onclick=()=>{const n=Number(String(amount.value).replace(',','.'));if(!Number.isFinite(n)||n<=0){err.textContent='Введите сумму больше 0';return}if(n>balance){err.textContent='Сумма больше остатка по смете';return}const method=m.querySelector('#mg70Method').value,note=m.querySelector('#mg70Note').value.trim();this.close();resolve({amount:n,method,note})};
  })},
  expenses(current){return new Promise(resolve=>{
    const m=this.modal('Расходы по смете','Расходы и прибыль видны только внутри Master Group.','<div class="mg70-field"><label>Материалы, MDL</label><input id="mg70Material" inputmode="decimal" type="number" min="0" step="0.01" value="'+(current.material||0)+'"></div><div class="mg70-field"><label>Транспорт, MDL</label><input id="mg70Transport" inputmode="decimal" type="number" min="0" step="0.01" value="'+(current.transport||0)+'"></div><div class="mg70-field"><label>Зарплата, MDL</label><input id="mg70Salary" inputmode="decimal" type="number" min="0" step="0.01" value="'+(current.salary||0)+'"></div><div class="mg70-field"><label>Другие расходы, MDL</label><input id="mg70Other" inputmode="decimal" type="number" min="0" step="0.01" value="'+(current.other||0)+'"></div><div class="mg70-actions"><button type="button" data-mg70="cancel">Отмена</button><button type="button" class="primary" data-mg70="save">Сохранить</button></div>');
    m.querySelector('[data-mg70="cancel"]').onclick=()=>{this.close();resolve(null)};
    m.querySelector('[data-mg70="save"]').onclick=()=>{const num=id=>Math.max(0,Number(String(m.querySelector(id).value).replace(',','.'))||0);const out={material:num('#mg70Material'),transport:num('#mg70Transport'),salary:num('#mg70Salary'),other:num('#mg70Other')};this.close();resolve(out)};
  })}
};
window.MG70=MG70;
window.__mg70_v59AddPayment=async function(id){const e=saved().find(x=>String(x.id)===String(id));if(!e)return;const n=v59Normalize(e);const data=await MG70.payment(n.balance);if(!data)return;const payments=v59Payments(e).concat([{id:uid(),amount:data.amount,date:new Date().toLocaleDateString('ru-RU'),method:data.method,note:data.note}]);v59SaveEstimateFinance(id,{payments});v58RenderEstimates();v59RenderFinance();toast('Оплата добавлена')};
window.__mg70_v59EditExpenses=async function(id){const e=saved().find(x=>String(x.id)===String(id));if(!e)return;const n=v59Normalize(e);const data=await MG70.expenses({material:n.expenseMaterial,transport:n.expenseTransport,salary:n.expenseSalary,other:n.expenseOther});if(!data)return;v59SaveEstimateFinance(id,{expenseMaterial:data.material,expenseTransport:data.transport,expenseSalary:data.salary,expenseOther:data.other});v58RenderEstimates();v59RenderFinance();toast('Расходы сохранены')};
window.__mg70_v60AskSent=async function(id){const e=saved().find(x=>String(x.id)===String(id));if(!e)return false;if(v58st(e)!=='Черновик')return true;const yes=await MG70.askSent();if(yes)v58SetStatus(id,'Отправлена');return yes};
window.v59AddPayment=window.__mg70_v59AddPayment;
window.v59EditExpenses=window.__mg70_v59EditExpenses;
window.v60AskSent=window.__mg70_v60AskSent;
window.shareTo=async function(kind){
 const e=v59Normalize(state.estimate||{});
 if(!e.id){toast('Сначала сохраните смету');return}
 const text='Master Group — Смета '+e.number+'\nКлиент: '+(e.client||'—')+'\nТелефон: '+(e.phone||'—')+'\nАдрес: '+(e.address||e.object||'—')+'\n\n'+allItemsFromEstimate(e).map((x,i)=>(i+1)+'. '+(x.direction?x.direction+' — ':'')+x.name+' — '+x.qty+' '+x.unit+' × '+money(x.price)+' = '+money(x.qty*x.price)+' MDL').join('\n')+'\n\nИТОГО: '+money(e.total)+' MDL';
 const markSentSafe=()=>{try{if(v58st(e)==='Черновик')v58SetStatus(e.id,'Отправлена')}catch(err){console.warn('status update failed',err)}};
 if(kind==='wa'||kind==='tg'){
   const url=kind==='wa'?'https://wa.me/?text='+encodeURIComponent(text):'https://t.me/share/url?url=&text='+encodeURIComponent(text);
   try{const w=window.open(url,'_blank','noopener,noreferrer');if(!w)location.href=url}catch(err){location.href=url}
   markSentSafe();return;
 }
 if(navigator.share){
   try{await navigator.share({title:'Master Group — Смета '+e.number,text});markSentSafe();return}catch(err){if(err?.name==='AbortError')return;console.warn('Web Share failed',err)}
 }
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast('Смета скопирована — можно отправить клиенту');markSentSafe();return}}catch(err){console.warn('clipboard failed',err)}
 toast('Поделиться недоступно в этом браузере. Используйте WhatsApp, Telegram или меню браузера.');
};
F.shareTo=window.shareTo;F.share=()=>window.shareTo('share');
})();
