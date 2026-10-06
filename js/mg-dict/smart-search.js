/* Master Group v33 — Russian AI-like fuzzy dictionary.
 * Offline, typo-tolerant and context-aware search for estimate service names.
 * The engine is intentionally UI-agnostic: estimate-core.js owns DOM events.
 */
(function(){
'use strict';

const ACTIONS=window.MG_DICTIONARY_ACTIONS||[];
const WORKS=window.MG_DICTIONARY_WORKS||[];
const ACTION_WORKS=window.MG_DICTIONARY_ACTION_WORKS||{};
const ATTR=window.MG_DICTIONARY_WORK_ATTRIBUTES||{};
const STAGES=window.MG_DICTIONARY_STAGES||{};
const MASTER=window.MG_MASTER_SERVICE_ALL||[];

function lower(v){
  return String(v??'').toLocaleLowerCase('ru').replace(/ё/g,'е');
}
function compact(v){
  return lower(v).replace(/[.,;:!?()[\]{}"'`]/g,'').replace(/\s+/g,' ').trim();
}
function letters(v){return compact(v).replace(/[^а-я0-9-]+/g,'').replace(/^-+|-+$/g,'');}
function consonantSkeleton(v){
  return letters(v).replace(/[аеёиоуыэюя]/g,'');
}
function vowelSkeleton(v){
  return letters(v).replace(/[^аеёиоуыэюя]/g,'');
}


/* Common Russian estimate/construction terms that must be treated as legitimate words.
 * These are protected from fuzzy rewriting, while still participating in search. */
const COMMON_RUSSIAN=[
  'отделка','сантехника','электрика','проводка','водоснабжение','канализация','отопление',
  'вентиляция','освещение','изоляция','теплоизоляция','звукоизоляция','пароизоляция',
  'шпаклёвка','шпатлёвка','гидроизоляция','гидроизоляция','покрытие','облицовка','фасад',
  'кладка','кирпичная кладка','бетонирование','армирование','оштукатуривание','штукатурка',
  'грунтовка','покраска','побелка','оклейка','обои','плитка','керамогранит','ламинат',
  'линолеум','паркет','плинтус','стяжка','наливной пол','натяжной потолок','гипсокартон',
  'профиль','каркас','перегородка','дверь','окно','подоконник','откос','лестница',
  'металл','металлоконструкция','дерево','пластик','бетон','раствор','цемент','песок',
  'кабель','труба','трубопровод','радиатор','бойлер','смеситель','раковина','унитаз',
  'розетка','выключатель','светильник','кондиционер','камера','забор','ворота','кровля',
  'крыша','железо','профнастил','черепица','мебель','кухня','ванная','санузел','комната',
  'квартира','дом','офис','гараж','склад','улица','участок','помещение','поверхность',
  'стена','потолок','пол','проём','основание','фундамент','перекрытие','балка','колонна',
  'плита','маятник','рама','кронштейн','крепёж','крепление','герметик','краска','эмаль','лак',
  'щебень','гравий','галька','грунт','земля','трава','дерево','кустарник','растения',
  'уборка','вывоз','погрузка','разгрузка','доставка','измерение','разметка','диагностика',
  'проверка','обслуживание','настройка','ремонт','замена','установка','монтаж','демонтаж'
];

/* Common forms + aliases. These are only hints; the fuzzy engine does the hard work. */
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
  прокладка:['проложить','прокладывать','проводка'],
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
  маятник:['маятник','маятника','маятнику','маятником','маятники','маятнек','маятнек'],
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
  задняя:['Задний маятник','Задний багажник','Заднее крыло','Задняя подвеска'],
  заднее:['Задний маятник','Задний багажник','Заднее крыло','Задняя подвеска'],
  передний:['Передний маятник','Передний багажник','Передний бампер','Переднее крыло','Передняя подвеска','Передний фонарь','Передний поворотник'],
  передняя:['Передний маятник','Передний багажник','Переднее крыло','Передняя подвеска'],
  переднее:['Передний маятник','Передний багажник','Переднее крыло','Передняя подвеска']
};
const NON_ACTION_WORDS=new Set(['задний','задняя','заднее','передний','передняя','переднее','левый','левая','левое','правый','правая','правое','верхний','верхняя','верхнее','нижний','нижняя','нижнее','внешний','внешняя','внешнее','внутренний','внутренняя','внутреннее','перед','зад','слева','справа']);
const EXTRA_TERMS=['Багажник','Задний багажник','Передний багажник','Багажник мотоцикла','Багажник квадроцикла','Задний маятник','Передний маятник','Маятник мотоцикла','Маятник квадроцикла','Металлоконструкция','Металлическая конструкция','Металлоконструкции','Металлоконструкцию','Штробление','Штробовка','Штроба','Подрозетник','Каркас','Ферма','Кронштейн','Бампер','Крыло','Обтекатель','Пластик мотоцикла','Пластик квадроцикла'];

const uniq=items=>{
  const out=[],seen=new Set();
  for(const x of items||[]){
    const s=String(x||'').trim(),k=compact(s);
    if(s&&k&&!seen.has(k)){seen.add(k);out.push(s)}
  }
  return out;
};

function stem(word){
  let x=compact(word);
  if(x.length<5)return x;
  return x.replace(/(иями|ями|ами|ого|ему|ому|ими|ыми|ой|ый|ий|ая|ое|ые|ую|юю|ей|ам|ем|ом|ах|ях|ов|ев|ы|и|а|я|у|ю|е|о)$/,'');
}

/* Keyboard/phonetic tolerance: Russian vowels and paired consonants are treated as close.
 * This is deliberately used as one signal among several, not as a replacement for spelling. */
const PHONETIC_GROUP={
  а:'A',о:'A',я:'A',
  е:'E',ё:'E',э:'E',
  и:'I',ы:'I',
  у:'U',ю:'U',
  б:'B',п:'B',
  в:'V',ф:'V',
  г:'G',к:'G',х:'G',
  д:'D',т:'D',
  ж:'S',ш:'S',щ:'S',з:'S',с:'S',ц:'S',
  ч:'C',
  м:'M',н:'N',
  л:'L',р:'R',
  й:'J',
  ь:'',ъ:'',
  '-':'-'
};
function phonetic(v){
  const s=letters(v);let out='';
  for(const ch of s){const g=PHONETIC_GROUP[ch];if(g!==undefined)out+=g;else out+=ch;}
  return out;
}
function bigrams(v){
  const s=letters(v),out=[];
  if(s.length===1)return [s];
  for(let i=0;i<s.length-1;i++)out.push(s.slice(i,i+2));
  return out;
}
function dice(a,b){
  const aa=bigrams(a),bb=bigrams(b);
  if(!aa.length||!bb.length)return 0;
  const counts=new Map();for(const x of aa)counts.set(x,(counts.get(x)||0)+1);
  let common=0;for(const x of bb){const n=counts.get(x)||0;if(n){counts.set(x,n-1);common++;}}
  return (2*common)/(aa.length+bb.length);
}

function distance(a,b){
  a=letters(a);b=letters(b);
  if(a===b)return 0;
  if(!a||!b)return Math.max(a.length,b.length);
  const n=a.length,m=b.length;
  let prev=new Array(m+1),prev2=new Array(m+1);
  for(let j=0;j<=m;j++)prev[j]=j;
  for(let i=1;i<=n;i++){
    const cur=new Array(m+1);cur[0]=i;
    for(let j=1;j<=m;j++){
      const sub=prev[j-1]+(a[i-1]===b[j-1]?0:1);
      const del=prev[j]+1,ins=cur[j-1]+1;
      cur[j]=Math.min(sub,del,ins);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],prev2[j-2]+1);
    }
    prev2=prev;prev=cur;
  }
  return prev[m];
}

const SCORE_CACHE=new Map();
function pairScore(query,candidate){
  const q=letters(query),c=letters(candidate);
  if(!q||!c)return 0;
  if(q===c)return 1;
  const key=q+'|'+c;
  const cached=SCORE_CACHE.get(key);if(cached!==undefined)return cached;
  const maxLen=Math.max(q.length,c.length,1);
  const pq=phonetic(q),pc=phonetic(c);
  const qs=consonantSkeleton(q),cs=consonantSkeleton(c);
  const qv=vowelSkeleton(q),cv=vowelSkeleton(c);
  const edit=1-(distance(q,c)/maxLen);
  const phon=1-(distance(pq,pc)/Math.max(pq.length,pc.length,1));
  const grams=dice(q,c);
  const consonants=1-(distance(qs,cs)/Math.max(qs.length,cs.length,1));
  const vowels=1-(distance(qv,cv)/Math.max(qv.length,cv.length,1));
  const stemMatch=stem(q)===stem(c);
  const prefix=c.startsWith(q)||q.startsWith(c);
  const prefixBonus=prefix?.08:0;
  let score=(edit*.42)+(phon*.22)+(grams*.14)+(consonants*.16)+(vowels*.04)+(stemMatch?.10:0)+prefixBonus;
  if(q.length>=4 && c.includes(q))score+=.07;
  if(qs&&cs&&qs===cs)score=Math.max(score,.82);
  score=Math.min(1,score);
  SCORE_CACHE.set(key,score);
  if(SCORE_CACHE.size>30000){const first=SCORE_CACHE.keys().next().value;SCORE_CACHE.delete(first);}
  return score;
}

function acceptable(score,query){
  const len=letters(query).length;
  if(len<=1)return false;
  if(len<=2)return score>=.72;
  if(len<=4)return score>=.57;
  if(len<=6)return score>=.50;
  if(len<=9)return score>=.45;
  return score>=.40;
}
function strong(score,query){
  const len=letters(query).length;
  if(len<=2)return score>=.86;
  if(len<=4)return score>=.70;
  if(len<=6)return score>=.64;
  if(len<=9)return score>=.57;
  return score>=.50;
}

/* Canonical index. Prefer real display forms over intentionally misspelled aliases. */
const canon=new Map();
const actionCanonMap=new Map();
const PREFERRED_CANONICALS=uniq([
  ...ACTIONS,
  ...WORKS,
  ...Object.keys(EXTRA_ALIASES),
  ...COMMON_RUSSIAN,
  ...EXTRA_TERMS
]);
for(const a of ACTIONS){canon.set(compact(a),a);actionCanonMap.set(compact(a),a);}
for(const w of WORKS)canon.set(compact(w),w);
for(const x of Object.keys(EXTRA_ALIASES))canon.set(compact(x),x);
for(const x of COMMON_RUSSIAN)canon.set(compact(x),x);
for(const x of EXTRA_TERMS){
  const k=compact(x);
  if(!canon.has(k))canon.set(k,x);
}
for(const [canonical,arr] of Object.entries(EXTRA_ALIASES))for(const x of arr){
  const k=compact(x);
  /* Keep valid/common Russian surfaces unchanged; aliases only repair non-standard spellings. */
  if(!COMMON_RUSSIAN.some(v=>compact(v)===k) && k!==compact(canonical))canon.set(k,canonical);
}
for(const [canonical,arr] of Object.entries(ACTION_ALIASES))for(const x of arr){
  const k=compact(x), isCanonical=compact(canonical)===k;
  if(!COMMON_RUSSIAN.some(v=>compact(v)===k) || isCanonical)canon.set(k,canonical);
  if(!COMMON_RUSSIAN.some(v=>compact(v)===k) || isCanonical)actionCanonMap.set(k,canonical);
}
for(const a of ACTIONS){
  const x=compact(a);let v=null;
  if(x.endsWith('ение'))v=x.slice(0,-4)+'ить';
  else if(x.endsWith('ание'))v=x.slice(0,-4)+'ать';
  else if(x.endsWith('ирование'))v=x.slice(0,-8)+'ировать';
  if(v)canon.set(v,a);
}

const ACTION_LIST=uniq(ACTIONS);
const GLOBAL=uniq([
  ...WORKS,
  ...Object.values(ACTION_WORKS).flatMap(v=>Array.isArray(v)?v:[]),
  ...Object.values(ATTR).flatMap(v=>Array.isArray(v)?v:[]),
  ...COMMON_RUSSIAN,
  ...EXTRA_TERMS
]);
const WORK_CANONICALS=new Map();
for(const w of WORKS)WORK_CANONICALS.set(compact(w),w);
const WORDS=uniq([
  ...GLOBAL.flatMap(x=>compact(x).split(/\s+/)),
  ...ACTION_LIST.flatMap(x=>compact(x).split(/\s+/)),
  ...Object.keys(EXTRA_ALIASES),
  ...COMMON_RUSSIAN,
  ...Object.values(ACTION_ALIASES).flat()
]);
const VALID_SURFACES=new Set([
  ...ACTIONS.map(compact),
  ...WORKS.map(compact),
  ...Object.keys(EXTRA_ALIASES).map(compact),
  ...COMMON_RUSSIAN.map(compact),
  ...EXTRA_TERMS.map(compact)
]);
const CANONICAL_TOKEN_FORMS=uniq([
  ...ACTIONS,
  ...Object.keys(EXTRA_ALIASES),
  ...COMMON_RUSSIAN,
  ...EXTRA_TERMS,
  ...WORKS
]).filter(x=>!/[\s]/.test(String(x)));
/* Fuzzy matching also compares real inflected surfaces (травы/траву/травой),
 * but maps known non-standard aliases back to one preferred display form. */
const FUZZY_FORM_MAP=new Map();
const addFuzzyForm=(surface,output)=>{
  const k=compact(surface);
  if(k&&!/\s/.test(k)&&!FUZZY_FORM_MAP.has(k))FUZZY_FORM_MAP.set(k,output);
};
for(const x of [...ACTIONS,...WORKS,...COMMON_RUSSIAN,...EXTRA_TERMS])addFuzzyForm(x,x);
for(const [canonical,arr] of Object.entries(EXTRA_ALIASES))for(const x of arr){
  const k=compact(x);
  const isKnownSurface=VALID_SURFACES.has(k)||COMMON_RUSSIAN.some(v=>compact(v)===k)||WORKS.some(v=>compact(v)===k);
  addFuzzyForm(x,isKnownSurface?x:canonical);
}
for(const [canonical,arr] of Object.entries(ACTION_ALIASES))for(const x of arr){
  const k=compact(x);
  const isKnownSurface=COMMON_RUSSIAN.some(v=>compact(v)===k)||WORKS.some(v=>compact(v)===k);
  addFuzzyForm(x,isKnownSurface?x:canonical);
}
const FUZZY_TOKEN_FORMS=[...FUZZY_FORM_MAP.entries()];
const ACTION_CANON_CACHE=new Map();
const CANON_TOKEN_CACHE=new Map();

/* Tiny lexical index. The lexical vocabulary is small, so global fuzzy scoring stays practical on phones. */
const TOKEN_SET=new Set(WORDS.map(letters));
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
  const q=compact(input);if(!q)return '';
  const cached=CANON_TOKEN_CACHE.get(q);if(cached!==undefined)return cached;
  if(VALID_SURFACES.has(q)){const v=String(input||'');CANON_TOKEN_CACHE.set(q,v);return v;}
  if(canon.has(q)){const v=canon.get(q);CANON_TOKEN_CACHE.set(q,v);return v;}
  const candidates=FUZZY_TOKEN_FORMS;
  let best='',bestOut='',bs=0;
  for(const [surface,output] of candidates){
    const s=pairScore(q,surface);
    if(s>bs){bs=s;best=surface;bestOut=output;}
  }
  const out=best&&acceptable(bs,q)?bestOut:String(input||'');
  CANON_TOKEN_CACHE.set(q,out);
  if(CANON_TOKEN_CACHE.size>8000){const first=CANON_TOKEN_CACHE.keys().next().value;CANON_TOKEN_CACHE.delete(first);}
  return out;
}

function actionCanon(input){
  const q=compact(input);if(!q||NON_ACTION_WORDS.has(q))return null;
  const cached=ACTION_CANON_CACHE.get(q);if(cached!==undefined)return cached;
  if(VALID_SURFACES.has(q) && !actionCanonMap.has(q) && !ACTION_LIST.some(a=>compact(a)===q)){ACTION_CANON_CACHE.set(q,null);return null;}
  if(actionCanonMap.has(q)){const v=actionCanonMap.get(q);ACTION_CANON_CACHE.set(q,v);return v;}
  const nearCanonical=canonicalToken(q);
  if(nearCanonical && !ACTION_LIST.some(a=>compact(a)===compact(nearCanonical))){ACTION_CANON_CACHE.set(q,null);return null;}
  let best=null,bs=0;
  for(const a of ACTION_LIST){
    const s=pairScore(q,a);
    if(s>bs){bs=s;best=a;}
  }
  const len=letters(q).length;
  const minScore=len<=7?.58:len<=11?.68:.78;
  const out=best&&bs>=minScore?best:null;
  ACTION_CANON_CACHE.set(q,out);
  return out;
}

function rankCandidates(items,q,limit){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  const pool=uniq(items);
  return pool.map((x,i)=>({x,i,s:pairScore(p,x),exact:compact(x)===p,prefix:compact(x).startsWith(p)}))
    .filter(o=>o.exact||o.prefix||acceptable(o.s,p))
    .sort((a,b)=>Number(b.exact)-Number(a.exact)||b.s-a.s||Number(b.prefix)-Number(a.prefix)||a.i-b.i)
    .slice(0,limit)
    .map(o=>o.x);
}
function bestToken(items,q,limit){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  return rankCandidates(items,p,Math.max(limit,12)).slice(0,limit);
}
function bestTokenAnyWord(items,q,limit,priorityItems=[]){
  const p=compact(q);if(!p)return uniq(items).slice(0,limit);
  const priorityList=uniq(priorityItems||[]);
  const prioritySet=new Set(priorityList.map(compact));
  const priorityOrder=new Map(priorityList.map((x,i)=>[compact(x),i]));
  const out=uniq(items).map((item,i)=>{
    const tokens=compact(item).split(/\s+/);
    let best=0;
    for(const token of tokens)best=Math.max(best,pairScore(p,token));
    const phraseBoost=pairScore(p,item);
    const prefix=tokens.some(t=>t.startsWith(p));
    const score=Math.max(best,phraseBoost);
    const priority=prioritySet.has(compact(item));
    const priorityIndex=priorityOrder.has(compact(item))?priorityOrder.get(compact(item)):Number.MAX_SAFE_INTEGER;
    return {item,i,best,phraseBoost,score,prefix,priority,priorityIndex,exact:compact(item)===p};
  }).filter(x=>x.exact||x.prefix||acceptable(x.score,p));
  if(letters(p).length<=2){
    out.sort((a,b)=>Number(b.exact)-Number(a.exact)||Number(b.prefix)-Number(a.prefix)||a.priorityIndex-b.priorityIndex||b.score-a.score||a.i-b.i);
  }else{
    out.sort((a,b)=>Number(b.exact)-Number(a.exact)||b.score-a.score||Number(b.priority)-Number(a.priority)||Number(b.prefix)-Number(a.prefix)||a.i-b.i);
  }
  const ranked=out.slice(0,Math.max(limit,12)).map(x=>x.item);
  return ranked.slice(0,limit);
}

function actionWorks(action){
  const key=compact(action);
  const direct=ACTION_WORKS[key]||ACTION_WORKS[action]||[];
  const rel=related.get(key)||[];
  const attrs=ATTR[key]||ATTR[action]||[];
  const extra=CONTEXT_RELATIONS[key]||[];
  const focused=uniq([...(direct||[]),...rel,...attrs,...extra]);
  return focused.length>=24?focused:uniq([...focused,...WORKS]);
}

function firstWordCandidates(q,limit){
  const p=compact(q);
  if(letters(p).length<=2){
    const pref=ACTION_LIST.filter(x=>compact(x).startsWith(p));
    const workPref=WORKS.filter(x=>compact(x).startsWith(p));
    return uniq([...pref,...workPref,...bestToken([...WORKS,...WORDS],p,limit)]).slice(0,limit);
  }
  const canonical=canonicalToken(q);
  const cs=canonical?pairScore(q,canonical):0;
  if(canonical&&strong(cs,q)){
    const canonicalAction=actionCanonMap.get(compact(canonical));
    const canonicalWork=WORK_CANONICALS.get(compact(canonical));
    if(canonicalAction)return uniq([canonicalAction,...bestToken(ACTION_LIST,q,limit)]).slice(0,limit);
    if(canonicalWork)return uniq([canonicalWork,...bestToken(WORKS,q,limit)]).slice(0,limit);
    return uniq([canonical,...bestToken([...WORKS,...WORDS],q,limit)]).slice(0,limit);
  }
  const action=actionCanon(q);
  if(action)return uniq([action,...bestToken(ACTION_LIST,q,limit)]).slice(0,limit);
  return bestToken([...WORKS,...WORDS],q,limit);
}

function suggest(input,limit=60){
  const raw=String(input??''),trimmed=raw.trim(),trailing=/\s$/.test(raw);
  if(!trimmed)return ACTION_LIST.slice(0,limit);
  const rawTokens=trimmed.split(/\s+/).filter(Boolean);
  const current=trailing?'':(rawTokens.pop()||'');
  const previous=rawTokens;
  const firstCanonical=previous.length?canonicalToken(previous[0]):'';
  const action=previous.length ? (ACTION_LIST.find(a=>compact(a)===compact(firstCanonical))||actionCanon(previous[0])) : null;

  if(!previous.length){
    return firstWordCandidates(current,limit);
  }

  const canonicalAction=action||actionCanon(previous[0]);
  if(canonicalAction){
    const candidates=actionWorks(canonicalAction);
    if(trailing){
      const last=previous[previous.length-1];
      const lastCanon=canonicalToken(last);
      const attrs=ATTR[compact(lastCanon)]||ATTR[compact(last)]||STAGES.характеристика||[];
      const extras=CONTEXT_RELATIONS[compact(lastCanon)]||[];
      return uniq([...attrs,...extras,...(STAGES.дополнение||[]),...candidates]).slice(0,limit);
    }
    return bestTokenAnyWord(candidates,current,limit,candidates);
  }

  const last=previous[previous.length-1];
  const lastCanon=canonicalToken(last);
  const priority=uniq([
    ...(CONTEXT_RELATIONS[compact(lastCanon)]||[]),
    ...(related.get(compact(lastCanon))||[]),
    ...(ATTR[compact(lastCanon)]||[])
  ]);
  const context=uniq([
    ...priority,
    ...WORKS,
    ...WORDS
  ]);
  const result=bestTokenAnyWord(context,current,limit,priority);
  return result.length?result:bestToken(WORDS,current,limit);
}

/* Used when the user taps «Добавить»: repair only words with a strong match.
 * Unknown/custom words are left untouched, so the dictionary never destroys a legitimate name. */
function correctText(input){
  const raw=String(input??'');
  if(!raw.trim())return raw;
  const tokens=raw.trim().split(/\s+/).filter(Boolean);
  if(!tokens.length)return raw;
  const out=[];
  for(let i=0;i<tokens.length;i++){
    const token=tokens[i];
    if(VALID_SURFACES.has(compact(token))){out.push(token);continue;}
    const action=(i===0)?actionCanon(token):null;
    if(action&&strong(pairScore(token,action),token)){
      out.push(action);
      continue;
    }
    const canonical=canonicalToken(token);
    const score=pairScore(token,canonical);
    const sameStem=canonical&&stem(token)===stem(canonical)&&distance(token,canonical)<=2;
    const shortStemSurface=letters(token).length<=4&&sameStem;
    out.push(canonical&&strong(score,token)&&!shortStemSurface?canonical:token);
  }
  const result=out.join(' ');
  return /\s$/.test(raw)?result+' ':result;
}

function correctWord(input){
  const s=String(input??'');
  const c=canonicalToken(s);
  return c&&strong(pairScore(s,c),s)?c:s;
}

window.MG_SMART_DICT={
  suggest,
  canonicalToken,
  actionCanon,
  correctText,
  correctWord,
  normalize:compact,
  similarity:pairScore,
  count:()=>MASTER.length,
  vocabulary:()=>WORDS.length,
  version:'v35-ai-fuzzy-offline'
};
window.mgSmartSuggest=suggest;
})();
