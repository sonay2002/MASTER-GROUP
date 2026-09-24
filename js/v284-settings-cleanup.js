/* v284 — Settings header cleanup: remove the Done action and hero helper text without changing functionality. */
(function(){
  function apply(){
    const screen=document.getElementById('settingsScreen');
    if(!screen) return;
    const done=screen.querySelector('.settings-done');
    if(done) done.hidden=true;
    const brand=screen.querySelector('.settings-topbar .brand');
    if(brand) brand.hidden=true;
    const eyebrow=screen.querySelector('.settings-hero-v2 .eyebrow');
    if(eyebrow) eyebrow.hidden=true;
    const desc=screen.querySelector('.settings-hero-v2 p');
    if(desc) desc.hidden=true;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('mg:screen-change',apply);
  new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true});
})();
