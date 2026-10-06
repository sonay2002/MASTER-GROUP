/* Master Group v32 — Russian-friendly smart dictionary.
 * The UI stays untouched. This file only improves normalization, typo tolerance,
 * contextual ranking and safe fallback search for additional-service input.
 */
(function(){
'use strict';

const ACTIONS=window.MG_DICTIONARY_ACTIONS||[];
const WORKS=window.MG_DICTIONARY_WORKS||[];
const ACTION_WORKS=window.MG_DICTIONARY_ACTION_WORKS||{};
const ATTR=window.MG_DICTIONARY_WORK_ATTRIBUTES||{};
const STAGES=window.MG_DICTIONARY_STAGES||{};

function lower(v){return String(v??'').toLocaleLowerCase('ru').replace(/ё/g,'е').trim()}
function compact(v){return lower(v).replace(/[.,;:!?()[\]{}"'`]/g,'').replace(/\s+/g,' ')}

/* Common mistakes made when Russian is written by ear or with weak spelling.
 * Keep these mappings deliberately conservative: the fuzzy scorer handles the rest.
 */
const ACTION_ALIASES={
  восстановление:['восстановить','восстановил','восстановили','восстановления','восстановлением'],
  вывоз:['вывезти','вывозить','вывез','вывезем'],
  герметизация:['герметизировать','загерметизировать','герметик'],
  гибка:['гнуть','согнуть','гибать'],
  гидроизоляция:['гидроизолировать','гидроизолировал'],
  грунтовка:['грунтовать','загрунтовать'],
  демонтаж:['демонтировать','демонтирвоать','снять'],
  замена:['заменить','поменять','замена'],
  зачистка:['зачистить','зачищать'],
  изготовление:['изготовить','изготавливать'],
  крепление:['закрепить','крепить','прикрепить'],
  мойка:['мыть','помыть'],
  монтаж:['монтировать','смонтировать'],
  настройка:['настроить','настраивать'],
  обслуживание:['обслужить','обслуживать'],
  очистка:['очистить','почистить','чистить'],
  пайка:['паять','спаять'],
  покраска:['покрасить','покрас','окрасить','окрашивать'],
  прокладка:['проложить','прокладывать'],
  прочистка:['прочистить','прочищать'],
  разборка:['разобрать','разбирать'],
  разводка:['развести','разводить'],
  регулировка:['отрегулировать','регулировать'],
  ремонт:['ремонтировать','отремонтировать','починить','починка'],
  сборка:['собрать','собирать'],
  сварка:['сварить','сваривать'],
  сверление:['сверлить','просверлить','сверловка'],
  шлифовка:['шлифовать','отшлифовать'],
  штробление:['штробить','проштабить','штробовка','штроба'],
  установка:['установить','установит','поставить','установки'],
  утепление:['утеплить','утеплять'],
  укладка:['уложить','укладывать'],
  проверка:['проверить','проверять'],
  измерение:['измерить','замерить','померить'],
  разметка:['разметить','размечать'],
  бурение:['бурить','пробурить'],
  долбление:['долбить','продолбить'],
  резка:['резать','отрезать','нарезать'],
  фрезеровка:['фрезеровать','сфрезеровать'],
  полировка:['полировать','отполировать'],
  затирка:['затереть','затирать'],
  облицовка:['облицевать','облицовывать'],
  укрепление:['укрепить','усилить'],
  покос:['покосить','косить','скосить','скос','покос'],
  спил:['спилить','спиливание'],
  уборка:['убрать','убирать','убери'],
  погрузка:['погрузить','загрузить','загрузить машину'],
  разгрузка:['разгрузить'],
  доставка:['доставить','привезти','привез'],
  посадка:['посадить','сажать'],
  обрезка:['обрезать','подрезать'],
  подрезка:['подрезать','обрезать']
};

const EXTRA_ALIASES={
  металлоконструкция:['металлоконструкция','металоконструкция','металлоконструкцыя','металоконструкцыя','металлическая конструкция','металлоконструкции','металлоконструкцию'],
  'задний маятник':['задний маятник','задней маятник','задний маятника','маятник задний'],
  маятник:['маятник','маятника','маятнику','маятником','маятники'],
  штробление:['штробление','штробовка','штроба','штробы','штробить'],
  покраска:['покраска','покрасска'],
  шпаклевка:['шпаклевка','шпатлевка','шпаклёвка','шпаклевание'],
  грунтовка:['грунтовка','грунтование','грунтовочная'],
  подключение:['подключение','подключить','подключения'],
  установка:['установка','установить','установки'],
  монтаж:['монтаж','монтирование','смонтировать'],
  замена:['замена','заменить','замены'],
  ремонт:['ремонт','ремонтировать','ремонта'],
  сварка:['сварка','сварить','сварки'],
  сверление:['сверление','сверлить','сверловка'],
  демонтаж:['демонтаж','демонтировать','демонтажа'],
  металл:['металл','металла','металлу','металлом','металлический','металлическая'],
  пластик:['пластик','пластика','пластику','пластиком','пластиковый','пластиковая'],
  дерево:['дерево','дерева','дереву','деревом','деревянный','деревянная'],
  стена:['стена','стены','стену','стеной','стене','стенный'],
  потолок:['потолок','потолка','потолку','потолком','потолочный'],
  пол:['пол','пола','полу','полом','напольный'],
  кабель:['кабель','кабеля','кабелю','кабелем','кабельный'],
  труба:['труба','трубы','трубу','трубой','трубопровод'],
  рама:['рама','рамы','раму','рамой','рамная'],
  профиль:['профиль','профиля','профилю','профилем','профильный'],
  мусор:['мусор','мусора','мусору','мусором','мусорный'],
  трава:['трава','травы','траву','травой','траве'],
  камера:['камера','камеру','камеры','камерой','камере'],
  забор:['забор','забора','забору','забором','заборный']
};

const CONTEXT_RELATIONS={
  задний:['Задний маятник','Задний багажник','Задний бампер','Заднее крыло','Задняя подвеска','Задний фонарь','Задний поворотник'],
  задняя:['Задний маятник','Задний багажник','Задний бампер','Заднее крыло','Задняя подвеска','Задний фонарь','Задний поворотник'],
  заднее:['Задний маятник','Задний багажник','Задний бампер','Заднее крыло','Задняя подвеска','Задний фонарь','Задний поворотник'],
  передний:['Передний маятник','Передний багажник','Передний бампер','Переднее крыло','Передняя подвеска','Передний фонарь','Передний поворотник'],
  передняя:['Передний маятник','Передний багажник','Передний бампер','Переднее крыло','Передняя подвеска','Передний фонарь','Передний поворотник'],
  переднее:['Передний маятник','Передний багажник','Передний бампер','Переднее крыло','Передняя подвеска','Передний фонарь','Передний поворотник']
};
const NON_ACTION_WORDS=new Set(['задний','задняя','заднее','передний','передняя','переднее','левый','левая','левое','правый','правая','правое','верхний','верхняя','верхнее','нижний','нижняя','нижнее','внешний','внешняя','внешнее','внутренний','внутренняя','внутреннее','перед','зад','слева','справа']);
const EXTRA_TERMS=['Багажник','Задний багажник','Передний багажник','Багажник мотоцикла','Багажник квадроцикла','Задний маятник','Передний маятник','Маятник мотоцикла','Маятник квадроцикла','Металлоконструкция','Металлическая конструкция','Металлоконструкции','Металлоконструкцию','Штробление','Штробовка','Штроба','Подрозетник','Каркас','Ферма','Кронштейн','Бампер','Крыло','Обтекатель','Пластик мотоцикла','Пластик квадроцикла'];

const uniq=items=>{const out=[],seen=new Set();for(const x of items||[]){const s=String(x||'').trim(),k=compact(s);if(s&&k&&!seen.has(k)){seen.add(k);out.push(s)}}return out};

function stem(word){
  let x=compact(word);
  if(x.length<5)return x;
  return x.replace(/(иями|ями|ами|ого|ему|ому|ими|ыми|ой|ый|ий|ая|ое|ые|ую|юю|ей|ам|ем|ом|ах|ях|ов|ев|ы|и|а|я|у|ю|е|о)$/,'');
}

/* Weighted Damerau-Levenshtein.
 * Common Russian vowel swaps are cheap; transposition handles typos like
 * "демонтирвоать" → "демонтировать".
 */
const SOFT_SWAP=new Set(['ао','оа','еи','ие','ыи','иы','ея','яе','ою','уо','ао','ог']);
function charCost(a,b){
  if(a===b)return 0;
  if((a==='е'&&b==='ё')||(a==='ё'&&b==='е'))return 0;
  if(SOFT_SWAP.has(a+b)||SOFT_SWAP.has(b+a))return .35;
  return 1;
}
function distance(a,b){
  a=compact(a);b=compact(b);
  if(a===b)return 0;
  if(!a||!b)return Math.max(a.length,b.length);
  const n=a.length,m=b.length;
  if(Math.abs(n-m)>3)return 99;
  const prev2=new Array(m+1).fill(0),prev=new Array(m+1);
  for(let j=0;j<=m;j++)prev[j]=j;
  for(let i=1;i<=n;i++){
    const cur=new Array(m+1);cur[0]=i;
    for(let j=1;j<=m;j++){
      cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+charCost(a[i-1],b[j-1]));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],prev2[j-2]+.8);
    }
    prev2.splice(0,prev2.length,...prev);
    prev.splice(0,prev.length,...cur);
  }
  return prev[m];
}

function typoScore(query,candidate){
  const q=compact(query),c=compact(candidate);
  if(!q||!c)return 99;
  if(q===c)return 0;
  if(c.startsWith(q))return .05;
  const qs=stem(q),cs=stem(c);
  if(qs===cs)return .1;
  if(cs.startsWith(qs)||qs.startsWith(cs))return .25;
  const d=distance(q,c);
  const denom=Math.max(q.length,c.length,1);
  return d/denom;
}
function acceptableScore(score,query){
  const len=compact(query).length;
  return len<=3 ? score<=.35 : len<=5 ? score<=.48 : score<=.56;
}
function acceptableActionScore(score,query){
  const len=compact(query).length;
  if(len<3)return false;
  return len<=4 ? score<=.30 : len<=6 ? score<=.34 : score<=.30;
}

/* Canonical index. */
const canon=new Map();
const actionCanonMap=new Map();
for(const a of ACTIONS){canon.set(compact(a),a);actionCanonMap.set(compact(a),a);}
for(const [canonical,arr] of Object.entries(EXTRA_ALIASES))for(const x of arr)canon.set(compact(x),canonical);
for(const [canonical,arr] of Object.entries(ACTION_ALIASES))for(const x of arr){canon.set(compact(x),canonical);actionCanonMap.set(compact(x),canonical);}
for(const a of ACTIONS){
  const x=compact(a);
  let v=null;
  if(x.endsWith('ение'))v=x.slice(0,-4)+'ить';
  else if(x.endsWith('ание'))v=x.slice(0,-4)+'ать';
  else if(x.endsWith('ирование'))v=x.slice(0,-8)+'ировать';
  if(v)canon.set(v,a);
}

const ACTION_LIST=uniq(ACTIONS);
const GLOBAL=uniq([
  ...WORKS,
  ...Object.values(ACTION_WORKS).flatMap(v=>Array.isArray(v)?v:[]),
  ...Object.keys(ACTION_WORKS),
  ...Object.values(ATTR).flatMap(v=>Array.isArray(v)?v:[]),
  ...EXTRA_TERMS
]);

/* Individual lexical forms: a few thousand, not 500k phrases.
 * This keeps fuzzy search responsive even on phones.
 */
const WORK_CANONICALS=new Map();
for(const w of WORKS){WORK_CANONICALS.set(compact(w),w);}
const WORDS=uniq([
  ...GLOBAL.flatMap(x=>compact(x).split(/\s+/)),
  ...ACTION_LIST.flatMap(x=>compact(x).split(/\s+/)),
  ...Object.values(EXTRA_ALIASES).flat(),
  ...Object.values(ACTION_ALIASES).flat()
]);
const WORD_BUCKETS=new Map();
for(const word of WORDS){
  const c=compact(word);const key=c.length+'|'+(c.slice(0,1)||'_');
  const arr=WORD_BUCKETS.get(key)||[];arr.push(word);WORD_BUCKETS.set(key,arr);
}

const related=new Map();
for(const values of Object.values(ACTION_WORKS)){
  const list=uniq(values).slice(0,180);
  for(const value of list){
    const k=compact(value),arr=related.get(k)||[];
    for(const other of list){if(compact(other)!==k&&arr.length<160)arr.push(other)}
    related.set(k,uniq(arr));
  }
}

function canonicalToken(input){
  const q=compact(input);
  if(!q)return '';
  return canon.has(q)?canon.get(q):String(input||'');
}

function actionCanon(input){
  const q=compact(input);if(!q||NON_ACTION_WORDS.has(q))return null;
  if(actionCanonMap.has(q))return actionCanonMap.get(q);
  let best=null,bs=99;
  for(const a of ACTION_LIST){
    const ac=compact(a);
    if(q[0]!==ac[0])continue;
    const s=typoScore(q,a);
    if(s<bs){bs=s;best=a}
  }
  return best&&acceptableActionScore(bs,q)?best:null;
}

function sortedCandidates(items,q,limit){
  const p=compact(q);
  const u=uniq(items);
  return u.map((x,i)=>({x,i,s:typoScore(p,x)}))
    .filter(o=>acceptableScore(o.s,p)||compact(o.x).startsWith(p))
    .sort((a,b)=>a.s-b.s || (compact(a.x).startsWith(p)?-1:1)-(compact(b.x).startsWith(p)?-1:1) || a.i-b.i)
    .slice(0,limit)
    .map(o=>o.x);
}
function prefix(items,q,limit){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  return uniq(items).filter(x=>compact(x).startsWith(p)||stem(x).startsWith(stem(p))).slice(0,limit);
}
function fuzzyWords(items,q,limit){
  const p=compact(q);if(!p)return[];
  const first=(p[0]||'_'),len=p.length;
  const pool=[];
  for(let d=0;d<=2;d++){
    for(const l of [len-d,len,len+d]){
      if(l<2)continue;
      const arr=WORD_BUCKETS.get(l+'|'+first);if(arr)pool.push(...arr);
    }
  }
  let candidates=uniq(items).length<WORDS.length?uniq(items):uniq(pool.length?pool:WORDS);
  return sortedCandidates(candidates,p,limit);
}
function bestToken(items,q,limit){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  const pool=uniq(items);
  const direct=prefix(pool,p,limit*2);
  const merged=uniq([...direct,...sortedCandidates(pool,p,limit*4),...fuzzyWords(pool,p,limit*4)]);
  const canonical=canonicalToken(p);
  const order=new Map(pool.map((item,i)=>[compact(item),i]));
  const ranked=merged.map((item,i)=>({item,i,order:order.has(compact(item))?order.get(compact(item)):i,group:canonical&&compact(canonicalToken(item))===compact(canonical)?0:1,score:typoScore(p,item)}))
    .sort((a,b)=>a.group-b.group||(a.group===0?a.order-b.order:a.score-b.score)||a.i-b.i);
  return ranked.slice(0,limit).map(x=>x.item);
}
function bestTokenAnyWord(items,q,limit){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  const canonical=canonicalToken(p);
  const out=uniq(items).map((item,i)=>{
    const tokens=compact(item).split(/\s+/);
    let best=99,group=1,hasPrefix=false;
    for(const token of tokens){
      const score=typoScore(p,token);
      if(score<best)best=score;
      if(compact(token).startsWith(p))hasPrefix=true;
      if(canonical&&compact(canonicalToken(token))===compact(canonical))group=0;
    }
    return {item,i,best,group,hasPrefix};
  }).filter(x=>acceptableScore(x.best,p))
    .sort((a,b)=>a.group-b.group||(a.group===0?a.i-b.i:Number(b.hasPrefix)-Number(a.hasPrefix)||a.best-b.best||a.i-b.i))
    .slice(0,limit)
    .map(x=>x.item);
  return out;
}

function actionWorks(action){
  const key=compact(action);
  const direct=ACTION_WORKS[key]||ACTION_WORKS[action]||[];
  const rel=related.get(key)||[];
  const attrs=ATTR[key]||ATTR[action]||[];
  const extra=CONTEXT_RELATIONS[key]||[];
  return uniq([...(direct||[]),...rel,...attrs,...extra,...WORKS]);
}

function firstWordCandidates(q,limit){
  const action=actionCanon(q);
  if(action)return uniq([action,...bestToken(ACTION_LIST,q,limit)]).slice(0,limit);
  const canonical=canonicalToken(q);
  const canonicalWork=WORK_CANONICALS.get(compact(canonical));
  if(canonicalWork)return uniq([canonicalWork,...bestToken(WORKS,q,limit)]).slice(0,limit);
  if(compact(q).length<=2){
    const actionHits=prefix(ACTION_LIST,q,limit);
    const workHits=prefix(WORKS,q,limit);
    const globalHits=prefix(WORDS,q,Math.max(4,Math.floor(limit/2)));
    return uniq([...actionHits,...workHits,...globalHits]).slice(0,limit);
  }
  const workHits=bestToken(WORKS,q,limit);
  const actionHits=bestToken(ACTION_LIST,q,limit);
  const globalHits=bestToken(WORDS,q,Math.max(4,Math.floor(limit/2)));
  const bestWork=workHits[0];
  const bestAction=actionHits[0];
  if(bestWork && (!bestAction || typoScore(q,bestWork)<=typoScore(q,bestAction)+0.04))
    return uniq([bestWork,...workHits,...actionHits,...globalHits]).slice(0,limit);
  return uniq([...actionHits,...workHits,...globalHits]).slice(0,limit);
}

function suggest(input,limit=60){
  const raw=String(input??''),trimmed=raw.trim(),trailing=/\s$/.test(raw);
  if(!trimmed)return ACTION_LIST.slice(0,limit);

  const rawTokens=trimmed.split(/\s+/).filter(Boolean);
  const current=trailing?'':(rawTokens.pop()||'');
  const previous=rawTokens;
  const action=previous.length?actionCanon(previous[0]):actionCanon(current);

  /* One-word input: correct the action immediately. */
  if(!previous.length){
    if(action)return uniq([action,...bestToken(ACTION_LIST,current,limit)]).slice(0,limit);
    return firstWordCandidates(current,limit);
  }

  /* Correct the first token before choosing the context. */
  const canonicalAction=action||actionCanon(previous[0]);
  if(canonicalAction){
    const candidates=actionWorks(canonicalAction);
    if(trailing){
      /* After a chosen word and a space, expose the next logical context words. */
      const last=previous[previous.length-1];
      const lastCanon=canonicalToken(last);
      const attrs=ATTR[compact(lastCanon)]||ATTR[compact(last)]||STAGES.характеристика||[];
      const extras=CONTEXT_RELATIONS[compact(lastCanon)]||[];
      return uniq([...attrs,...extras,...STAGES.дополнение||[],...candidates]).slice(0,limit);
    }
    return bestTokenAnyWord(candidates,current,limit);
  }

  /* Non-action context: use the previous word to constrain the search. */
  const last=previous[previous.length-1];
  const lastCanon=canonicalToken(last);
  const context=uniq([
    ...(CONTEXT_RELATIONS[compact(lastCanon)]||[]),
    ...(related.get(compact(lastCanon))||[]),
    ...(ATTR[compact(lastCanon)]||[]),
    ...WORKS
  ]);
  const result=bestTokenAnyWord(context,current,limit);
  if(result.length)return result;

  /* Last-resort lexical correction, but only against individual words. */
  return bestToken(WORDS,current,limit);
}

window.MG_SMART_DICT={
  suggest,
  canonicalToken,
  actionCanon,
  normalize:compact,
  count:()=>((window.MG_MASTER_SERVICE_ALL||[]).length),
  version:'v32-smart-2'
};
window.mgSmartSuggest=suggest;

/* Do not bind DOM handlers here. estimate-core.js already owns input/click handling.
 * Keeping the engine side-effect free prevents duplicate insertion events.
 */
})();
