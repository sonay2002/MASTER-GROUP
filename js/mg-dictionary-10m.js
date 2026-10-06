/* Master Group 10,000,000-entry correction memory.
 * Runtime principle:
 *   user text -> retrieve candidate forms -> contextual local logic/Qwen -> suggestion only.
 * The dictionary is intentionally external to the LLM and is loaded lazily by 256 CRC32 shards.
 */
(function(){
  'use strict';
  const BASE='./dictionary-10m/';
  const MANIFEST='./dictionary-10m/manifest.json';
  const MAX_SHARDS=8;
  const MAX_CACHE=3;
  const MAX_FUZZY_PER_TOKEN=2200;
  // Common Russian wordforms used by Master Group. The index contains lemma/error
  // pairs, so some legitimate inflected forms can otherwise look like typo
  // variants (e.g. `корни -> корен`, `мотора -> мотор`). Never auto-correct
  // these known-good forms merely because the external memory stores a lemma.
  const KNOWN_GOOD_RU=new Set((`
    крепление крепления крепить крепеж крепёж установка установить устанавливать
    укладка укладку укладывать монтаж монтажные монтажу ремонт ремонтировать
    замена заменить покраска покрасить шпаклевка шпаклевать грунтовка грунтовать
    прокладка прокладывать подключение подключить настройка настроить сварка сварить
    изготовление изготовить срез срезать удаление удалить уборка убрать очистка очистить
    шлифовка шлифовать утепление утеплить демонтаж демонтировать покос косить вывоз вывезти
    погрузка погрузить крепление крепёж фиксация сверление сверлить герметизация диагностика
    обслуживание регулировка бурение штукатурка гидроизоляция звукоизоляция сборка собрать
    разборка разобрать разработка создание
    мотор мотора мотору мотором двигатель двигателя двигателю двигателем
    раковина раковины раковине раковиной унитаз унитаза смеситель смесителя генератор генератора
    насос насоса фильтр фильтра кондиционер кондиционера кабель кабеля кабелю трубы труба труб
    провод провода проводу сантехника сантехники сантехнике камера камеры камерой видеорегистратор видеорегистратора
    розетка розетки розетке выключатель выключателя дверь двери двери окно окна окну крыша крыши
    рама рамы раме стен стена стены стене потолок потолка потолке пол пола полу фасад фасада
    плитка плитки плитку плиткой кафель кафеля кафелю обои обоев обоя ламинат ламината паркет паркета
    корень корни корней корня дерево дерева деревьев дереву ветка ветки веток травы трава
    кухня кухне ванной ванная ванной квартире квартира участка участок мусор строительный
  `).trim().split(/\s+/).filter(Boolean));
  const cache=new Map();
  let manifestPromise=null;

  function cleanText(v){return String(v??'').trim();}
  function norm(v){return cleanText(v).toLowerCase().normalize('NFKC');}
  function tokenise(v){
    return norm(v).match(/[a-zа-яёіїєґăâîșşţț]+/gi)||[];
  }
  function crc32(str){
    let table=crc32.table;
    if(!table){
      table=new Uint32Array(256);
      for(let n=0;n<256;n++){
        let c=n;
        for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
        table[n]=c>>>0;
      }
      crc32.table=table;
    }
    let crc=0xFFFFFFFF;
    const bytes=new TextEncoder().encode(str);
    for(let i=0;i<bytes.length;i++) crc=(crc>>>8)^table[(crc^bytes[i])&255];
    return (crc^0xFFFFFFFF)>>>0;
  }
  function shardFor(token){return crc32(norm(token))&255;}
  function levenshtein(a,b,maxDistance=4){
    const aa=Array.from(norm(a)), bb=Array.from(norm(b));
    const la=aa.length, lb=bb.length;
    if(Math.abs(la-lb)>maxDistance) return maxDistance+1;
    let prev=new Uint16Array(lb+1), cur=new Uint16Array(lb+1);
    for(let j=0;j<=lb;j++)prev[j]=j;
    for(let i=1;i<=la;i++){
      cur[0]=i; let rowMin=cur[0];
      for(let j=1;j<=lb;j++){
        const cost=aa[i-1]===bb[j-1]?0:1;
        const x=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
        cur[j]=x; if(x<rowMin)rowMin=x;
      }
      if(rowMin>maxDistance)return maxDistance+1;
      const t=prev;prev=cur;cur=t;
    }
    return prev[lb];
  }
  function isPlausibleCanonical(s){
    const x=cleanText(s);
    return x.length>=2 && x.length<=40 && /^[a-zа-яёіїєґăâîșşţț'’-]+$/i.test(x);
  }
  async function loadManifest(){
    if(manifestPromise)return manifestPromise;
    manifestPromise=fetch(MANIFEST,{cache:'no-cache'}).then(async r=>{
      if(!r.ok)return null;
      const m=await r.json();
      if(Number(m?.entryCount)!==10000000||Number(m?.uniqueEntryCount)!==10000000||Number(m?.shardCount)!==256)return null;
      return m;
    }).catch(()=>null);
    return manifestPromise;
  }
  async function decodeGzipResponse(response){
    if(typeof DecompressionStream==='function'){
      const stream=response.body?.pipeThrough(new DecompressionStream('gzip'));
      if(stream)return await new Response(stream).text();
    }
    return null;
  }
  async function loadShard(idx){
    if(cache.has(idx)){
      const value=cache.get(idx); cache.delete(idx); cache.set(idx,value); return value;
    }
    const manifest=await loadManifest();
    if(!manifest)return null;
    const url=`${BASE}shard-${String(idx).padStart(3,'0')}.txt.gz`;
    try{
      const r=await fetch(url,{cache:'force-cache'});
      if(!r.ok)return null;
      const text=await decodeGzipResponse(r);
      if(typeof text!=='string')return null;
      const map=new Map();
      const buckets=new Map();
      for(const line of text.split(/\n/)){
        const i=line.indexOf('\t'); if(i<1)continue;
        const cand=norm(line.slice(0,i));
        const canon=norm(line.slice(i+1));
        if(!cand||!isPlausibleCanonical(canon))continue;
        // Canonical target is normalized for lookup; UI title-casing happens later.
        map.set(cand,canon);
        const key=String(Array.from(cand).length);
        let arr=buckets.get(key); if(!arr){arr=[];buckets.set(key,arr);}
        if(arr.length<MAX_FUZZY_PER_TOKEN)arr.push([cand,canon]);
      }
      const expected=Number(manifest?.shardCounts?.[idx]||0);
      if(expected && map.size!==expected)return null;
      const val={map,buckets,size:map.size};
      cache.set(idx,val);
      while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
      return val;
    }catch(err){
      return null;
    }
  }
  async function loadShards(indices){
    const wanted=[...new Set(indices)].slice(0,MAX_SHARDS);
    const entries=await Promise.all(wanted.map(async idx=>[idx,await loadShard(idx)]));
    return new Map(entries.filter(([,v])=>v));
  }
  function topFuzzy(token,data){
    const t=norm(token), len=Array.from(t).length;
    const out=[]; const seen=new Set();
    for(let d=Math.max(2,len-3); d<=Math.min(32,len+3); d++){
      const arr=data.buckets.get(String(d))||[];
      for(const [cand,canon] of arr){
        if(cand===t||seen.has(canon))continue;
        const maxD=Math.min(4,Math.max(2,Math.floor(Math.max(len,Array.from(cand).length)*0.45)));
        const dist=levenshtein(t,cand,maxD);
        if(dist>maxD)continue;
        const score=1-(dist/Math.max(len,Array.from(cand).length));
        // Do not surface weak/random candidates. Strong retrieval is evidence; Qwen/local context resolves the phrase.
        if(score<0.50)continue;
        seen.add(canon);
        out.push({text:canon,score,source:cand});
      }
    }
    out.sort((a,b)=>b.score-a.score);
    return out.slice(0,5);
  }
  function titleCasePhrase(s){
    const x=cleanText(s); if(!x)return x;
    return x.charAt(0).toUpperCase()+x.slice(1);
  }
  async function suggest(text){
    const input=cleanText(text); if(!input)return {changed:false,corrected:'',suggestions:[],engine:'master-dictionary-10m',loadedShards:[]};
    const toks=tokenise(input); if(!toks.length)return {changed:false,corrected:input,suggestions:[],engine:'master-dictionary-10m',loadedShards:[]};
    const shardIds=toks.map(shardFor);
    const shards=await loadShards(shardIds);
    const replacements=new Map();
    const alternatives=new Map();
    for(const tok of toks){
      const sh=shards.get(shardFor(tok)); if(!sh)continue;
      const key=norm(tok); if(KNOWN_GOOD_RU.has(key))continue; let canon=sh.map.get(key);
      let alts=[];
      if(canon && canon===key)continue;
      if(canon && isPlausibleCanonical(canon)){
        const d=levenshtein(key,canon,4);
        const score=1-(d/Math.max(Array.from(key).length,Array.from(canon).length));
        if(d<=4 && score>=0.50){replacements.set(key,canon); alternatives.set(key,[{text:canon,score,source:key}]);continue;}
      }
      alts=topFuzzy(key,sh);
      if(alts.length){replacements.set(key,alts[0].text);alternatives.set(key,alts);}
    }
    if(!replacements.size)return {changed:false,corrected:input,suggestions:[],engine:'master-dictionary-10m',loadedShards:[...shards.keys()]};
    let corrected=''; let last=0;
    const re=/[A-Za-zА-Яа-яЁёІіЇїЄєҐґĂăÂâÎîȘșŞşŢţȚț]+/g; let m;
    while((m=re.exec(input))){
      corrected+=input.slice(last,m.index);
      const key=norm(m[0]); const rep=replacements.get(key);
      corrected+=rep?rep:m[0]; last=re.lastIndex;
    }
    corrected+=input.slice(last);
    corrected=titleCasePhrase(corrected.replace(/\s+/g,' ').trim());
    const suggestionRows=[];
    const rowMap=new Map();
    for(const [key,alts] of alternatives){
      for(const a of alts){const t=String(a.text||'').trim(); if(!t||rowMap.has(t))continue;rowMap.set(t,a.score);}
    }
    if(corrected && norm(corrected)!==norm(input))suggestionRows.push({text:corrected,note:'Найдено во внешней памяти словаря 10 млн',confidence:Math.min(.96,Math.max(.55,...[...rowMap.values(),.55]))});
    for(const t of rowMap.keys()){
      if(suggestionRows.some(x=>norm(x.text)===norm(t)))continue;
      suggestionRows.push({text:titleCasePhrase(t),note:'Вариант из внешней памяти словаря 10 млн',confidence:rowMap.get(t)||.55});
      if(suggestionRows.length>=5)break;
    }
    return {changed:norm(corrected)!==norm(input),corrected,suggestions:suggestionRows.slice(0,5),engine:'master-dictionary-10m',offline:true,confidence:suggestionRows[0]?.confidence||.45,loadedShards:[...shards.keys()],dictionaryEntries:10000000};
  }
  async function searchToken(token){
    const t=norm(token); if(!t)return [];
    if(KNOWN_GOOD_RU.has(t))return [{text:t,score:1,source:t,knownGood:true}];
    const sh=await loadShard(shardFor(t)); if(!sh)return [];
    const exact=sh.map.get(t);
    if(exact)return [{text:exact,score:1,source:t}];
    return topFuzzy(t,sh);
  }
  window.MG_DICTIONARY_10M={suggest,searchToken,shardFor,crc32,loadManifest,version:'v403',entryCount:10000000};
})();
