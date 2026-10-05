/* Master Group v32 — smart dictionary search engine with Russian-friendly aliases and contextual suggestions. */
(function(){
const A=window.MG_DICTIONARY_ACTIONS||[],W=window.MG_DICTIONARY_WORKS||[],L=window.MG_DICTIONARY_ACTION_WORKS||{},ATTR=window.MG_DICTIONARY_WORK_ATTRIBUTES||{};
const lower=s=>String(s||'').toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
const compact=s=>lower(s).replace(/[.,;:!?()[\]{}"'`]/g,'').replace(/\s+/g,' ');
const aliases={
"металлоконструкция":["металлоконструкция","металоконструкция","металлоконструкцыя","металоконструкцыя","металлическая конструкция"],
"задний маятник":["задний маятник","задней маятник","задний маятника","маятник задний"],
"маятник":["маятник","маятника","маятнику","маятником","маятники"],
"штробление":["штробление","штробовка","штроба","штробы","штробить"],
"покраска":["покраска","покрасска"],
"шпаклевка":["шпаклевка","шпатлевка","шпаклёвка","шпаклевание"],
"грунтовка":["грунтовка","грунтование","грунтовочная"],
"подключение":["подключение","подключить","подключения"],
"установка":["установка","установить","установки"],
"монтаж":["монтаж","монтирование","смонтировать"],
"замена":["замена","заменить","замены"],
"ремонт":["ремонт","ремонтировать","ремонта"],
"сварка":["сварка","сварить","сварки"],
"сверление":["сверление","сверлить","сверловка"],
"демонтаж":["демонтаж","демонтировать","демонтажа"],
"металл":["металл","металла","металлу","металлом","металлический","металлическая"],
"пластик":["пластик","пластика","пластику","пластиком","пластиковый","пластиковая"],
"дерево":["дерево","дерева","дереву","деревом","деревянный","деревянная"],
"стена":["стена","стены","стену","стеной","стене","стенный"],
"потолок":["потолок","потолка","потолку","потолком","потолочный"],
"пол":["пол","пола","полу","полом","напольный"],
"кабель":["кабель","кабеля","кабелю","кабелем","кабельный"],
"труба":["труба","трубы","трубу","трубой","трубопровод"],
"рама":["рама","рамы","раму","рамой","рамная"],
"профиль":["профиль","профиля","профилю","профилем","профильный"]};
// v29: common conversational/infinitive forms for users who do not know the exact noun form.
const EXTRA_ACTION_ALIASES={
  "восстановление":["восстановить","восстановил","восстановили","восстановления","восстановлением"],
  "вывоз":["вывезти","вывозить","вывез"],
  "герметизация":["герметизировать","загерметизировать","герметик"],
  "гибка":["гнуть","согнуть","гибать"],
  "гидроизоляция":["гидроизолировать","гидроизолировал"],
  "грунтовка":["грунтовать","загрунтовать"],
  "демонтаж":["демонтировать","демонтировать","снять"],
  "замена":["заменить","поменять"],
  "зачистка":["зачистить","зачищать"],
  "изготовление":["изготовить","сделать","изготавливать"],
  "крепление":["закрепить","крепить","прикрепить"],
  "мойка":["мыть","помыть","помыть"],
  "монтаж":["монтировать","смонтировать"],
  "настройка":["настроить","настраивать"],
  "обслуживание":["обслужить","обслуживать"],
  "очистка":["очистить","почистить","чистить"],
  "пайка":["паять","спаять"],
  "покраска":["покрасить","покрас","окрасить","окрашивать"],
  "прокладка":["проложить","прокладывать"],
  "прочистка":["прочистить","прочищать"],
  "разборка":["разобрать","разбирать"],
  "разводка":["развести","разводить"],
  "регулировка":["отрегулировать","регулировать"],
  "ремонт":["ремонтировать","отремонтировать","починить","починка"],
  "сборка":["собрать","собирать"],
  "сварка":["сварить","сваривать"],
  "сверление":["сверлить","просверлить"],
  "шлифовка":["шлифовать","отшлифовать"],
  "штробление":["штробить","проштабить","штробовка"],
  "установка":["установить","поставить","установка"],
  "утепление":["утеплить","утеплять"],
  "укладка":["уложить","укладывать"],
  "проверка":["проверить","проверять"],
  "измерение":["измерить","замерить","померить"],
  "разметка":["разметить","размечать"],
  "бурение":["бурить","пробурить"],
  "долбление":["долбить","продолбить"],
  "сверление":["сверлить","просверлить"],
  "резка":["резать","отрезать","нарезать"],
  "фрезеровка":["фрезеровать","сфрезеровать"],
  "полировка":["полировать","отполировать"],
  "затирка":["затереть","затирать"],
  "облицовка":["облицевать","облицовывать"],
  "укрепление":["укрепить","усилить"]
};
const EXTRA_CONTEXT_RELATIONS={
  "задний":["Задний маятник","Задний багажник","Задний бампер","Заднее крыло","Задняя подвеска","Задний фонарь","Задний поворотник"],
  "задняя":["Задний маятник","Задний багажник","Задний бампер","Заднее крыло","Задняя подвеска","Задний фонарь","Задний поворотник"],
  "заднее":["Задний маятник","Задний багажник","Задний бампер","Заднее крыло","Задняя подвеска","Задний фонарь","Задний поворотник"],
  "передний":["Передний маятник","Передний багажник","Передний бампер","Переднее крыло","Передняя подвеска","Передний фонарь","Передний поворотник"],
  "передняя":["Передний маятник","Передний багажник","Передний бампер","Переднее крыло","Передняя подвеска","Передний фонарь","Передний поворотник"],
  "переднее":["Передний маятник","Передний багажник","Передний бампер","Переднее крыло","Передняя подвеска","Передний фонарь","Передний поворотник"]
};
const NON_ACTION_WORDS=new Set(["задний","задняя","заднее","передний","передняя","переднее","левый","левая","левое","правый","правая","правое","верхний","верхняя","верхнее","нижний","нижняя","нижнее","внешний","внешняя","внешнее","внутренний","внутренняя","внутреннее","перед","зад","слева","справа"]);
const EXTRA_TERMS=[
  "Багажник","Задний багажник","Передний багажник","Багажник мотоцикла","Багажник квадроцикла",
  "Задний маятник","Передний маятник","Маятник мотоцикла","Маятник квадроцикла",
  "Металлоконструкция","Металлическая конструкция","Металлоконструкции","Металлоконструкцию",
  "Штробление","Штробовка","Штроба","Подрозетник","Каркас","Ферма","Кронштейн",
  "Бампер","Крыло","Обтекатель","Пластик мотоцикла","Пластик квадроцикла"
];
const canon=new Map();for(const a of A)canon.set(compact(a),a);
for(const[c,arr]of Object.entries(aliases))for(const x of arr)canon.set(compact(x),c);
for(const[c,arr]of Object.entries(EXTRA_ACTION_ALIASES))for(const x of arr)canon.set(compact(x),c);
// Also derive simple verb forms from common action nouns (e.g. подключение -> подключить).
for(const a of A){const x=compact(a);let v=null;if(x.endsWith("ение"))v=x.slice(0,-4)+"ить";else if(x.endsWith("ание"))v=x.slice(0,-4)+"ать";else if(x.endsWith("ирование"))v=x.slice(0,-8)+"ировать";if(v)canon.set(v,a)}
function stem(s){let x=compact(s);if(x.length<5)return x;return x.replace(/(иями|ями|ами|ого|ему|ому|ими|ыми|ой|ый|ий|ая|ое|ые|ую|юю|ей|ам|ем|ом|ах|ях|ов|ев|ы|и|а|я|у|ю|е|о)$/,'')}
function canonicalToken(s){const x=compact(s);if(canon.has(x))return canon.get(x);const st=stem(x);for(const[k,v]of canon)if(stem(k)===st)return v;return s}
const uniq=a=>{const o=[],s=new Set();for(const x of a||[]){const k=compact(x);if(k&&!s.has(k)){s.add(k);o.push(String(x))}}return o};
function lev(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>2)return 9;let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let q=[i];for(let j=1;j<=b.length;j++)q[j]=Math.min(q[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=q}return p[b.length]}
function actionCanon(x){const c=canonicalToken(x),q=compact(x);if(NON_ACTION_WORDS.has(q))return null;const hit=A.find(a=>compact(a)===compact(c));if(hit)return hit;if(q.length<4)return null;let best=null,bd=9;for(const a of A){const d=lev(q,compact(a));if(d<bd){bd=d;best=a}}return bd<=2?best:null}
const global=uniq([...W,...Object.values(L).flat(),...Object.keys(L),...Object.values(ATTR).flat(),...EXTRA_TERMS]);
const fuzzyBuckets=new Map();
for(const x of global){const k=compact(x).slice(0,1);const a=fuzzyBuckets.get(k)||[];a.push(x);fuzzyBuckets.set(k,a)}
const related=new Map();
for(const vs0 of Object.values(L)){const vs=uniq(vs0).slice(0,121);for(const v of vs){const k=compact(v),arr=related.get(k)||[];for(const x of vs)if(compact(x)!==k&&arr.length<120)arr.push(x);related.set(k,uniq(arr))}}
function prefix(items,q,n){const p=compact(q);if(!p)return items.slice(0,n);const st=stem(p);return items.filter(x=>compact(x).startsWith(p)||stem(x).startsWith(st)).slice(0,n)}
function prefixAnyToken(items,q,n){const p=compact(q);if(!p)return items.slice(0,n);const st=stem(p);return items.filter(x=>String(x).split(/\s+/).some(t=>compact(t).startsWith(p)||stem(t).startsWith(st))).slice(0,n)}
function fuzzy(items,q,n){const p=compact(q);if(!p)return[];const dmax=p.length>=5?2:1;const pool=items===global?(fuzzyBuckets.get(p.slice(0,1))||[]):items;return pool.map(x=>[x,lev(stem(x),stem(p))]).filter(x=>x[1]<=dmax).sort((a,b)=>a[1]-b[1]).slice(0,n).map(x=>x[0])}
function score(items,q){const p=compact(q),u=uniq(items),ord=new Map(u.map((x,i)=>[compact(x),i]));return u.sort((a,b)=>{const aa=compact(a),bb=compact(b),sa=aa===p?0:(aa.startsWith(p)?1:(stem(aa).startsWith(stem(p))?2:3)),sb=bb===p?0:(bb.startsWith(p)?1:(stem(bb).startsWith(stem(p))?2:3));return sa-sb||ord.get(aa)-ord.get(bb)})}
function suggest(input,n=60){
 const raw=String(input||''),trailing=/\s$/.test(raw),normalized=compact(raw);
 if(!normalized)return score(A,'').slice(0,n);
 let tok=raw.trim().split(/\s+/).filter(Boolean),cur=trailing?'':(tok.pop()||''),act=tok.length?actionCanon(tok[0]):actionCanon(cur),items=[];
 if(tok.length===0){
   // A typed verb/conversational form should immediately resolve to the canonical action.
   if(act){
     items.unshift(act);
     // Keep nearby action names available without burying the canonical answer.
     const head=prefix(A,act,n);
     items.push(...head.filter(x=>compact(x)!==compact(act)));
     if(items.length<n)items.push(...fuzzy(A,act,n-items.length));
     return uniq(items).slice(0,n);
   }
   items.push(...prefix(A,cur,n));
   if(items.length<n)items.push(...fuzzy(A,cur,n-items.length));
   if(!items.length){
     // Search the whole lexical index when the first token is a noun/verb not classified as an action.
     items.push(...prefix(global,cur,n));
     if(items.length<n)items.push(...fuzzy(global,cur,n-items.length));
   }
   return score(items,cur).slice(0,n)
 }
 if(act){
   if(tok.length===1){
     const direct=L[act]||L[lower(act)]||[];
     items.push(...prefix(uniq([...direct,...global]),cur,n));
     if(items.length<n)items.push(...fuzzy(uniq([...direct,...global]),cur,n-items.length));
   }else{
     const prev=canonicalToken(tok[tok.length-1]),rel=related.get(compact(prev))||[],attr=ATTR[lower(prev)]||ATTR[compact(prev)]||[];
     items.push(...prefix(uniq([...rel,...attr,...EXTRA_CONTEXT_RELATIONS[compact(prev)]||[],...global]),cur,n));
     if(items.length<n)items.push(...fuzzy(uniq([...rel,...attr,...EXTRA_CONTEXT_RELATIONS[compact(prev)]||[],...global]),cur,n-items.length));
   }
 } else {
   const prevRaw=tok[tok.length-1],prev=canonicalToken(prevRaw),ctx=EXTRA_CONTEXT_RELATIONS[compact(prevRaw)]||EXTRA_CONTEXT_RELATIONS[compact(prev)]||[],rel=related.get(compact(prev))||[];
   items.push(...prefixAnyToken(uniq(ctx),cur,n));
   if(items.length<n)items.push(...prefix(uniq([...rel,...global]),cur,n-items.length));
   if(items.length<n)items.push(...fuzzy(uniq([...rel,...global]),cur,n-items.length));
 }
 // Last-resort fuzzy search across the full corpus for natural-language input that is not a dictionary headword.
 if(!items.length){
   const q=normalized;
   const close=(global===undefined?[]:global).map(x=>[x,lev(compact(x),q)]).filter(x=>x[1]<=2).sort((a,b)=>a[1]-b[1]).slice(0,n).map(x=>x[0]);
   items.push(...close);
 }
 // When a verb form maps to an action, surface the canonical action itself first.
 if(act && tok.length===0){items.unshift(act)}
 return score(items,cur||tok[tok.length-1]||normalized).slice(0,n)
}
window.MG_SMART_DICT={suggest,canonicalToken,actionCanon,normalize:compact,count:()=>((window.MG_MASTER_SERVICE_ALL||[]).length)};window.mgSmartSuggest=suggest;

function bindSmartInput(){
  const input=document.getElementById('directionServiceQuickInput');
  const strip=document.getElementById('directionServiceWordSuggestions');
  if(!input||!strip||input.__mgSmartBound)return;
  input.__mgSmartBound=true;
  const render=()=>{
    const value=String(input.value||'');
    let items=suggest(value,60);
    // If the user has typed a complete phrase, still try to surface close matches.
    if(value.trim() && !items.length){
      const q=compact(value), pool=global;
      items=pool.map(x=>[x,lev(compact(x),q)]).filter(x=>x[1]<=2)
        .sort((a,b)=>a[1]-b[1]).slice(0,12).map(x=>x[0]);
    }
    strip.innerHTML=items.map(word=>'<button type="button" class="direction-service-word-suggestion" data-service-word="'+
      String(word).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')+'">'+
      String(word).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</button>').join('');
    strip.hidden=!items.length;
  };
  input.addEventListener('input',render);
  input.addEventListener('focus',render);
  strip.addEventListener('click',e=>{
    const b=e.target.closest('[data-service-word]');
    if(!b)return;
    const value=String(input.value||''),m=value.match(/^(.*?)(\S*)$/);
    input.value=(m?.[1]||'')+b.dataset.serviceWord+' ';
    input.focus(); render();
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindSmartInput);else bindSmartInput();
new MutationObserver(bindSmartInput).observe(document.documentElement,{childList:true,subtree:true});

})();