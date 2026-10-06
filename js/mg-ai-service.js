/* Master Group — Autonomous Service Intelligence v2
 *
 * No remote AI/API is required for the service-name assistant.
 * The public API is intentionally unchanged so the current UI continues to
 * show the generated correction ABOVE the service field.
 *
 * Architecture:
 *  1) input normalization: keyboard-layout, transliteration, Romanian/Latin;
 *  2) typo recovery: edit distance + phonetic/skeleton similarity + token repair;
 *  3) semantic grounding: dynamic index built from the Master Group catalog;
 *  4) local generation: compose a professional Russian service name from the
 *     recovered meaning, even when no exact phrase exists in the catalog;
 *  5) confidence/guardrails: never invent prices, quantities, units or facts.
 *
 * Where a browser exposes a native on-device LanguageModel, it may be used as
 * an optional local generative layer. It is never a network fallback.
 */
(function(){
  'use strict';

  const MAX_INPUT=500;
  const MAX_DIRECTION=120;
  const MAX_CONTEXT_ITEMS=12;
  const CACHE=new Map();
  const MAX_CACHE=256;
  let nativeSession=null;
  let nativeState='unknown';
  let nativePromise=null;

  // Real local generative layer. No OpenAI/Firebase/remote inference is used.
  // The model is downloaded once, cached by Transformers.js, and then runs on
  // the user's device (WebGPU when available, otherwise the local fallback).
  const LOCAL_LLM_MODEL='onnx-community/Qwen3-0.6B-ONNX';
  const LOCAL_LLM_CDN='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
  let localLlmPipeline=null;
  let localLlmState='not-loaded';
  let localLlmPromise=null;


  const RU_VOWELS='аеёиоуыэюя';
  const RO_VOWELS='aeiouăâî';
  const escRe=/[&<>"']/g;

  const ACTIONS=[
    {id:'install',ru:'Установка',forms:['установка','установить','поставить','поставь','поставит','устан','устанвка','устанока','instalare','instalarea','instalat','instalati','a instala','a pune','install','installation']},
    {id:'lay',ru:'Укладка',forms:['укладка','уклад','укладк','уложить','уложит','положить','положит','покласть','покласт','faianta','faian','montare faianta','montarea faianta','laminat','parchet','montaj podea','montare podea']},
    {id:'mount',ru:'Монтаж',forms:['монтаж','монта','монтажа','смонтировать','монтировать','montaj','montare','montarea','montat','asamblare']},
    {id:'repair',ru:'Ремонт',forms:['ремонт','ремонтировать','ремонтир','починить','починка','ремнт','рмонт','поиск','устранение','устранить','ликвидация','найти протечку','reparare','repararea','reparat','a repara']},
    {id:'dismantle',ru:'Демонтаж',forms:['демонтаж','демонтировать','демонт','снять','снима','снос','разборка','разобрать','demontare','demontarea','demontat','a demonta']},
    {id:'replace',ru:'Замена',forms:['замена','заменить','замен','поменять','поменя','смена','schimbare','schimbarea','schimbat','inlocuire','înlocuire','a schimba','a inlocui']},
    {id:'paint',ru:'Покраска',forms:['покраска','покрасить','покрас','окраска','малярка','красить','vopsire','vopsirea','vopsit','a vopsi']},
    {id:'putty',ru:'Шпаклевка',forms:['шпаклевка','шпаклевать','шпаклев','шпатлевка','gletuire','glet','gletui','a gletui']},
    {id:'prime',ru:'Грунтовка',forms:['грунтовка','грунтовать','грунтов','grunduire','grund','a grundui']},
    {id:'route',ru:'Прокладка',forms:['прокладка','проложить','провести','проведение','проклдка','проклад','pozare','pozarea','pozat','a poza','trasare']},
    {id:'connect',ru:'Подключение',forms:['подключение','подключить','подсоединение','подсоединить','conectare','conectarea','conectat','a conecta']},
    {id:'configure',ru:'Настройка',forms:['настройка','настроить','наладка','конфигурация','configurare','configurarea','setare','a configura']},
    {id:'weld',ru:'Сварка',forms:['сварка','сварить','сварочные','сварочн','свароч','sudare','sudura','sudat','a suda']},
    {id:'fabricate',ru:'Изготовление',forms:['изготовление','изготовить','сделать','производство','fabricare','fabricarea','fabricat','a fabrica']},
    {id:'cut',ru:'Срез',forms:['срез','срезать','обрезка','спил','спилить','обрезать','taiere','taierea','taiat','a taia','tăiere']},
    {id:'remove',ru:'Удаление',forms:['удаление','удалить','убрать','убери','выкорчевать','снять','избавиться','eliminare','eliminarea','eliminat','scoatere','scoaterea','a elimina','a scoate']},
    {id:'mow',ru:'Покос',forms:['покос','косить','скосить','покаш','сокос','покас','cosire','cosirea','cosit','a cosi','taiere iarba']},
    {id:'haul',ru:'Вывоз',forms:['вывоз','вывезти','перевезти','вывез','транспорт','evacuare','evacuarea','transportare','a evacua','a transporta']},
    {id:'load',ru:'Погрузка',forms:['погрузка','погрузить','загрузить','загрузка','incarcare','incarcarea','a incarca']},
    {id:'clean',ru:'Очистка',forms:['очистка','очистить','чистка','уборка','curatare','curatarea','curatat','a curata']},
    {id:'sand',ru:'Шлифовка',forms:['шлифовка','шлифовать','шлифов','ошкуривание','slefuire','slefuirea','slefuit','a slefui']},
    {id:'insulate',ru:'Утепление',forms:['утепление','утеплить','утепл','теплоизоляция','izolare','izolarea','izolat','a izola']}
  ];

  const OBJECTS=[
    {id:'tile',base:'плитка',cases:'плитки',forms:['плитка','плитки','плитк','плит','кафель','кафел','кафла','фаянс','faianță','faianta','faiant','fai','kafel','kafla','plitka','plitc']},
    {id:'laminate',base:'ламинат',cases:'ламината',forms:['ламинат','ламината','ламин','laminat','lamin']},
    {id:'parquet',base:'паркет',cases:'паркета',forms:['паркет','parcheta','parchet','parche']},
    {id:'wallpaper',base:'обои',cases:'обоев',forms:['обои','обоев','обоя','tapet','tapetul']},
    {id:'pipes',base:'трубы',cases:'труб',forms:['труба','трубы','труб','трубa','truba','trube','teava','teavă','tevi','ţevi','tev','teev','tevi apa']},
    {id:'cable',base:'кабель',cases:'кабеля',forms:['кабель','кабеля','кабел','cablul','cablu','cabl','cable']},
    {id:'plumbing',base:'сантехника',cases:'сантехники',forms:['сантехника','сантех','сантехнич','сантеx','sanitare','sanitara','instalatie sanitara','instalatii sanitare']},
    {id:'sink',base:'раковина',cases:'раковины',forms:['раковина','раковн','умывальник','chiuveta','chiuvet','chiuvn','chiuvete']},
    {id:'toilet',base:'унитаз',cases:'унитаза',forms:['унитаз','унитаза','туалет','toaleta','toilet','wc','wc-ul']},
    {id:'faucet',base:'смеситель',cases:'смесителя',forms:['смеситель','смесит','кран','robinet','robinetul']},
    {id:'camera',base:'камера видеонаблюдения',cases:'камеры видеонаблюдения',forms:['камера','камеры','видеокамера','видеонаблюдение','supraveghere','camera','camere','camera video']},
    {id:'recorder',base:'видеорегистратор',cases:'видеорегистратора',forms:['регистратор','видеорегистратор','dvr','nvr','inregistrator','inregistrator video']},
    {id:'socket',base:'розетка',cases:'розетки',forms:['розетка','розетки','розетк','priza','prize','priză']},
    {id:'switch',base:'выключатель',cases:'выключателя',forms:['выключатель','выключатели','выключ','переключатель','intrerupator','intrerupatoare']},
    {id:'door',base:'дверь',cases:'двери',forms:['дверь','двери','двер','дверей','usa','usi','ușă','uși']},
    {id:'window',base:'окно',cases:'окна',forms:['окно','окна','окон','geam','geamuri','fereastra','ferestre']},
    {id:'metal',base:'металлоконструкция',cases:'металлоконструкции',forms:['металл','металлоконструкции','металлоконструкция','конструкция','metal','constructie metalica','constructii metalice']},
    {id:'fence',base:'забор',cases:'забора',forms:['забор','забору','забора','ограждение','gard','gardul']},
    {id:'gate',base:'ворота',cases:'ворот',forms:['ворота','ворот','poarta','porti','porți']},
    {id:'tree',base:'дерево',cases:'деревьев',forms:['дерево','деревья','деревьев','дерев','копaк','copac','copaci','copacul','copacilor']},
    {id:'branch',base:'ветка',cases:'веток',forms:['ветка','ветки','веток','ветв','craca','crengi','creanga']},
    {id:'root',base:'корень',cases:'корней',forms:['корень','корни','корней','корен','radacina','radacini','radacinilor','rădăcină']},
    {id:'grass',base:'трава',cases:'травы',forms:['трава','травы','траву','газон','iarba','iarbă','gazon','gazonului']},
    {id:'site',base:'участок',cases:'участка',forms:['участок','участка','участке','территория','двор','teren','terenul','curte','curtea','teritoriu']},
    {id:'roof',base:'крыша',cases:'крыши',forms:['крыша','крыши','кровля','acoperis','acoperiş','acoperisului']},
    {id:'wall',base:'стена',cases:'стен',forms:['стена','стены','стен','perete','pereti','peretele','pereți']},
    {id:'ceiling',base:'потолок',cases:'потолка',forms:['потолок','потолка','потолоч','tavan','tavanul']},
    {id:'floor',base:'пол',cases:'пола',forms:['пол','пола','podea','podelei']},
    {id:'facade',base:'фасад',cases:'фасада',forms:['фасад','фасада','fatada','fatadei']},
    {id:'concrete',base:'бетон',cases:'бетона',forms:['бетон','бетона','beton','betonului']},
    {id:'garbage',base:'мусор',cases:'мусора',forms:['мусор','мусора','отходы','gunoi','gunoiului','deseuri','deseurilor']},
    {id:'equipment',base:'оборудование',cases:'оборудования',forms:['оборудование','оборудован','echipament','echipamente']},
    {id:'heating',base:'система отопления',cases:'системы отопления',forms:['отопление','радиатор','батарея','incalzire','calorifer']},
    {id:'sewer',base:'канализация',cases:'канализации',forms:['канализация','канализ','canalizare','canalizarea']},
    {id:'aircon',base:'кондиционер',cases:'кондиционера',forms:['кондиционер','кондер','aer conditionat','conditioner']},
    {id:'insulation',base:'утепление',cases:'утепления',forms:['утепление','изоляция','izolatie','izolație']},
    {id:'constructionWaste',base:'строительный мусор',cases:'строительного мусора',forms:['строительный мусор','строймусор','construction waste','deseuri constructie','deseuri de constructie']},
    {id:'power',base:'блок питания',cases:'блока питания',forms:['блок питания','блок питан','питание','alimentator','sursa de alimentare']},
    {id:'leak',base:'протечка',cases:'протечки',forms:['протечка','протеч','течь','течет','scurgere','scurgerea','pierdere apa']},
    {id:'washing',base:'стиральная машина',cases:'стиральной машины',forms:['стиралка','стиральная машина','стиральн','masina de spalat','masina spalat']}
  ];

  const LOCATIONS=[
    {ru:'в ванной комнате',forms:['ванна','ванной','ванная','ваному','bathroom','baie','baii']},
    {ru:'на кухне',forms:['кухня','кухне','кухн','bucatarie','bucatariei']},
    {ru:'в квартире',forms:['квартира','квартире','apartament','apartamentul']},
    {ru:'в доме',forms:['дом','доме','дому','casa','casei']},
    {ru:'на участке',forms:['участок','участка','участке','teren','terenul']},
    {ru:'во дворе',forms:['двор','дворе','curte','curtea']},
    {ru:'в помещении',forms:['помещение','помещении','incapere','încăpere']},
    {ru:'на фасаде',forms:['фасад','фасаде','fatada','fatadei']},
    {ru:'на крыше',forms:['крыша','крыше','кровля','acoperis','acoperisului']},
    {ru:'на стене',forms:['стена','стене','стен','perete','pereti','peretele']},
    {ru:'на потолке',forms:['потолок','потолке','tavan','tavanul']},
    {ru:'в подвале',forms:['подвал','подвале','subsol','subsolul']}
  ];

  const DETERMINERS=[
    {ru:'старой',forms:['старый','старая','старое','старую','vechi','veche','vechiul']},
    {ru:'новой',forms:['новый','новая','новое','новую','nou','noua','nouă']},
    {ru:'аварийной',forms:['аварийный','аварийная','срочный','urgent','de urgenta']},
    {ru:'наружной',forms:['наружный','наружная','наружное','exterior','exterioara']},
    {ru:'внутренней',forms:['внутренний','внутренняя','interior','interioara']},
    {ru:'ручной',forms:['ручной','ручная','manual','manuala']}
  ];

  const ACTION_HINTS={
    install:['установка'],lay:['укладка'],mount:['монтаж'],repair:['ремонт'],dismantle:['демонтаж'],replace:['замена'],paint:['покраска'],putty:['шпаклевка'],prime:['грунтовка'],route:['прокладка'],connect:['подключение'],configure:['настройка'],weld:['сварка'],fabricate:['изготовление'],cut:['срез'],remove:['удаление'],mow:['покос'],haul:['вывоз'],load:['погрузка'],clean:['очистка'],sand:['шлифовка'],insulate:['утепление']
  };

  function clean(v,max=MAX_INPUT){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max);}
  function norm(v){return clean(v).toLowerCase().replace(/[ё]/g,'е').replace(/[ă]/g,'a').replace(/[â]/g,'a').replace(/[î]/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t');}
  function uniq(a){return [...new Set((a||[]).map(x=>clean(x,180)).filter(Boolean))];}
  function capital(v){const s=clean(v,240);return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
  function stripPunct(v){return clean(v,500).replace(/["“”'`‘’]/g,'').replace(/[!?;]+/g,' ').replace(/\s+/g,' ').trim();}
  function esc(v){return String(v??'').replace(escRe,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  const RU_LATIN={
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:'',
    а2:'a'
  };
  const LAT_RU={
    a:'а',b:'б',v:'в',g:'г',d:'д',e:'е',z:'з',i:'и',j:'й',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',r:'р',s:'с',t:'т',u:'у',f:'ф',h:'х',c:'ц',y:'ы'
  };
  function translitToRussian(s){
    let x=norm(s);
    const multi=[['shch','щ'],['sch','щ'],['zh','ж'],['kh','х'],['ts','ц'],['ch','ч'],['sh','ш'],['yo','ё'],['yu','ю'],['ya','я']];
    for(const [a,b] of multi)x=x.split(a).join(b);
    let out='';for(const c of x)out+=LAT_RU[c]||c;return out;
  }
  function russianToLatin(s){let out='';for(const c of norm(s))out+=RU_LATIN[c]??c;return out;}

  // Russian/US keyboard layout recovery. Supports both directions so a user
  // can paste text typed in the wrong keyboard layout.
  const RU_KEYS='йцукенгшщзхъфывапролджэячсмитьбю.';
  const EN_KEYS="qwertyuiop[]asdfghjkl;'zxcvbnm,./";
  const ruToEn={};const enToRu={};
  for(let i=0;i<Math.min(RU_KEYS.length,EN_KEYS.length);i++){ruToEn[RU_KEYS[i]]=EN_KEYS[i];enToRu[EN_KEYS[i]]=RU_KEYS[i];}
  function flipKeyboard(s,map){let out='';for(const c of norm(s))out+=map[c]||c;return out;}

  function skeleton(s){
    return norm(s).replace(/[^a-zа-я0-9]/gi,'').replace(/[аеёиоуыэюяaeiouy]/g,'a').replace(/(.)\1+/g,'$1');
  }
  function consonantSkeleton(s){return norm(s).replace(/[^a-zа-я]/gi,'').replace(/[аеёиоуыэюяaeiouy]/g,'').replace(/(.)\1+/g,'$1');}
  function bigrams(s){const x='^'+norm(s)+'$';const r=[];for(let i=0;i<x.length-1;i++)r.push(x.slice(i,i+2));return r;}
  function dice(a,b){
    const A=bigrams(a),B=bigrams(b);if(!A.length&&!B.length)return 1;if(!A.length||!B.length)return 0;
    const m=new Map(B.map((x,i)=>[x,i]));let hits=0;const used=new Set();for(const x of A){const i=m.get(x);if(i!=null&&!used.has(i)){used.add(i);hits++;}}
    return (2*hits)/(A.length+B.length);
  }
  function levenshtein(a,b){
    a=norm(a);b=norm(b);if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
    if(a.length>b.length){const t=a;a=b;b=t;}
    const prev=new Array(a.length+1);for(let i=0;i<prev.length;i++)prev[i]=i;
    for(let j=1;j<=b.length;j++){
      const cur=[j];
      for(let i=1;i<=a.length;i++)cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));
      for(let i=0;i<cur.length;i++)prev[i]=cur[i];
    }
    return prev[a.length];
  }
  function similarity(a,b){
    a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;
    const max=Math.max(a.length,b.length);let ed=1-levenshtein(a,b)/max;
    const di=dice(a,b);
    const sk=skeleton(a)===skeleton(b)?1:1-levenshtein(skeleton(a),skeleton(b))/Math.max(skeleton(a).length,skeleton(b).length,1);
    const cs=consonantSkeleton(a)===consonantSkeleton(b)?1:1-levenshtein(consonantSkeleton(a),consonantSkeleton(b))/Math.max(consonantSkeleton(a).length,consonantSkeleton(b).length,1);
    const contains=(a.includes(b)||b.includes(a))?Math.min(a.length,b.length)/Math.max(a.length,b.length):0;
    return Math.max(0,Math.min(1,.43*ed+.25*di+.18*sk+.09*cs+.05*contains));
  }

  function variants(text){
    const raw=stripPunct(text);const n=norm(raw);const out=new Set([n]);
    const tr=translitToRussian(n);if(tr&&tr!==n)out.add(tr);
    const rt=russianToLatin(n);if(rt&&rt!==n)out.add(rt);
    const e=flipKeyboard(n,ruToEn),r=flipKeyboard(n,enToRu);if(e!==n)out.add(e);if(r!==n)out.add(r);
    // If text has no spaces, keep both compact and coarse word guesses.
    out.add(n.replace(/\s+/g,''));
    if(tr)out.add(tr.replace(/\s+/g,''));
    return [...out].filter(Boolean);
  }

  function tokenise(text){return norm(stripPunct(text)).split(/[^a-zа-я0-9]+/i).filter(Boolean);}

  function bestForm(token,forms){
    let best={text:'',score:0};
    for(const f of forms){
      const score=Math.max(...variants(token).map(v=>similarity(v,f)));
      if(score>best.score)best={text:f,score};
    }
    return best;
  }

  function bestConcepts(text,list,threshold=.43){
    const toks=tokenise(text);const all=[];
    for(const item of list){
      let best=0,bestFormText='';
      for(const tok of toks){
        const b=bestForm(tok,item.forms);
        // Very short tokens are too ambiguous for an AI-style service name.
        const effective=(tok.length<=2?Math.min(b.score,.58):b.score);
        if(effective>best){best=effective;bestFormText=b.text;}
      }
      if(best>=threshold)all.push({...item,score:best,matched:bestFormText});
    }
    return all.sort((a,b)=>b.score-a.score);
  }

  function detectLocation(text){
    const toks=tokenise(text);const out=[];
    for(const loc of LOCATIONS){let best=0;
      // Location detection must be conservative: fuzzy matching the whole
      // sentence can turn an unrelated typo into a fake location. Require a
      // strong token/phrase hit instead.
      for(const f of loc.forms){
        for(const t of toks)best=Math.max(best,similarity(t,f));
        for(const v of variants(text)){
          const st=tokenise(v).filter(Boolean);
          if(st.length<=3)best=Math.max(best,similarity(v,f));
        }
      }
      if(best>=.72)out.push({...loc,score:best});
    }
    return out.sort((a,b)=>b.score-a.score);
  }

  function detectDeterminer(text){
    const toks=tokenise(text);const out=[];
    for(const d of DETERMINERS){let best=0;for(const f of d.forms)for(const t of toks)best=Math.max(best,similarity(t,f));if(best>=.78)out.push({...d,score:best});}
    return out.sort((a,b)=>b.score-a.score);
  }

  function numbers(text){
    const m=stripPunct(text).match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s*(м2|м²|m2|m²|кв|метр|метров|метра|шт|штук|кг|час|ч|рейс|сотк[аи]|га|гектар))?/i);
    return m?{value:m[1].replace(',','.'),unit:m[2]||''}:null;
  }

  // Dynamic catalog indexing means newly created Master Group services are
  // learned automatically; there is no need to modify this AI file.
  function catalogRows(){
    const catalog=Array.isArray(window.MGCatalog?.data)?window.MGCatalog.data:[];const rows=[];
    for(const d of catalog){
      if(!d)continue;
      for(const s of Array.isArray(d.services)?d.services:[]){
        const name=clean(s?.name,180);if(name)rows.push({name,direction:clean(d.name,120),unit:clean(s.unit||'шт',40)||'шт'});
      }
    }
    return rows;
  }

  function semanticCatalogCandidates(text,direction,selectedServices){
    const rows=catalogRows();const ntext=norm(text);const context=uniq([direction,...selectedServices]).join(' ');const scored=[];
    for(const row of rows){
      let score=Math.max(...variants(text).map(v=>similarity(v,row.name)));
      const inputT=tokenise(text),rowT=tokenise(row.name);
      if(inputT.length&&rowT.length){
        let matched=0;for(const t of inputT){let b=0;for(const r of rowT)b=Math.max(b,similarity(t,r));if(b>=.5)matched+=b;}
        score=.72*score+.28*(matched/inputT.length);
      }
      if(direction && norm(row.direction)===norm(direction))score+=.08;
      if(selectedServices?.some(s=>similarity(s,row.name)>.72))score+=.04;
      if(ntext===norm(row.name))score=1;
      if(score>.36)scored.push({...row,score:Math.min(1,score)});
    }
    return scored.sort((a,b)=>b.score-a.score).slice(0,7);
  }

  function inferAction(text,catalogCandidates){
    const n=norm(text);
    if(/(?:montare|montarea|montat)\s+(?:faianta|faian|faiant)/i.test(n))return {...ACTIONS.find(x=>x.id==='lay'),score:.96};
    if(/(?:уклд|уклад|полож|покла).*(?:плит|каф)/i.test(n))return {...ACTIONS.find(x=>x.id==='lay'),score:.96};
    if(/(?:протеч|течет|scurgere|pierdere\s+apa|устранить|устранение|поиск)/i.test(n))return {...ACTIONS.find(x=>x.id==='repair'),score:.9};
    if(/(?:вывоз|вывез|evacuare|transportare)/i.test(n))return {...ACTIONS.find(x=>x.id==='haul'),score:.92};
    if(/(?:покос|косить|iarba|cosire)/i.test(n))return {...ACTIONS.find(x=>x.id==='mow'),score:.9};
    const direct=bestConcepts(text,ACTIONS,.62);
    if(direct.length && direct[0].score>=.66)return direct[0];
    for(const row of catalogCandidates){if(row.score<.78)continue;const a=bestConcepts(row.name,ACTIONS,.66)[0];if(a)return {...a,score:Math.min(.96,row.score+.05)};}
    return null;
  }

  function inferObject(text,catalogCandidates){
    const n=norm(text);
    if(/(?:deseuri|строймусор|строй\s*мусор|строительн(?:ый|ого)?\s+мусор|construction\s+waste)/i.test(n))return {...OBJECTS.find(x=>x.id==='constructionWaste'),score:.9};
    if(/(?:протеч|течет|scurgere|pierdere\s+apa)/i.test(n))return {...OBJECTS.find(x=>x.id==='leak'),score:.92};
    const direct=bestConcepts(text,OBJECTS,.62);
    if(direct.length && direct[0].score>=.68)return direct[0];
    for(const row of catalogCandidates){if(row.score<.78)continue;const o=bestConcepts(row.name,OBJECTS,.66)[0];if(o)return {...o,score:Math.min(.96,row.score)};}
    return null;
  }

  const neutralObjectAction={
    tile:'Укладка',laminate:'Укладка',parquet:'Укладка',wallpaper:'Поклейка',pipes:'Монтаж',cable:'Прокладка',plumbing:'Установка',sink:'Установка',toilet:'Установка',faucet:'Установка',camera:'Установка',recorder:'Настройка',socket:'Установка',switch:'Установка',door:'Установка',window:'Установка',metal:'Монтаж',fence:'Монтаж',gate:'Монтаж',tree:'Срез',branch:'Срез',root:'Удаление',grass:'Покос',site:'Очистка',roof:'Ремонт',wall:'Ремонт',ceiling:'Ремонт',floor:'Ремонт',facade:'Утепление',concrete:'Шлифовка',garbage:'Вывоз',equipment:'Настройка',heating:'Ремонт',sewer:'Монтаж',aircon:'Установка',insulation:'Утепление',constructionWaste:'Вывоз',power:'Монтаж',leak:'Поиск и устранение',washing:'Подключение'
  };

  function inflectPhrase(action,object){
    if(!action||!object)return '';
    const id=object.id;
    const fixed={
      tile:{install:'Установка плитки',lay:'Укладка плитки',mount:'Монтаж плитки',dismantle:'Демонтаж плитки',remove:'Удаление плитки'},
      laminate:{lay:'Укладка ламината',dismantle:'Демонтаж ламината'},
      parquet:{lay:'Укладка паркета'},
      wallpaper:{lay:'Поклейка обоев',dismantle:'Демонтаж обоев'},
      pipes:{mount:'Монтаж труб',route:'Прокладка труб',replace:'Замена труб',dismantle:'Демонтаж труб',repair:'Ремонт труб'},
      cable:{route:'Прокладка кабеля',install:'Установка кабеля',replace:'Замена кабеля'},
      plumbing:{install:'Установка сантехники',dismantle:'Демонтаж сантехники',repair:'Ремонт сантехники'},
      sink:{install:'Установка раковины',dismantle:'Демонтаж раковины',replace:'Замена раковины'},
      toilet:{install:'Установка унитаза',dismantle:'Демонтаж унитаза',replace:'Замена унитаза'},
      faucet:{install:'Установка смесителя',replace:'Замена смесителя'},
      camera:{install:'Установка камеры видеонаблюдения',replace:'Замена камеры видеонаблюдения'},
      recorder:{configure:'Настройка видеорегистратора',install:'Установка видеорегистратора'},
      socket:{install:'Установка розетки',replace:'Замена розетки'},
      switch:{install:'Установка выключателя',replace:'Замена выключателя'},
      door:{install:'Установка двери',dismantle:'Демонтаж двери',replace:'Замена двери'},
      window:{install:'Установка окна',dismantle:'Демонтаж окна',replace:'Замена окна'},
      metal:{fabricate:'Изготовление металлоконструкции',mount:'Монтаж металлоконструкции',weld:'Сварка металлоконструкций',paint:'Покраска металла'},
      fence:{mount:'Монтаж забора',weld:'Сварка забора',paint:'Покраска забора',repair:'Ремонт забора'},
      gate:{mount:'Монтаж ворот',weld:'Сварка ворот',repair:'Ремонт ворот'},
      tree:{cut:'Срез деревьев',remove:'Удаление деревьев'},
      branch:{cut:'Срез веток',remove:'Удаление веток'},
      root:{remove:'Удаление корней'},
      grass:{mow:'Покос травы'},
      site:{clean:'Очистка участка'},
      roof:{repair:'Ремонт крыши',mount:'Монтаж крыши',insulate:'Утепление крыши'},
      wall:{paint:'Покраска стен',putty:'Шпаклевка стен',prime:'Грунтовка стен',sand:'Шлифовка стен',insulate:'Утепление стен',repair:'Ремонт стен'},
      ceiling:{paint:'Покраска потолка',putty:'Шпаклевка потолка',prime:'Грунтовка потолка',sand:'Шлифовка потолка',repair:'Ремонт потолка'},
      floor:{lay:'Укладка пола',repair:'Ремонт пола',sand:'Шлифовка пола'},
      facade:{paint:'Покраска фасада',insulate:'Утепление фасада',repair:'Ремонт фасада'},
      concrete:{sand:'Шлифовка бетона',repair:'Ремонт бетона',paint:'Покраска бетона'},
      garbage:{haul:'Вывоз мусора',load:'Погрузка мусора',clean:'Очистка от мусора',remove:'Удаление мусора'},
      equipment:{configure:'Настройка оборудования',install:'Установка оборудования',repair:'Ремонт оборудования'},
      heating:{repair:'Ремонт системы отопления',install:'Установка системы отопления'},
      sewer:{mount:'Монтаж канализации',route:'Прокладка канализации',repair:'Ремонт канализации'},
      aircon:{install:'Установка кондиционера',configure:'Настройка кондиционера',repair:'Ремонт кондиционера'},
      insulation:{insulate:'Утепление',remove:'Удаление утепления'},
      constructionWaste:{haul:'Вывоз строительного мусора',load:'Погрузка строительного мусора',remove:'Удаление строительного мусора'},
      power:{install:'Установка блока питания',replace:'Замена блока питания',mount:'Монтаж блока питания'},
      leak:{repair:'Поиск и устранение протечки'},
      washing:{install:'Установка стиральной машины',connect:'Подключение стиральной машины',repair:'Ремонт стиральной машины'}
    };
    if(fixed[id]?.[action.id])return fixed[id][action.id];
    return `${action.ru} ${object.cases||object.base}`;
  }



  // Open-vocabulary action recovery. This layer is deliberately independent
  // of the catalog: it can turn an unseen/garbled action stem into a normal
  // Russian service noun instead of requiring an exact dictionary entry.
  const OPEN_ACTIONS=[
    {ru:'Крепление',forms:['крепление','крепл','креп','крепить','прикрепить','закрепить','крепеж','крепёж','fixare','fixarea','prindere','prinderea','a fixa','a prinde','kreplenie','krepl']},
    {ru:'Фиксация',forms:['фиксация','фиксац','фиксировать','зафиксировать','fixare','fixarea','fixat']},
    {ru:'Сверление',forms:['сверление','сверл','сверлить','просверлить','сверловка','gaurire','gaurirea','a gauri','forare','forarea','burlu']},
    {ru:'Герметизация',forms:['герметизация','герметиз','герметизировать','герметик','etansare','etanșare','etansat','sigilare','sigilarea']},
    {ru:'Диагностика',forms:['диагностика','диагност','диагностировать','проверка','проверить','diagnosticare','diagnosticarea','verificare','verificarea','a verifica']},
    {ru:'Обслуживание',forms:['обслуживание','обслуж','обслужить','обслуга','servisare','servisarea','intretinere','întreținere','mentenanta','mentenanță']},
    {ru:'Регулировка',forms:['регулировка','регулир','регулировать','отрегулировать','reglare','reglarea','ajustare','ajustarea']},
    {ru:'Демонтаж',forms:['разборка','разобрать','разбор','demontează','demontare']},
    {ru:'Сборка',forms:['сборка','собрать','сбор','asamblare','asamblarea']},
    {ru:'Разработка',forms:['разработка','разраб','разработать','создание','создать','elaborare','elaborarea','creare','crearea']},
    {ru:'Очистка',forms:['очистка','очист','очистить','чистка','curatare','curățare','curatarea','a curata']},
    {ru:'Бурение',forms:['бурение','бурить','бурен','foraj','forarea','forare']},
    {ru:'Штукатурка',forms:['штукатурка','штукатур','штукатурить','tencuire','tencuiala','a tencui']},
    {ru:'Гидроизоляция',forms:['гидроизоляция','гидроизоляц','hidroizolatie','hidroizolație','hidroizolarea']},
    {ru:'Звукоизоляция',forms:['звукоизоляция','звукоизоляц','izolare fonica','izolare fonică']},
    {ru:'Монтаж',forms:['собрать и установить']}
  ];

  const RU_ACTION_WORDS = new Set([
    'установка','укладка','монтаж','ремонт','демонтаж','замена','покраска','шпаклевка','грунтовка',
    'прокладка','подключение','настройка','сварка','изготовление','срез','удаление','покос','вывоз',
    'погрузка','очистка','шлифовка','утепление','крепление','фиксация','сверление','герметизация',
    'диагностика','обслуживание','регулировка','сборка','разработка','бурение','штукатурка',
    'гидроизоляция','звукоизоляция'
  ]);

  function bestOpenAction(text){
    const toks=tokenise(text);let best=null;
    for(const tok of toks){
      const direct=genericActionFromToken(tok);
      if(direct && (!best||direct.score>best.score))best={...direct,matched:tok};
    }
    if(best)return best;
    for(const a of OPEN_ACTIONS){
      let score=0,matched='';
      for(const tok of toks){const b=bestForm(tok,a.forms);if(b.score>score){score=b.score;matched=b.text;}}
      if(score>=.72 && (!best||score>best.score))best={...a,score,matched};
    }
    return best;
  }

  function genericActionFromToken(token){
    const n=norm(token);if(!n)return null;
    // High-signal stem rules come first so a short unknown fragment such as
    // "крепл" cannot be stolen by an unrelated fuzzy dictionary match.
    const rules=[
      [/^(?:при)?крепл/i,'Крепление'],[/^фикс/i,'Фиксация'],[/^герметиз/i,'Герметизация'],[/^диагност/i,'Диагностика'],[/^обслуж/i,'Обслуживание'],
      [/^регулир/i,'Регулировка'],[/^сверл/i,'Сверление'],[/^бур/i,'Бурение'],[/^штукатур/i,'Штукатурка'],[/^гидроизоляц/i,'Гидроизоляция'],
      [/^звукоизоляц/i,'Звукоизоляция'],[/^монта/i,'Монтаж'],[/^устан/i,'Установка'],[/^ремонт/i,'Ремонт'],[/^демонт/i,'Демонтаж'],
      [/^замен/i,'Замена'],[/^покрас|^окрас/i,'Покраска'],[/^шпаклев|^шпатлев/i,'Шпаклевка'],[/^грунт/i,'Грунтовка'],[/^проклад|^пролож/i,'Прокладка'],
      [/^подключ/i,'Подключение'],[/^настр|^налад/i,'Настройка'],[/^свар/i,'Сварка'],[/^изготов/i,'Изготовление'],[/^срез|^спил/i,'Срез'],
      [/^удал|^убер/i,'Удаление'],[/^покос|^кос/i,'Покос'],[/^вывоз|^вывез/i,'Вывоз'],[/^погруз|^загруз/i,'Погрузка'],[/^очист|^чист/i,'Очистка'],
      [/^шлиф|^ошкур/i,'Шлифовка'],[/^утепл/i,'Утепление'],[/^собр/i,'Сборка'],[/^разбор/i,'Разборка'],[/^созд/i,'Создание'],[/^разраб/i,'Разработка']
    ];
    for(const [re,ru] of rules)if(re.test(n))return {ru,score:.94,id:'open-'+norm(ru)};
    const exact=bestForm(n,OPEN_ACTIONS.flatMap(a=>a.forms));
    if(exact.score>=.78){
      const a=OPEN_ACTIONS.find(x=>x.forms.some(f=>norm(f)===norm(exact.text))); if(a)return {...a,score:exact.score};
    }
    return null;
  }

  function looksLikeAction(t){
    const n=norm(t);if(!n)return false;
    if(RU_ACTION_WORDS.has(n))return true;
    const a=genericActionFromToken(n);return !!a;
  }

  function translateLooseLatinWord(word){
    const n=norm(word);
    const known={
      motor:'мотор',motora:'мотора',motorul:'мотор',motore:'мотор',motorele:'моторы',masina:'машина',masinae:'машины',masinii:'машины',generator:'генератор',generatorul:'генератора',
      pompa:'насос',pompei:'насоса',pompa:'насос',suport:'крепление',suportul:'крепления',suportare:'опора',prindere:'крепление',fixare:'фиксация',
      surub:'винт',suruburi:'винты',piulita:'гайка',piulite:'гайки',cutie:'коробка',cutia:'коробки',motorina:'дизель',benzina:'бензин',
      lemn:'дерево',metal:'металл',fier:'железо',otel:'сталь',aluminiu:'алюминий',cauciuc:'резина',sticla:'стекло',usa:'дверь',usi:'двери',
      geam:'окно',geamuri:'окна',perete:'стена',pereti:'стены',podea:'пол',tavan:'потолок',acoperis:'крыша',gard:'забор',poarta:'ворота',
      roata:'колесо',roti:'колёса',frana:'тормоз',frane:'тормоза',ulei:'масло',filtru:'фильтр',baterie:'аккумулятор',baterii:'аккумуляторы',
      cablu:'кабель',cabluul:'кабеля',teava:'труба',tevi:'трубы',apa:'вода',pompaapa:'водяной насос','motor electric':'электродвигатель',kreplenie:'крепление',krepl:'крепление',fixarea:'фиксация',fixare:'фиксация',prindere:'крепление',
      acoperisului:'крыши',peretele:'стены',tavanul:'потолка'
    };
    return known[n]||null;
  }

  function normalizeLooseInput(text){
    const s=stripPunct(text);
    const rawTokens=tokenise(s);const mapped=[];let knownCount=0;
    for(const t of rawTokens){
      const m=translateLooseLatinWord(t);
      if(m){mapped.push(m);knownCount++;}else mapped.push(t);
    }
    // Only run phonetic Russian transliteration when the input looks like
    // transliterated Russian. Do not turn ordinary Romanian/Latin into garbage
    // Cyrillic such as "fixare" -> "фихагу".
    const joined=rawTokens.join(' ');
    const hasTranslitDigraph=/(?:shch|sch|zh|kh|ts|ch|sh|yo|yu|ya)/i.test(joined);
    const likelyRomanian=/\b(?:si|sau|pentru|cu|din|de|la|in|este|trebuie|montare|fixare|prindere|schimbare|instalare|demontare|teava|faianta|baie|curatare|cosire|taiere)\b/i.test(joined);
    const tv=translitToRussian(s);
    const letters=(joined.match(/[a-z]/gi)||[]).length;
    const mostlyLatin=letters>=Math.max(3,joined.replace(/\s/g,'').length*.65);
    if(mostlyLatin && !likelyRomanian && (hasTranslitDigraph || knownCount===0) && /^[\u0000-\u007f ]+$/.test(joined)){
      const converted=tv;
      if(/^[а-яё0-9\s-]+$/i.test(converted) && converted.length>=Math.max(3,s.length*.45)) return converted;
    }
    return mapped.join(' ');
  }

  function normalizeUnknownNoun(word){
    const w=clean(word,120);if(!w)return w;
    const known={дырк:'дырка',двер:'дверь',окн:'окно',стен:'стена',потол:'потолок',труб:'труба',кабел:'кабель',раковн:'раковина',мотор:'мотор',генератор:'генератор',двигател:'двигатель',насос:'насос',филтр:'фильтр',моторн:'мотор',сантех:'сантехника'};
    return known[norm(w)]||w;
  }

  function toGenitiveLoose(word){
    const w=normalizeUnknownNoun(clean(word,120));if(!w||/\d/.test(w))return w;
    if(/(?:ов|ев|ин|ын|ец|ец)$/i.test(w))return w+'а';
    if(/ь$/i.test(w))return w.slice(0,-1)+'я';
    if(/й$/i.test(w))return w.slice(0,-1)+'я';
    if(/(?:ка|га|ха|жа|ча|ша)$/i.test(w))return w.slice(0,-1)+'и';
    if(/[ая]$/i.test(w))return w.slice(0,-1)+(w.endsWith('я')?'и':'ы');
    if(/[ое]$/i.test(w))return w.slice(0,-1)+(w.endsWith('е')?'я':'а');
    if(/и$/i.test(w))return w.slice(0,-2)+'ей';
    if(/ы$/i.test(w))return w.slice(0,-1)+'';
    return w+'а';
  }

  function openVocabularyGeneration(text){
    const ntext=normalizeLooseInput(text);const toks=tokenise(ntext);if(!toks.length)return '';
    let action=null, actionIndex=-1;
    for(let i=0;i<toks.length;i++){
      const a=genericActionFromToken(toks[i]);
      if(a && (!action||a.score>action.score)){action=a;actionIndex=i;}
    }
    if(!action && toks.length>0){
      // common conversational verbs → service-noun form
      const verbs=[
        [/\b(?:прикрепить|закрепить|крепить|крепл)\b/i,'Крепление'],[/\b(?:зафиксировать|фиксир)\b/i,'Фиксация'],
        [/\b(?:просверлить|сверлить|сверл)\b/i,'Сверление'],[/\b(?:починить|чинить)\b/i,'Ремонт'],[/\b(?:поставить|поставит)\b/i,'Установка'],
        [/\b(?:поменять|поменя)\b/i,'Замена'],[/\b(?:снять|сним)\b/i,'Демонтаж'],[/\b(?:убрать|убери)\b/i,'Удаление']
      ];
      for(let i=0;i<verbs.length;i++)if(verbs[i][0].test(ntext)){action={ru:verbs[i][1],score:.72};actionIndex=i;break;}
    }
    if(action){
      const obj=toks.filter((_,i)=>i!==actionIndex && !looksLikeAction(_));
      if(obj.length){
        // Preserve already inflected noun phrases; otherwise use a conservative
        // genitive transformation for the final service object.
        let objectPhrase=obj.map(normalizeUnknownNoun).join(' ');
        if(obj.length===1 && /^[а-яё-]+$/i.test(obj[0])){
          const original=tokenise(text)[0]||'';
          const roMapped=translateLooseLatinWord(original);
          if(roMapped && /[аяоеьй]$/.test(roMapped)===false) objectPhrase=toGenitiveLoose(roMapped);
          else if(!/[аяеиьюя]$/.test(obj[0]) && !/[аяеиьюя]$/.test(obj[0])) objectPhrase=toGenitiveLoose(obj[0]);
        }
        return cleanupGenerated(`${action.ru} ${objectPhrase}`);
      }
      return action.ru;
    }
    // No recognizable action: still make a clean, capitalized phrase rather
    // than refusing an unseen service name.
    return cleanupGenerated(ntext);
  }

  function cleanupGenerated(text){
    let s=capital(stripPunct(text));
    s=s.replace(/^(услуга|работа|название услуги)\s*[:—-]?\s*/i,'');
    s=s.replace(/\s+/g,' ').trim();
    if(s.length>180)s=s.slice(0,180).replace(/\s+\S*$/,'');
    return s;
  }

  function appendLocation(base,location){
    if(!base||!location)return base;
    if(norm(base).includes(norm(location.ru)))return base;
    return `${base} ${location.ru}`;
  }

  function buildLocalGeneration(text,direction,selectedServices){
    const loose=normalizeLooseInput(text);
    const analysisText=loose||text;
    const catalog=semanticCatalogCandidates(analysisText,direction,selectedServices);
    const openAction=bestOpenAction(analysisText);
    const OPEN_ONLY_RU=new Set(['Крепление','Фиксация','Сверление','Герметизация','Диагностика','Обслуживание','Регулировка','Бурение','Штукатурка','Гидроизоляция','Звукоизоляция','Сборка','Разборка','Разработка','Создание']);
    const strongOpen=!!openAction && openAction.score>=.88 && OPEN_ONLY_RU.has(openAction.ru);
    let action=strongOpen?openAction:(inferAction(analysisText,catalog) || openAction);
    const object=strongOpen?null:inferObject(analysisText,catalog);const location=detectLocation(analysisText)[0];const det=detectDeterminer(analysisText)[0];const num=numbers(analysisText);
    if(object?.id==='leak' && (!action || action.score<.78))action={...ACTIONS.find(x=>x.id==='repair'),score:.92};

    // When meaning can be recovered directly, generation wins over a fuzzy
    // catalog hit. This prevents short noisy input such as "покрас стен" from
    // being misclassified as an unrelated catalog service. The catalog is used
    // as a high-confidence fallback/grounding layer.
    let phrase='';
    const preferOpen = strongOpen;
    if(preferOpen){
      phrase=openVocabularyGeneration(analysisText)||'';
    }
    if(!phrase && action&&object)phrase=inflectPhrase(action,object);
    else if(!phrase && object)phrase=`${neutralObjectAction[object.id]||'Работа'} ${object.cases||object.base}`;
    else if(!phrase && action)phrase=action.ru;
    if(!phrase && catalog[0]&&catalog[0].score>=.72){
      let out=catalog[0].name;
      if(location && !norm(out).includes(norm(location.ru)))out=appendLocation(out,location);
      return {text:cleanupGenerated(out),confidence:Math.min(.98,catalog[0].score+.06),note:'Понято локальным интеллектом по каталогу'};
    }

    if(!phrase){
      // Open-vocabulary generation is the important fallback: unknown service
      // names do not need to exist in ACTIONS/OBJECTS. We infer a professional
      // action noun from the user's verb/stem and preserve the unseen object.
      phrase=openVocabularyGeneration(text)||'';
    }
    if(!phrase){
      const toks=tokenise(text);const repaired=[];
      const vocab=[...ACTIONS,...OBJECTS,...OPEN_ACTIONS].flatMap(x=>x.forms||[]).filter(x=>/^[a-zа-яё]+$/i.test(x));
      for(const t of toks){
        const b=bestForm(t,vocab);repaired.push(b.score>=.54?b.text:t);
      }
      phrase=capital(repaired.join(' '));
    }
    if(det && /^(установка|укладка|монтаж|ремонт|покраска|шпаклевка|грунтовка|прокладка|подключение|настройка|сварка|изготовление|срез|удаление|покос|вывоз|погрузка|очистка|шлифовка|утепление)/i.test(phrase) && object){
      // Only apply adjective when it is meaningful; avoid inventing a detail.
      phrase=phrase.replace(object.base,`${det.ru} ${object.base}`);
    }
    if(location && !(object && ['wall','ceiling','facade','roof','site','floor'].includes(object.id)))phrase=appendLocation(phrase,location);
    if(num && phrase && num.value){
      // Quantity is shown by the estimate UI separately; don't put it into the
      // service name. This keeps generated names stable and avoids inventing units.
    }
    return {text:cleanupGenerated(phrase),confidence:Math.max(.42,Math.min(.9,(action?.score||0)+(object?.score||0))*.5+.3),note:'Сгенерировано автономным интеллектом Master Group'};
  }

  function fallback(text,direction,selectedServices){
    const generated=buildLocalGeneration(text,direction,selectedServices);
    const catalog=semanticCatalogCandidates(text,direction,selectedServices);
    const suggestions=[];
    if(generated.text)suggestions.push({text:generated.text,note:generated.note,confidence:generated.confidence});
    for(const row of catalog){
      if(!suggestions.some(x=>norm(x.text)===norm(row.name)))suggestions.push({text:cleanupGenerated(row.name),note:'Подходит к каталогу Master Group',confidence:Math.min(.96,row.score)});
      if(suggestions.length>=3)break;
    }
    const cleaned=cleanupGenerated(text);
    if(cleaned && !suggestions.some(x=>norm(x.text)===norm(cleaned))){
      suggestions.push({text:cleaned,note:'Сохранён смысл исходного текста',confidence:.38});
    }
    const corrected=suggestions[0]?.text||cleaned;
    return {corrected,suggestions:suggestions.slice(0,3),changed:norm(corrected)!==norm(text),engine:'master-local-ai-open-v4',offline:true,confidence:suggestions[0]?.confidence||.35};
  }

  function isBrowserRuntime(){
    try{return typeof window!=='undefined' && typeof document!=='undefined';}catch(_){return false;}
  }

  function isWebGPUAvailable(){
    try{return typeof navigator!=='undefined' && !!navigator.gpu;}catch(_){return false;}
  }

  async function ensureLocalLlm(){
    if(!isBrowserRuntime())return null;
    if(localLlmPipeline)return localLlmPipeline;
    if(localLlmState==='unavailable')return null;
    if(localLlmPromise)return localLlmPromise;
    localLlmState='loading';
    localLlmPromise=(async()=>{
      try{
        const mod=await import(LOCAL_LLM_CDN);
        const {pipeline,env}=mod;
        // Use browser cache so that after the first model download, inference is
        // local even with the network switched off. Remote models are allowed
        // only for that initial model acquisition.
        if(env?.useBrowserCache!==undefined)env.useBrowserCache=true;
        if(env?.allowRemoteModels!==undefined)env.allowRemoteModels=true;
        const webgpu=isWebGPUAvailable();
        const options=webgpu
          ? {device:'webgpu',dtype:'q4f16'}
          : {device:'wasm',dtype:'q4'};
        localLlmPipeline=await pipeline('text-generation',LOCAL_LLM_MODEL,options);
        localLlmState=webgpu?'ready-webgpu':'ready-wasm';
        return localLlmPipeline;
      }catch(err){
        localLlmState='unavailable';
        console.warn('Master Group local LLM unavailable',err);
        return null;
      }finally{localLlmPromise=null;}
    })();
    return localLlmPromise;
  }

  function extractGeneratedText(output){
    let out='';
    try{
      const item=Array.isArray(output)?output[0]:output;
      if(typeof item==='string')out=item;
      else if(Array.isArray(item?.generated_text)){
        const last=item.generated_text[item.generated_text.length-1];
        out=typeof last==='string'?last:String(last?.content||'');
      }else out=String(item?.generated_text||item?.text||'');
    }catch(_){out='';}
    out=String(out||'')
      .replace(/<think>[\s\S]*?<\/think>/gi,'')
      .replace(/```[\s\S]*?```/g,'')
      .replace(/^(?:ответ|правильная формулировка|название услуги)\s*[:—-]\s*/i,'')
      .split(/\n+/).map(x=>x.trim()).find(Boolean)||'';
    return cleanupGenerated(out);
  }

  async function localLlmSuggest(text,direction,selectedServices){
    const generator=await ensureLocalLlm();
    if(!generator)return null;
    const system=`Ты локальный AI-помощник приложения Master Group.\nТвоя единственная задача — восстановить и грамотно сформулировать название услуги по тексту пользователя.\nПользователь может писать с грубыми орфографическими ошибками, пропускать буквы, писать по-русски на слух, русскими словами в латинице, по-румынски, смешивать русский/румынский/латиницу и использовать разговорные сокращения.\nПонимай СМЫСЛ по всему вводу, а не ищи точное совпадение в каталоге. Не ограничивайся известными услугами каталога: неизвестные объекты и новые услуги разрешены.\nВерни ОДНУ короткую профессиональную формулировку на русском языке, без объяснений, кавычек, списков и рассуждений.\nНе добавляй цену, количество, единицу измерения, материалы, размеры, адрес или другие факты, которых нет во вводе.\nНапример: «крепл мотора» → «Крепление мотора»; «krеpl motora» → «Крепление мотора»; «prindere motor» → «Крепление мотора»; «свeрл дырк бет» → «Сверление отверстия в бетоне».`;
    const user=`Направление: ${clean(direction,MAX_DIRECTION)||'не указано'}\nУже выбранные услуги: ${uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS).join('; ')||'нет'}\nИсходный текст пользователя: ${clean(text)}\n\nВерни только правильное название услуги на русском.`;
    const messages=[{role:'system',content:system},{role:'user',content:user}];
    try{
      let output;
      try{
        const tokenizer=generator.tokenizer;
        if(tokenizer&&typeof tokenizer.apply_chat_template==='function'){
          const prompt=await tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true,enable_thinking:false});
          output=await generator(prompt,{max_new_tokens:48,do_sample:false,return_full_text:false});
        }else{
          output=await generator(messages,{max_new_tokens:48,do_sample:false});
        }
      }catch(firstErr){
        output=await generator(messages,{max_new_tokens:48,do_sample:false});
      }
      const corrected=extractGeneratedText(output);
      if(!corrected||corrected.length<2||corrected.length>180)return null;
      if(/^(не могу|я не могу|не знаю|не удалось|как исправить)/i.test(corrected))return null;
      return {
        corrected,
        suggestions:[{text:corrected,note:localLlmState==='ready-webgpu'?'Локальная AI-модель Qwen3 на устройстве':'Локальная AI-модель Qwen3 (CPU)',confidence:.96}],
        changed:norm(corrected)!==norm(text),
        engine:'local-llm-qwen3-0.6b',
        offline:true,
        modelCached:true,
        remoteInference:false,
        confidence:.96
      };
    }catch(err){
      console.warn('Master Group local LLM generation failed',err);
      return null;
    }
  }

  async function ensureNativeSession(){
    if(nativeState==='unavailable')return null;
    if(nativeSession)return nativeSession;
    if(nativePromise)return nativePromise;
    nativePromise=(async()=>{
      try{
        if(!window.LanguageModel || typeof window.LanguageModel.create!=='function')throw new Error('No local LanguageModel API');
        if(typeof window.LanguageModel.availability==='function'){
          let status='unavailable';
          try{status=await window.LanguageModel.availability();}catch(_){status='available';}
          if(status!=='available')throw new Error('Local model unavailable');
        }
        nativeSession=await window.LanguageModel.create({
          initialPrompts:[{role:'system',content:'Ты локальный интеллект Master Group. Пользователь может писать по-русски с сильными ошибками, по-румынски, латиницей, на слух, с пропущенными буквами или в разговорной форме. Пойми смысл и верни одно короткое профессиональное название услуги на русском языке. Не придумывай цены, количество, единицы измерения или факты. Можно использовать направление и каталог как контекст.'}]
        });
        nativeState='available';return nativeSession;
      }catch(_){nativeState='unavailable';return null;}finally{nativePromise=null;}
    })();
    return nativePromise;
  }

  async function nativeSuggest(text,direction,selectedServices){
    const s=await ensureNativeSession();if(!s)return null;
    const prompt=`Направление: ${clean(direction,MAX_DIRECTION)||'не указано'}\nКаталог/выбранные услуги: ${uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS).join('; ')||'нет'}\nПользователь: ${clean(text)}\nВерни только одно правильное название услуги на русском.`;
    try{
      const raw=await s.prompt(prompt);const out=cleanupGenerated(String(raw||'').split(/\n+/).map(x=>x.replace(/^[-*•\d.)]+\s*/,'')).find(Boolean)||'');
      if(!out||out.length>180||/пользователь:|направление:|каталог/i.test(out))return null;
      return {corrected:out,suggestions:[{text:out,note:'Локальная языковая модель устройства',confidence:.95}],changed:norm(out)!==norm(text),engine:'native-local-ai',offline:true,confidence:.95};
    }catch(_){return null;}
  }

  async function suggestServiceName({text,direction='',selectedServices=[]}={}){
    const input=clean(text);if(!input)return {corrected:'',suggestions:[],changed:false,engine:'local-llm-qwen3-0.6b',offline:true,confidence:1};
    const services=uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS);const key=JSON.stringify({input,d:clean(direction,MAX_DIRECTION),s:services});
    if(CACHE.has(key))return CACHE.get(key);

    const local=fallback(input,direction,services);
    // Real local generative AI is primary. A short timeout prevents the UI from
    // becoming unusable on the very first visit while the ~570 MB model is
    // downloading/caching. Once cached, generation stays on-device.
    let llm=null;
    try{
      llm=await Promise.race([
        localLlmSuggest(input,direction,services),
        new Promise(resolve=>setTimeout(()=>resolve(null),2600))
      ]);
    }catch(_){llm=null;}
    // The native browser on-device model is another fully local enhancement.
    const native=llm?null:await nativeSuggest(input,direction,services);
    const result=llm||native||local;
    CACHE.set(key,result);if(CACHE.size>MAX_CACHE)CACHE.delete(CACHE.keys().next().value);
    return result;
  }

  function clearCache(){CACHE.clear();}
  function getStatus(){return {
    engine:localLlmState.startsWith('ready')?'local-llm-qwen3-0.6b':(nativeState==='available'?'native-local-ai':'master-local-ai-v2'),
    native:nativeState,
    localLlm:localLlmState,
    model:LOCAL_LLM_MODEL,
    offline:true,
    remoteInference:false,
    remoteApi:false,
    remoteHost:false
  };}

  window.MG_AI_SERVICE={suggestServiceName,clearCache,getStatus,esc,region:null,version:'v381-local-llm-qwen3'};
})();
