/* v351: lightweight viewport measurement only. No navigation, estimate or data logic is changed. */
(function(){
  'use strict';
  function updateViewportVars(){
    var vv=window.visualViewport;
    var w=Math.round(vv && vv.width ? vv.width : window.innerWidth || document.documentElement.clientWidth || 0);
    var h=Math.round(vv && vv.height ? vv.height : window.innerHeight || document.documentElement.clientHeight || 0);
    var root=document.documentElement;
    root.style.setProperty('--mg-viewport-width', w + 'px');
    root.style.setProperty('--mg-viewport-height', h + 'px');
    root.style.setProperty('--mg-viewport-vw', (w/100) + 'px');
    root.style.setProperty('--mg-viewport-vh', (h/100) + 'px');
    root.dataset.mgViewport=w<600?'phone':(w<1100?'tablet':'desktop');
  }
  updateViewportVars();
  window.addEventListener('resize',updateViewportVars,{passive:true});
  window.addEventListener('orientationchange',function(){setTimeout(updateViewportVars,50);},{passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('resize',updateViewportVars,{passive:true});
})();
