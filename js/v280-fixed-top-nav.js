(function(){
  'use strict';
  /* v368: fixed notification indicator. The unread state is read directly
     from the app's notification storage instead of relying on the legacy
     menu badge, which may not exist in the current top navigation. */
  function sync(){
    var dot=document.getElementById('mgFixedNotifBadge');
    if(!dot)return;
    var count=0;
    try{
      var raw=localStorage.getItem('master_group_notifications_v1');
      var list=raw?JSON.parse(raw):[];
      if(Array.isArray(list)){
        for(var i=0;i<list.length;i++) if(list[i] && !list[i].read) count++;
      }
    }catch(e){ count=0; }
    dot.hidden=count===0;
    dot.setAttribute('aria-hidden',count===0?'true':'false');
  }
  function start(){sync();setInterval(sync,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('storage',sync);
  window.addEventListener('mg:notifications-updated',sync);
})();
