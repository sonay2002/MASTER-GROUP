/* Master Group v140 — estimate engine */
(()=>{
  const state=window.MGState;
  const n=v=>Number(v)||0;
  function allItems(){
    return state.directions.flatMap(d=>(Array.isArray(d.items)?d.items:[]).map(x=>({...x,direction:d.name})));
  }
  function total(){
    return allItems().reduce((sum,x)=>sum+n(x.qty)*n(x.price),0);
  }
  function normalizeDirections(x){
    if(Array.isArray(x?.directions)&&x.directions.length){
      return x.directions.map(d=>({name:d.name,items:Array.isArray(d.items)?d.items:[]}));
    }
    if(x?.category){
      return [{name:x.category,items:Array.isArray(x.items)?x.items:[]}];
    }
    return [];
  }
  function allItemsFromEstimate(e){
    return Array.isArray(e?.directions)&&e.directions.length
      ? e.directions.flatMap(d=>(d.items||[]).map(x=>({...x,direction:d.name})))
      : (e?.items||[]);
  }
  window.MGEstimate={allItems,total,normalizeDirections,allItemsFromEstimate};
})();
