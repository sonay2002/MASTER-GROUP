/* Master Group v36 — AI service-name assistant.
 * The browser never receives an OpenAI API key. It calls a Firebase callable
 * function which keeps the provider key server-side and returns structured suggestions.
 */
(function(){
  'use strict';

  const REGION='europe-west1';
  const CACHE=new Map();
  const MAX_CACHE=80;
  let functionsInstance=null;

  function getFunctions(){
    if(functionsInstance)return functionsInstance;
    if(!window.firebase||typeof firebase.functions!=='function')return null;
    try{
      if(!firebase.apps?.length)window.MGFirebaseClient?.init?.();
      functionsInstance=firebase.app().functions(REGION);
      return functionsInstance;
    }catch(err){
      console.warn('MG AI Firebase Functions init:',err);
      return null;
    }
  }

  function clean(value,max=500){
    return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
  }

  function normalizeResult(data,input){
    const suggestions=Array.isArray(data?.suggestions)
      ? data.suggestions.map(x=>({
          text:clean(x?.text,240),
          note:clean(x?.note,180),
          confidence:Number.isFinite(Number(x?.confidence))?Math.max(0,Math.min(1,Number(x.confidence))):0
        })).filter(x=>x.text)
      : [];
    const corrected=clean(data?.corrected||suggestions[0]?.text||input,240);
    return {corrected,suggestions:suggestions.slice(0,3),changed:corrected!==clean(input,240)};
  }

  async function suggestServiceName({text,direction='',selectedServices=[]}={}){
    const input=clean(text);
    if(!input)return {corrected:'',suggestions:[],changed:false};
    const cacheKey=JSON.stringify({input,direction:clean(direction,120),selected:selectedServices.slice(0,12).map(x=>clean(x,120))});
    if(CACHE.has(cacheKey))return CACHE.get(cacheKey);

    const funcs=getFunctions();
    if(!funcs)throw Object.assign(new Error('AI service is not configured'),{code:'ai/unavailable'});

    const callable=funcs.httpsCallable('correctServiceText');
    const result=await callable({
      text:input,
      direction:clean(direction,120),
      selectedServices:(Array.isArray(selectedServices)?selectedServices:[]).slice(0,12).map(x=>clean(x,120))
    });
    const normalized=normalizeResult(result?.data,input);
    CACHE.set(cacheKey,normalized);
    if(CACHE.size>MAX_CACHE)CACHE.delete(CACHE.keys().next().value);
    return normalized;
  }

  function clearCache(){CACHE.clear();}

  window.MG_AI_SERVICE={
    suggestServiceName,
    clearCache,
    region:REGION,
    version:'v36-ai'
  };
})();
