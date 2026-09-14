
/* Master Group v199 — settings icon visualizer (loop-safe) */
(()=>{
  const paths={
    clean:'<path d="M10 36c8-1 15-7 18-15M13 32c-3-6-1-12 5-17 5 6 5 11 1 16M21 25c2-7 7-11 14-12 0 8-4 13-12 15"/>',
    camera:'<path d="M7 18h25v15H7zM32 22l9-5v17l-9-5zM13 18l3-5h8l3 5"/>',
    metal:'<path d="M8 13h32v7H27v6h13v7H27v8H19V20H8z"/>',
    plumbing:'<path d="M31 9a10 10 0 0 0 1 12L16 37a5 5 0 0 1-7-7l16-16a10 10 0 0 0 12-1l-5 5 5 5 5-5a10 10 0 0 0-11-9z"/><path d="M35 34c0 4-5 6-5 10h10c0-4-5-6-5-10z"/>'
  };
  function paint(){
    document.querySelectorAll('.settings-picker-icon[data-icon-view]').forEach(el=>{
      const k=el.getAttribute('data-icon-view');
      if(paths[k] && !el.querySelector('svg')){
        el.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true">'+paths[k]+'</svg>';
      }
    });
  }
  window.__mgPaintSettingsIcons=paint;
  paint();
  const observer=new MutationObserver(()=>paint());
  observer.observe(document.body,{childList:true,subtree:true});
})();
