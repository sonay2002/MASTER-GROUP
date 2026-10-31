(function(){
  const ua=navigator.userAgent||'';
  const isTikTok=/TikTok|BytedanceWebview/i.test(ua);
  const isSocial=/Instagram|FBAN|FBAV|Twitter|Line\//i.test(ua);
  const standalone=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(!(isTikTok||isSocial)||standalone)return;
  window.setTimeout(function(){
    if(document.querySelector('.mg70-webview-tip'))return;
    const tip=document.createElement('div');tip.className='mg70-webview-tip';
    tip.innerHTML='<div class="mg70-tip-copy"><b>Лучше открыть Master Group в браузере</b><span>Встроенный браузер соцсети ограничивает системные функции и переходы в WhatsApp/Telegram.</span></div><button type="button" id="mg70TipCopy">Скопировать ссылку</button><button type="button" class="close" aria-label="Закрыть">×</button>';
    document.body.appendChild(tip);
    tip.querySelector('.close').onclick=()=>tip.remove();
    tip.querySelector('#mg70TipCopy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Ссылка скопирована. Откройте её в Safari или Chrome.')}catch(e){prompt('Скопируйте ссылку:',location.href)}};
  },600);
})();
