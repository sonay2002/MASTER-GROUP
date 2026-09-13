(function(){
  const refresh=()=>{
    try{
      if(typeof renderDirections==='function') renderDirections();
      if(typeof renderCats==='function') renderCats();
      if(typeof renderServices==='function') renderServices();
      if(typeof renderItems==='function') renderItems();
    }catch(e){}
  };
  document.addEventListener('click',function(e){
    const t=e.target.closest('[data-action],[data-step],[data-screen],button');
    if(!t)return;
    const txt=(t.textContent||'').trim().toLowerCase();
    if(txt.includes('позици')||txt.includes('категори')||t.dataset.action==='step1'||t.dataset.action==='step2') requestAnimationFrame(refresh);
  });
  window.addEventListener('pageshow',refresh);
  setTimeout(refresh,0);

})();
