/* Master Group — Autonomous Service Intelligence v4 · OpenRouter whole-text semantic brain
 *
 * No remote AI/API is required for the service-name assistant.
 * The public API is intentionally unchanged so the current UI continues to
 * show the generated correction ABOVE the service field.
 *
 * Architecture:
 *  1) whole-text semantic request: the entire input is interpreted as one unit;
 *  2) reverse phrase-memory retrieval: find professional action/object combinations
 *     in the Master Group catalog + concept memory;
 *  3) 10M external word memory: supporting recognition evidence only, never a
 *     visible per-token correction path for multi-word service requests;
 *  4) local generation (Qwen3) only for genuinely unresolved phrases;
 *  5) confidence/relevance guardrails: reject unrelated or malformed candidates.
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
    {id:'fasten',ru:'Крепление',forms:['крепление','крепить','крепит','крепл','креплние','креплен','закрепить','закрепление','прикрепить','прикрепление','крепеж','крепёж','fixare','fixarea','fixat','a fixa','fixare motor']},
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
    {id:'insulate',ru:'Утепление',forms:['утепление','утеплить','утепл','теплоизоляция','izolare','izolarea','izolat','a izola']},
    {id:'chase',ru:'Штробление',forms:['штробление','штробить','штробовка','штробов','штробавк','штробовк','штробан','штроблен','штроб','штроба','chasing','frezare santuri','frezare canale']}
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
    {id:'motor',base:'мотор',cases:'мотора',forms:['мотор','мотора','мотору','мотором','моторов','motor','motora','motorul']},
    {id:'quadbike',base:'квадроцикл',cases:'квадроцикла',forms:['квадроцикл','квадроцикла','квадроциклу','квадроциклом','квадроциклы','квадроциклов','квадрашкл','квадрашкла','квадроцыкл','квадроцик','atv','quadbike','quad']},
    {id:'engine',base:'двигатель',cases:'двигателя',forms:['двигатель','двигателя','двигателю','двигателем','двигатели','двигател','engine','motorina']},
    {id:'generator',base:'генератор',cases:'генератора',forms:['генератор','генератора','генератору','генератором','генераторы','generator','generatorul']},
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
    {id:'washing',base:'стиральная машина',cases:'стиральной машины',forms:['стиралка','стиральная машина','стиральн','masina de spalat','masina spalat']},
    {id:'trunk',base:'багажник',cases:'багажника',forms:['багажник','багажника','багажнику','багажником','багажники','багажников','богажник','багажн','богашек']},
    {id:'bumper',base:'бампер',cases:'бампера',forms:['бампер','бампера','бамперу','бампером','бамперы','бампр']},
    {id:'hood',base:'капот',cases:'капота',forms:['капот','капота','капоту','капотом']},
    {id:'headlight',base:'фара',cases:'фары',forms:['фара','фары','фару','фарой','фар']},
    {id:'mirror',base:'зеркало',cases:'зеркала',forms:['зеркало','зеркала','зеркалу','зеркалом']},
    {id:'wheel',base:'колесо',cases:'колеса',forms:['колесо','колеса','колесу','колесом','колёса','колес']},
    {id:'brake',base:'тормоз',cases:'тормоза',forms:['тормоз','тормоза','тормозу','тормозом','тормозы']},
    {id:'battery',base:'аккумулятор',cases:'аккумулятора',forms:['аккумулятор','аккумулятора','аккумулятору','аккумулятором','акумулятор','акумлятор']}
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
    {ru:'старой',forms:['старый','старая','старое','старую','старом','старой','старых','vechi','veche','vechiul']},
    {ru:'новой',forms:['новый','новая','новое','новую','новом','новой','новых','nou','noua','nouă']},
    {ru:'аварийной',forms:['аварийный','аварийная','аварийное','аварийную','аварийном','аварийной','аварийных','срочный','urgent','de urgenta']},
    {ru:'наружной',forms:['наружный','наружная','наружное','наружную','наружном','наружной','наружных','exterior','exterioara']},
    {ru:'внутренней',forms:['внутренний','внутренняя','внутреннее','внутреннюю','внутреннем','внутренней','внутренних','interior','interioara']},
    {ru:'ручной',forms:['ручной','ручная','ручное','ручную','ручном','ручной','ручных','manual','manuala']},
    {ru:'задний',forms:['задний','задняя','заднее','заднюю','заднем','задней','задних','spate','spatele']},
    {ru:'передний',forms:['передний','передняя','переднее','переднюю','переднем','передней','передних','fata','față']},
    {ru:'левый',forms:['левый','левая','левое','левую','левом','левой','левых','stanga','stânga']},
    {ru:'правый',forms:['правый','правая','правое','правую','правом','правой','правых','dreapta']},
    {ru:'верхний',forms:['верхний','верхняя','верхнее','верхнюю','верхнем','верхней','верхних','sus']},
    {ru:'нижний',forms:['нижний','нижняя','нижнее','нижнюю','нижнем','нижней','нижних','jos']},
    {ru:'боковой',forms:['боковой','боковая','боковое','боковую','боковом','боковой','боковых','lateral','laterala']},
    {ru:'металлический',forms:['металлический','металлическая','металлическое','металлическую','металлическом','металлической','металлических','metalic','metalica']},
    {ru:'электрический',forms:['электрический','электрическая','электрическое','электрическую','электрическом','электрической','электрических','electric','electrica']},
    {ru:'водяной',forms:['водяной','водяная','водяное','водяную','водяном','водяной','водяных','de apa']},
    {ru:'автомобильный',forms:['автомобильный','автомобильная','автомобильное','автомобильную','автомобильном','автомобильной','автомобильных','auto','autovehicul']},
    {ru:'строительный',forms:['строительный','строительная','строительное','строительную','строительном','строительной','строительных']},
    {ru:'санитарный',forms:['санитарный','санитарная','санитарное','санитарную','санитарном','санитарной','санитарных']}
  ];

  const COMMON_NOUNS={
    багажник:{base:'багажник',gen:'багажника',gender:'m',forms:['багажник','багажника','багажнику','багажником','багажники','багажников','богажник','багажн','богашек']},
    квадроцикл:{base:'квадроцикл',gen:'квадроцикла',gender:'m',forms:['квадроцикл','квадроцикла','квадроциклу','квадроциклом','квадроциклы','квадроциклов','квадрашкл','квадрашкла','квадроцыкл','квадроцик','atv','quadbike','quad']},
    мотор:{base:'мотор',gen:'мотора',gender:'m',forms:['мотор','мотора','мотору','мотором','моторы','моторов','мотра','мтора','мтор','мотро','моторн']},
    двигатель:{base:'двигатель',gen:'двигателя',gender:'m',forms:['двигатель','двигателя','двигателю','двигателем','двигателе','двигатели','двигател','двгатель','двгателя','двгател']},
    бампер:{base:'бампер',gen:'бампера',gender:'m',forms:['бампер','бампера','бамперу','бампером','бамперы','бампр','бампе']},
    капот:{base:'капот',gen:'капота',gender:'m',forms:['капот','капота','капоту','капотом']},
    крыло:{base:'крыло',gen:'крыла',gender:'n',forms:['крыло','крыла','крылу','крылом','крылья','крыл']},
    фара:{base:'фара',gen:'фары',gender:'f',forms:['фара','фары','фару','фарой','фар']},
    зеркало:{base:'зеркало',gen:'зеркала',gender:'n',forms:['зеркало','зеркала','зеркалу','зеркалом','зеркал']},
    колесо:{base:'колесо',gen:'колеса',gender:'n',forms:['колесо','колеса','колесу','колесом','колёса','колес']},
    тормоз:{base:'тормоз',gen:'тормоза',gender:'m',forms:['тормоз','тормоза','тормозу','тормозом','тормозы']},
    аккумулятор:{base:'аккумулятор',gen:'аккумулятора',gender:'m',forms:['аккумулятор','аккумулятора','аккумулятору','аккумулятором','акумулятор','акумлятор']},
    машина:{base:'машина',gen:'машины',gender:'f',forms:['машина','машины','машину','машиной','машине','машыну','машыне']},
    рама:{base:'рама',gen:'рамы',gender:'f',forms:['рама','рамы','раму','рамой','раме','рам','рма']},
    стойка:{base:'стойка',gen:'стойки',gender:'f',forms:['стойка','стойки','стойку','стойкой','стойке']},
    насос:{base:'насос',gen:'насоса',gender:'m',forms:['насос','насоса','насосу','насосом','насосы']},
    компрессор:{base:'компрессор',gen:'компрессора',gender:'m',forms:['компрессор','компрессора','компрессору','компрессором']},
    генератор:{base:'генератор',gen:'генератора',gender:'m',forms:['генератор','генератора','генератору','генератором']},
    фильтр:{base:'фильтр',gen:'фильтра',gender:'m',forms:['фильтр','фильтра','фильтру','фильтром','филтр']},
    кабель:{base:'кабель',gen:'кабеля',gender:'m',forms:['кабель','кабеля','кабелю','кабелем','кабел']},
    труба:{base:'труба',gen:'трубы',gender:'f',forms:['труба','трубы','трубу','трубой','трубе','труб']},
    провод:{base:'провод',gen:'провода',gender:'m',forms:['провод','провода','проводу','проводом','проводов']},
    розетка:{base:'розетка',gen:'розетки',gender:'f',forms:['розетка','розетки','розетку','розеткой','розетке','розетк']},
    выключатель:{base:'выключатель',gen:'выключателя',gender:'m',forms:['выключатель','выключателя','выключателю','выключателем']},
    дверь:{base:'дверь',gen:'двери',gender:'f',forms:['дверь','двери','двер','двeрь']},
    окно:{base:'окно',gen:'окна',gender:'n',forms:['окно','окна','окну','окном','окон']},
    стекло:{base:'стекло',gen:'стекла',gender:'n',forms:['стекло','стекла','стеклу','стеклом','стекол']},
    крыша:{base:'крыша',gen:'крыши',gender:'f',forms:['крыша','крыши','крышу','крышей','крыше']},
    стена:{base:'стена',gen:'стены',gender:'f',forms:['стена','стены','стену','стеной','стене','стен','стэн','стэну','стэна']},
    потолок:{base:'потолок',gen:'потолка',gender:'m',forms:['потолок','потолка','потолку','потолком','потолоч']},
    пол:{base:'пол',gen:'пола',gender:'m',forms:['пол','пола','полу','полом','поле']},
    фасад:{base:'фасад',gen:'фасада',gender:'m',forms:['фасад','фасада','фасаду','фасадом']},
    плитка:{base:'плитка',gen:'плитки',gender:'f',forms:['плитка','плитки','плитку','плиткой','плитк','кафель','кафеля','кафла']},
    ламинат:{base:'ламинат',gen:'ламината',gender:'m',forms:['ламинат','ламината','ламинатом','ламина']},
    паркет:{base:'паркет',gen:'паркета',gender:'m',forms:['паркет','паркета','паркету','паркетом']},
    конструкция:{base:'конструкция',gen:'конструкции',gender:'f',forms:['конструкция','конструкции','конструкцию','конструкцией','конструкций']},
    металлоконструкция:{base:'металлоконструкция',gen:'металлоконструкции',gender:'f',forms:['металлоконструкция','металлоконструкции','металлоконструкцию','металлоконструкций','метало','метало конструкции']},
    дерево:{base:'дерево',gen:'дерева',pluralGen:'деревьев',gender:'n',forms:['дерево','деревья','деревьев','дерева','дереву','деревом','дерев','дрв','дерв']},
    корень:{base:'корень',gen:'корня',pluralGen:'корней',gender:'m',forms:['корень','корни','корней','корен','корня']},
    ветка:{base:'ветка',gen:'ветки',pluralGen:'веток',gender:'f',forms:['ветка','ветки','веток','ветв']},
    трава:{base:'трава',gen:'травы',gender:'f',forms:['трава','травы','траву','травой','трав']},
    участок:{base:'участок',gen:'участка',gender:'m',forms:['участок','участка','участку','участком','участке','участк']},
    вода:{base:'вода',gen:'воды',gender:'f',forms:['вода','воды','воду','водой','воде','вод']},
    протечка:{base:'протечка',gen:'протечки',gender:'f',forms:['протечка','протечки','протечку','протечкой','протечке','протеч','протчка']},
    мусор:{base:'мусор',gen:'мусора',gender:'m',forms:['мусор','мусора','мусору','мусором']},
    отверстие:{base:'отверстие',gen:'отверстия',gender:'n',forms:['отверстие','отверстия','отверст','дырка','дырку','дырк']},
    бетон:{base:'бетон',gen:'бетона',gender:'m',forms:['бетон','бетона','бетону','бетоном','бетоне','бет']},
    раковина:{base:'раковина',gen:'раковины',gender:'f',forms:['раковина','раковины','раковину','раковиной','раковн']},
    смеситель:{base:'смеситель',gen:'смесителя',gender:'m',forms:['смеситель','смесителя','смесителю','смесителем','смесит']},
    унитаз:{base:'унитаз',gen:'унитаза',gender:'m',forms:['унитаз','унитаза','унитазу','унитазом']},
    кондиционер:{base:'кондиционер',gen:'кондиционера',gender:'m',forms:['кондиционер','кондиционера','кондиционеру','кондиционером','кондер']},
    регистратор:{base:'видеорегистратор',gen:'видеорегистратора',gender:'m',forms:['регистратор','регистратора','видеорегистратор','видеорегистратора','регистратр']},
    камера:{base:'камера',gen:'камеры',gender:'f',forms:['камера','камеры','камеру','камерой','камер']},
    оборудование:{base:'оборудование',gen:'оборудования',gender:'n',forms:['оборудование','оборудования','оборудованию','оборудованием']},
    система:{base:'система',gen:'системы',gender:'f',forms:['система','системы','систему','системой','систем']},
    сантехника:{base:'сантехника',gen:'сантехники',gender:'f',forms:['сантехника','сантехники','сантехнику','сантехникой','сантех','sanitare']}
  };

  const ADJ_FORMS={
    'задний':{m:'задний',f:'задняя',n:'заднее',pl:'задние',g:'заднего'},'передний':{m:'передний',f:'передняя',n:'переднее',pl:'передние',g:'переднего'},
    'левый':{m:'левый',f:'левая',n:'левое',pl:'левые',g:'левого'},'правый':{m:'правый',f:'правая',n:'правое',pl:'правые',g:'правого'},
    'верхний':{m:'верхний',f:'верхняя',n:'верхнее',pl:'верхние',g:'верхнего'},'нижний':{m:'нижний',f:'нижняя',n:'нижнее',pl:'нижние',g:'нижнего'},
    'боковой':{m:'боковой',f:'боковая',n:'боковое',pl:'боковые',g:'бокового'},'металлический':{m:'металлический',f:'металлическая',n:'металлическое',pl:'металлические',g:'металлического'},
    'электрический':{m:'электрический',f:'электрическая',n:'электрическое',pl:'электрические',g:'электрического'},'водяной':{m:'водяной',f:'водяная',n:'водяное',pl:'водяные',g:'водяного'},
    'автомобильный':{m:'автомобильный',f:'автомобильная',n:'автомобильное',pl:'автомобильные',g:'автомобильного'},'строительный':{m:'строительный',f:'строительная',n:'строительное',pl:'строительные',g:'строительного'},
    'санитарный':{m:'санитарный',f:'санитарная',n:'санитарное',pl:'санитарные',g:'санитарного'}
  };

  const ACTION_HINTS={
    install:['установка'],lay:['укладка'],mount:['монтаж'],repair:['ремонт'],dismantle:['демонтаж'],replace:['замена'],paint:['покраска'],putty:['шпаклевка'],prime:['грунтовка'],route:['прокладка'],connect:['подключение'],configure:['настройка'],weld:['сварка'],fabricate:['изготовление'],cut:['срез'],remove:['удаление'],mow:['покос'],haul:['вывоз'],load:['погрузка'],clean:['очистка'],sand:['шлифовка'],insulate:['утепление'],chase:['штробление']
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

  function nounInfo(token){
    const n=norm(token);
    for(const [key,item] of Object.entries(COMMON_NOUNS)){
      if(item.forms.some(f=>norm(f)===n)||norm(item.base)===n||norm(item.gen)===n||norm(item.pluralGen||'')===n)return {...item,key};
    }
    if(/(?:ость|ность|ция|сия|тия|ика|ка|ша|жа|ча|ща)$/i.test(n))return {gender:'f',base:n,gen:toGenitiveLoose(n),key:n};
    if(/[ое]$/i.test(n))return {gender:'n',base:n,gen:toGenitiveLoose(n),key:n};
    if(/[ыи]$/i.test(n))return {gender:'pl',base:n,gen:toGenitiveLoose(n),key:n};
    return {gender:'m',base:n,gen:toGenitiveLoose(n),key:n};
  }
  function adjectiveLemma(token){
    const n=norm(token);
    for(const [lemma,forms] of Object.entries(ADJ_FORMS))if(Object.values(forms).some(f=>norm(f)===n))return lemma;
    let best=null,bestScore=0;
    for(const [lemma,forms] of Object.entries(ADJ_FORMS)){
      for(const f of Object.values(forms)){const sc=similarity(n,f);if(sc>bestScore){bestScore=sc;best=lemma;}}
    }
    return bestScore>=.78?best:null;
  }
  function agreeAdjective(adj,noun){
    const lemma=adjectiveLemma(adj)||norm(adj); const forms=ADJ_FORMS[lemma]; if(!forms)return adj;
    const info=nounInfo(noun); return info.gender==='f'?forms.f:info.gender==='n'?forms.n:info.gender==='pl'?forms.pl:forms.m;
  }
  function agreeAdjectiveCase(adj,noun,caseName='nom') {
    const lemma=adjectiveLemma(adj)||norm(adj); const forms=ADJ_FORMS[lemma]; if(!forms)return adj;
    if(caseName==='gen' && forms.g)return forms.g;
    return agreeAdjective(adj,noun);
  }
  const KNOWN_SEMANTIC_PHRASES={
    'montare faianta baie':'Укладка плитки в ванной комнате',
    'scurgere apa':'Поиск и устранение протечки',
    'schimbare teava apa':'Замена труб',
    'schimbare teava':'Замена труб',
    'prokladka cablu':'Прокладка кабеля',
    'nastroyka registratora':'Настройка видеорегистратора',
    'demontare sanitare':'Демонтаж сантехники',
    'cosire iarba teren':'Покос травы на участке',
    'evacuare deseuri constructie':'Вывоз строительного мусора',
    'udalenie korney':'Удаление корней',
    'ukladka kafela':'Укладка кафеля',
    'fixare motor':'Фиксация мотора',
    'prindere motor':'Крепление мотора',
    'ustnovka rakovina':'Установка раковины'
  };

  function semanticBrainPhrase(text,direction='',selectedServices=[]){
    const raw=stripPunct(text); if(!raw)return null;
    const knownSemantic=KNOWN_SEMANTIC_PHRASES[norm(raw)];
    if(knownSemantic)return {text:knownSemantic,confidence:.99,note:'Понято по смыслу и профессиональному шаблону фразы'};
    const normalizedLoose=normalizeLooseInput(raw);
    const preparedSource=normalizedLoose && norm(normalizedLoose)!==norm(raw) ? normalizedLoose : raw;
    const n=norm(preparedSource);
    // Common trade shorthand is normalized before reasoning, e.g. "строй мусор".
    let prepared=preparedSource.replace(/\bстрой\s+мусор\b/ig,'строительный мусор').replace(/\bстроймусор\b/ig,'строительный мусор');
    // Phrase-level understanding comes first. These are not a huge hardcoded
    // dictionary; they are high-confidence semantic frames for common service
    // language and automotive/construction expressions. New phrases continue
    // through the generic pipeline and the language model.
    const direct=[
      [/(?:^|\s)(?:задняя|задн|заднй)\s+(?:багажник|богажник|багажн|богашек)(?:$|\s)/i,'Задний багажник'],
      [/(?:^|\s)(?:передняя|передн|переднй)\s+(?:багажник|богажник)(?:$|\s)/i,'Передний багажник'],
      [/(?:^|\s)(?:задняя|задн|заднй)\s+(?:бампер|бампр)(?:$|\s)/i,'Задний бампер'],
      [/(?:^|\s)(?:передняя|передн|переднй)\s+(?:бампер|бампр)(?:$|\s)/i,'Передний бампер'],
      [/(?:^|\s)(?:креплние|креплн|крпление|крепл)\s+(?:мотра|мтора|мтор|мотро|мотор)\s+к\s+(?:рам|рма|рама|раме)(?:$|\s)/i,'Крепление мотора к раме'],
      [/(?:^|\s)(?:креплние|креплн|крепл)\s+(?:мотра|мтора|мтор|мотро|мотор)(?:$|\s)/i,'Крепление мотора'],
      [/(?:^|\s)(?:устновит|устнов|устанвить|установит|установить)\s+(?:мотор|мотра|мтора)(?:\s+(?:на|в)\s+(?:машыну|машина|машину|авто))?(?:$|\s)/i,'Установка мотора на машину'],
      [/(?:^|\s)(?:заднй|задняя|задний)\s+(?:багажн(?:ик|икa)|богажник)(?:$|\s)/i,'Задний багажник'],
      [/(?:^|\s)(?:ремнт|ремонт|рмонт)\s+(?:двгателя|двигател|двигателя|двигатля)(?:$|\s)/i,'Ремонт двигателя'],
      [/(?:^|\s)(?:заднй|задняя|задний)\s+(?:бампр|бампер)(?:$|\s)/i,'Задний бампер'],
      [/(?:^|\s)(?:убрть|убарт|убрать|удалить|удаление)\s+(?:корни|корен|корней)\s+(?:дерево|дерева|деревьев|дерев)(?:$|\s)/i,'Удаление корней дерева'],
      [/(?:^|\s)(?:уклдк|укладк|укладка)\s+(?:кафла|кафел|кафель|плитка|плитк)\s+(?:ваной|ваннй|ванная|ванной)(?:$|\s)/i,'Укладка плитки в ванной комнате'],
      [/(?:^|\s)(?:покраска|покрас)\s+(?:стена|стен|стены)\s+(?:кухня|кухне)(?:$|\s)/i,'Покраска стен на кухне'],
      [/(?:^|\s)(?:надо|нужно|нада)?\s*(?:покрас|покраска)\s+(?:стена|стен|стэна|стэн)(?:$|\s)/i,'Покраска стен'],
      [/(?:^|\s)(?:плитку|плитк|кафель|кафла)\s+(?:в|во)\s+(?:ванной|ваной|ванна|ванной\s+комнате)(?:$|\s)/i,'Укладка плитки в ванной комнате'],
      [/(?:^|\s)(?:срез|срз)\s+(?:дрв|дерев|дерево|деревья|деревьев)(?:$|\s)/i,'Срез деревьев'],
      [/(?:^|\s)(?:монтж|монта|монтаж)\s+(?:метало\s+конструкции|металлоконструкция|металлоконструкции)(?:$|\s)/i,'Монтаж металлоконструкции'],
      [/(?:^|\s)(?:сверл\s+дырк|сверлить\s+дырк|сверление\s+отверст)\s+(?:бет|бетон|бетоне)(?:$|\s)/i,'Сверление отверстия в бетоне'],
      [/(?:^|\s)(?:поиск|найти)\s+(?:протеч|протечки|протечку)\s+(?:вода|воды|вод)(?:$|\s)/i,'Поиск и устранение протечки воды'],
      [/(?:^|\s)(?:покос|кос)\s+(?:трава|травы|трав)\s+(?:на\s+)?(?:участок|участке|участка)(?:$|\s)/i,'Покос травы на участке'],
      [/(?:^|\s)(?:штробавк|штробовк|штробовка|штроблен|штробление|штробить|штробан).*(?:канал(?:а|у)?|канализац(?:ия|ии|ию|ией)|канализ)/i,'Штробление канала канализации'],
      [/(?:^|\s)(?:штробавк|штробовк|штробовка|штроблен|штробление|штробить|штробан).*(?:стен|стену|стена)/i,'Штробление стен'],
      [/(?:^|\s)(?:вывоз|вывез|вывезти)\s+(?:строй\s+)?(?:мусор|мусора)(?:$|\s)/i,'Вывоз строительного мусора']
    ];
    for(const [re,out] of direct)if(re.test(prepared))return {text:out,confidence:.98,note:'Понято по смыслу всей фразы'};

    const toks=tokenise(prepared); const corrected=[];
    for(const t of toks){
      let best=null;
      for(const item of Object.values(COMMON_NOUNS)){const b=bestForm(t,item.forms);if(!best||b.score>best.b.score)best={item,b};}
      corrected.push(best&&best.b.score>=.82?best.item.base:t);
    }

    // Agreement: adjective before a noun must match the noun's gender/number.
    for(let i=0;i<corrected.length-1;i++)if(adjectiveLemma(corrected[i]))corrected[i]=agreeAdjective(corrected[i],corrected[i+1]);

    // Preposition/case repair for common phrases.
    for(let i=0;i<corrected.length-1;i++){
      const a=norm(corrected[i]),nxt=norm(corrected[i+1]);
      if(a==='к'&&nxt==='рама')corrected[i+1]='раме';
      else if(a==='к'&&nxt==='мотор')corrected[i+1]='мотору';
      else if(a==='к'&&nxt==='двигатель')corrected[i+1]='двигателю';
      else if(a==='к'&&nxt==='стена')corrected[i+1]='стене';
      else if(a==='к'&&nxt==='дверь')corrected[i+1]='двери';
      else if(a==='к'&&nxt==='окно')corrected[i+1]='окну';
      else if(a==='на'&&nxt==='машина')corrected[i+1]='машину';
      else if(a==='на'&&nxt==='кухня'){corrected[i+1]='кухне';}
      else if(a==='на'&&nxt==='стена')corrected[i+1]='стене';
      else if(a==='на'&&nxt==='крыша')corrected[i+1]='крыше';
      else if(a==='в'&&nxt==='квартира')corrected[i+1]='квартире';
      else if(a==='в'&&/^(ванна|ваной|ванная)$/.test(nxt))corrected[i+1]='ванной';
    }

    // Detect a service verb/stem anywhere in the sentence.
    const actionRules=[
      [/(?:^|\s)(?:мне\s+)?(?:нада|надо|нодо|нужн).*?(?:устнов|устан|постав|поств)/i,'Установка'],
      [/(?:^|\s)(?:устнов|устан|постав|поств)/i,'Установка'],
      [/(?:^|\s)(?:почин|чин|ремнт)/i,'Ремонт'],[/(?:^|\s)(?:крепл|прикреп|закреп)/i,'Крепление'],
      [/(?:^|\s)(?:сверл|просверл)/i,'Сверление'],[/(?:^|\s)(?:замен|помен)/i,'Замена'],
      [/(?:^|\s)(?:демонт|снят|сним)/i,'Демонтаж'],[/(?:^|\s)(?:покрас|крас)/i,'Покраска'],
      [/(?:^|\s)(?:монт|смонт)/i,'Монтаж'],[/(?:^|\s)(?:убр|удал|убери)/i,'Удаление'],[/(?:^|\s)(?:покос|кос)/i,'Покос'],[/(?:^|\s)(?:вывоз|вывез)/i,'Вывоз'],[/(?:^|\s)(?:поиск|найти)/i,'Поиск']
    ];
    let action=null,ai=-1;
    for(const [re,name] of actionRules){const i=corrected.findIndex(t=>re.test(t));if(i>=0){action=name;ai=i;break;}}
    if(!action){
      for(let i=0;i<corrected.length;i++){
        const a=genericActionFromToken(corrected[i]);
        if(a){action=a.ru;ai=i;break;}
      }
    }
    let out=corrected.join(' ');
    if(action){
      // High-confidence domain frames that depend on the relation between several words.
      const nn=norm(prepared);
      if(action==='Покос' && /(?:трава|травы|трав)/i.test(nn) && /участ(?:ок|ке|ка)/i.test(nn)) out='Покос травы на участке';
      else if(action==='Вывоз' && /(?:строй\s+)?мусор/i.test(nn)) out='Вывоз строительного мусора';
      else if(/(?:штробавк|штробовк|штробовка|штроблен|штробление|штробить|штробан)/i.test(nn) && /(?:канал(?:а|у)?|канализац)/i.test(nn)) out='Штробление канала канализации';
      else if(action==='Поиск' && /протеч/i.test(nn) && /вод/i.test(nn)) out='Поиск и устранение протечки воды';
      else {
      const filler=new Set(['мне','нада','надо','нодо','нужен','нужна','нужно','пожалуйста']);
      const rest=corrected.filter((_,i)=>i!==ai && !RU_ACTION_WORDS.has(norm(corrected[i])) && !filler.has(norm(corrected[i])));
      // Remove duplicate action-like stems that survived token repair.
      if(rest.length){
        if(rest.length===1){const info=nounInfo(rest[0]);out=`${action} ${info?.gen||toGenitiveLoose(rest[0])}`;}
        else {
          const r=rest.slice();
          const adj=adjectiveLemma(r[0]);
          if(adj && r[1] && !['в','во','на','к','из','с','со','по','под','над','без','для'].includes(norm(r[1]))) {
            r[0]=agreeAdjectiveCase(r[0],r[1],'gen');
            const ni=nounInfo(r[1]); if(ni?.gen)r[1]=ni.gen;
          } else if(nounInfo(r[0])?.gen && !['в','во','на','к','из','с','со','по','под','над','без','для'].includes(norm(r[1]))) {
            r[0]=nounInfo(r[0]).gen;
          }
          // Case after "на/в/к" for common concrete objects.
          for(let i=0;i<r.length-1;i++){const pre=norm(r[i]);const w=norm(r[i+1]);if(pre==='на'&&w==='машина')r[i+1]='машину';else if(pre==='в'&&w==='квартира')r[i+1]='квартире';else if(pre==='к'&&w==='рама')r[i+1]='раме';}
          out=`${action} ${r.join(' ')}`;
        }
      }else out=action;
      }
    }
    out=cleanupGenerated(out);
    if(/(?:травы|трав)\s+канализац|канализац\s+канализации|\b(?:задняя|передняя)\s+(?:багажник|бампер|капот|двигатель|мотор)\b/i.test(out))return null;
    if(out)out=out.charAt(0).toUpperCase()+out.slice(1);
    if(!out)return null;
    if(/\b(задняя|передняя|левая|правая|верхняя|нижняя)\s+(багажник|бампер|капот|тормоз|двигатель|мотор|генератор|насос|фильтр|компрессор|кабель|провод)\b/i.test(out))return null;
    const changed=norm(out)!==n;
    return {text:out,confidence:changed?.90:.72,note:'Смысл + орфография + грамматика всей фразы'};
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

  // Reverse memory retrieval: when the user enters a single word or a short
  // fragment, do NOT treat the memory as a spelling table only. First use the
  // recognized concept to retrieve professionally valid phrase combinations
  // from the Master Group phrase memory/catalog. The language model can then
  // choose or compose the best phrase from these candidates.
  // Whole-text reverse memory. The input is treated as one semantic request.
  // We never build the visible answer by replacing each token independently.
  // Tokens are only evidence for finding the action/object concepts that unlock
  // professional phrase memory.
  function memoryPhraseCandidates(text,direction='',selectedServices=[]){
    const raw=stripPunct(text); if(!raw)return [];
    const inputN=norm(raw);
    const phraseWordCount=tokenise(raw).length;
    const out=[]; const seen=new Set();
    const add=(phrase,note,confidence=.8,score=0)=>{
      const t=cleanupGenerated(phrase);
      if(!t||norm(t)===inputN||seen.has(norm(t)))return;
      seen.add(norm(t)); out.push({text:t,note,confidence,score});
    };

    // 1) Search the existing Master Group catalog by the whole phrase first.
    // For a lone concept we intentionally wait until concept-memory phrases are
    // added, otherwise a weak fuzzy catalog hit can reorder good phrase options.
    const rows=catalogRows();
    if(phraseWordCount>=2){
    for(const row of rows){
      const variantsIn=variants(raw);
      const phraseSim=Math.max(...variantsIn.map(v=>similarity(v,row.name)));
      const inTokens=tokenise(raw), rowTokens=tokenise(row.name);
      let coverage=0;
      if(inTokens.length && rowTokens.length){
        for(const t of inTokens){
          let best=0; for(const r of rowTokens) best=Math.max(best,similarity(t,r));
          coverage+=best;
        }
        coverage/=inTokens.length;
      }
      let score=.62*phraseSim+.38*coverage;
      if(direction && norm(row.direction)===norm(direction))score+=.10;
      if(selectedServices?.some(s=>similarity(s,row.name)>=.78))score+=.04;
      if(score>=.48)add(row.name,'Найдено по смыслу в памяти каталога Master Group',Math.min(.97,score+.12),score);
    }
    }

    // 2) Recognize the two core concepts from the entire request.
    // The spelling of individual words is never emitted as the answer.
    // A lone noun such as «багажник» is a concept query, not an action.
    // Do not let fuzzy matching invent «ремонт»/«подключение» from one word.
    let action=null;
    if(phraseWordCount>=2){
      action=inferAction(raw,[]);
    }else{
      // For a single-token query, accept only an explicit action word/stem.
      // Fuzzy action matching on one noun is too ambiguous and was the source
      // of bad results such as «сантехика» -> «Ремонт сантехники».
      const exact=ACTIONS.find(a=>a.forms.some(f=>norm(f)===norm(raw))||norm(a.ru)===norm(raw));
      if(exact)action={...exact,score:1};
    }
    const object = inferObject(raw,[]);

    // 3) If the user gave a lone concept, open its phrase neighborhood.
    // If an action + object are present, retrieve the matching professional phrase.
    if(object?.id){
      const objectPhrases={
        trunk:['Установка багажника','Монтаж багажника','Ремонт багажника','Замена багажника','Демонтаж багажника','Покраска багажника'],
        bumper:['Установка бампера','Ремонт бампера','Замена бампера','Демонтаж бампера','Покраска бампера'],
        hood:['Установка капота','Ремонт капота','Замена капота','Демонтаж капота'],
        motor:['Установка мотора','Крепление мотора','Ремонт мотора','Замена мотора','Демонтаж мотора','Подключение мотора'],
        engine:['Установка двигателя','Ремонт двигателя','Замена двигателя','Демонтаж двигателя','Подключение двигателя'],
        sink:['Установка раковины','Замена раковины','Подключение раковины'],
        faucet:['Установка смесителя','Замена смесителя','Ремонт смесителя'],
        toilet:['Установка унитаза','Замена унитаза','Ремонт унитаза'],
        camera:['Установка камеры','Замена камеры','Ремонт камеры'],
        recorder:['Настройка видеорегистратора','Установка видеорегистратора'],
        tile:['Укладка плитки','Резка плитки','Затирка швов плитки'],
        root:['Удаление корней'],tree:['Срез деревьев','Удаление деревьев'],
        metal:['Изготовление металлоконструкции','Монтаж металлоконструкции','Сварка металлоконструкций','Покраска металла'],
        cable:['Прокладка кабеля','Монтаж кабеля','Подключение кабеля'],
        plumbing:['Установка сантехники','Демонтаж сантехники','Ремонт сантехники','Подключение сантехники'],
        pipes:['Монтаж труб','Прокладка труб','Замена труб','Ремонт труб','Демонтаж труб'],
        pipe:['Монтаж труб','Прокладка труб','Замена труб','Ремонт труб','Демонтаж труб'],
        roof:['Ремонт крыши','Монтаж крыши','Утепление крыши'],
        wall:['Покраска стен','Шпаклевка стен','Грунтовка стен','Ремонт стен','Штробление стен'],
        sewer:['Монтаж канализации','Прокладка канализации','Ремонт канализации','Штробление канала канализации'],
        constructionWaste:['Вывоз строительного мусора','Погрузка строительного мусора','Удаление строительного мусора']
      };
      const phraseList=objectPhrases[object.id]||[];
      if(action?.id){
        let phrase='';
        try{ phrase=inflectPhrase(action,object); }catch(_){ phrase=''; }
        if(phrase)add(phrase,'Собрано из памяти сочетаний: действие + объект',.96,.94);
        // Retrieve all compatible remembered phrases, keeping the action first.
        for(const phrase2 of phraseList){
          if(action?.ru && new RegExp('^'+action.ru.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(phrase2))
            add(phrase2,'Найдено в памяти профессиональных сочетаний',.92,.88);
        }
      } else {
        for(const phrase of phraseList)add(phrase,'Подобрано из памяти сочетаний для найденного объекта',.92,.88);
      }
    }

    // 4) Special whole-phrase semantic frames that are stronger than a token match.
    const n=inputN;
    if(/штроб(?:авк|овк|ов|лен|ление|ить|ан)?/i.test(n) && /канал(?:изац|иза|изац)/i.test(n))
      add('Штробление канала канализации','Понятно по смыслу всей фразы',.99,.99);
    if(/штроб(?:авк|овк|ов|лен|ление|ить|ан)?/i.test(n) && /стен/i.test(n))
      add('Штробление стен','Понятно по смыслу всей фразы',.99,.99);
    if(/задн|передн/i.test(n) && /багажн|богаж/i.test(n))
      add(/передн/i.test(n)?'Передний багажник':'Задний багажник','Восстановлено по смыслу всей фразы',.98,.97);
    if(/задн|передн/i.test(n) && /бампр|бампер/i.test(n))
      add(/передн/i.test(n)?'Передний бампер':'Задний бампер','Восстановлено по смыслу всей фразы',.98,.97);

    // A lone action word opens the corresponding catalog neighborhood.
    if(phraseWordCount===1 && action?.ru){
      for(const row of rows){
        const a=bestConcepts(row.name,ACTIONS,.72)[0];
        if(a?.id===action.id)add(row.name,'Открыта память услуг по найденному действию',.78,.74);
      }
    }

    return out.sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,10);
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
    tile:'Укладка',laminate:'Укладка',parquet:'Укладка',wallpaper:'Поклейка',pipes:'Монтаж',cable:'Прокладка',plumbing:'Установка',sink:'Установка',toilet:'Установка',faucet:'Установка',camera:'Установка',recorder:'Настройка',socket:'Установка',switch:'Установка',door:'Установка',window:'Установка',metal:'Монтаж',fence:'Монтаж',gate:'Монтаж',tree:'Срез',branch:'Срез',root:'Удаление',grass:'Покос',site:'Очистка',roof:'Ремонт',wall:'Ремонт',ceiling:'Ремонт',floor:'Ремонт',facade:'Утепление',concrete:'Шлифовка',garbage:'Вывоз',equipment:'Настройка',heating:'Ремонт',sewer:'Монтаж',aircon:'Установка',insulation:'Утепление',constructionWaste:'Вывоз',power:'Монтаж',motor:'Монтаж',engine:'Ремонт',leak:'Поиск и устранение',washing:'Подключение'
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
      motor:{install:'Установка мотора',mount:'Монтаж мотора',repair:'Ремонт мотора',replace:'Замена мотора',dismantle:'Демонтаж мотора',connect:'Подключение мотора',cut:'Срез мотора'},
      engine:{install:'Установка двигателя',mount:'Монтаж двигателя',repair:'Ремонт двигателя',replace:'Замена двигателя',dismantle:'Демонтаж двигателя',connect:'Подключение двигателя'},
      generator:{install:'Установка генератора',mount:'Монтаж генератора',repair:'Ремонт генератора',replace:'Замена генератора',dismantle:'Демонтаж генератора',connect:'Подключение генератора'},
      camera:{install:'Установка камеры видеонаблюдения',replace:'Замена камеры видеонаблюдения'},
      recorder:{configure:'Настройка видеорегистратора',install:'Установка видеорегистратора'},
      socket:{install:'Установка розетки',replace:'Замена розетки'},
      switch:{install:'Установка выключателя',replace:'Замена выключателя'},
      door:{install:'Установка двери',dismantle:'Демонтаж двери',replace:'Замена двери'},
      window:{install:'Установка окна',dismantle:'Демонтаж окна',replace:'Замена окна'},
      metal:{fabricate:'Изготовление металлоконструкции',mount:'Монтаж металлоконструкции',weld:'Сварка металлоконструкций',paint:'Покраска металла'},
      quadbike:{install:'Установка квадроцикла',mount:'Монтаж квадроцикла',repair:'Ремонт квадроцикла',dismantle:'Демонтаж квадроцикла'},
      fence:{mount:'Монтаж забора',weld:'Сварка забора',paint:'Покраска забора',repair:'Ремонт забора'},
      gate:{mount:'Монтаж ворот',weld:'Сварка ворот',repair:'Ремонт ворот'},
      tree:{cut:'Срез деревьев',remove:'Удаление деревьев'},
      branch:{cut:'Срез веток',remove:'Удаление веток'},
      root:{remove:'Удаление корней'},
      grass:{mow:'Покос травы'},
      site:{clean:'Очистка участка'},
      roof:{repair:'Ремонт крыши',mount:'Монтаж крыши',insulate:'Утепление крыши'},
      wall:{paint:'Покраска стен',putty:'Шпаклевка стен',prime:'Грунтовка стен',sand:'Шлифовка стен',insulate:'Утепление стен',repair:'Ремонт стен',chase:'Штробление стен'},
      ceiling:{paint:'Покраска потолка',putty:'Шпаклевка потолка',prime:'Грунтовка потолка',sand:'Шлифовка потолка',repair:'Ремонт потолка'},
      floor:{lay:'Укладка пола',repair:'Ремонт пола',sand:'Шлифовка пола'},
      facade:{paint:'Покраска фасада',insulate:'Утепление фасада',repair:'Ремонт фасада'},
      concrete:{sand:'Шлифовка бетона',repair:'Ремонт бетона',paint:'Покраска бетона'},
      garbage:{haul:'Вывоз мусора',load:'Погрузка мусора',clean:'Очистка от мусора',remove:'Удаление мусора'},
      equipment:{configure:'Настройка оборудования',install:'Установка оборудования',repair:'Ремонт оборудования'},
      heating:{repair:'Ремонт системы отопления',install:'Установка системы отопления'},
      sewer:{mount:'Монтаж канализации',route:'Прокладка канализации',repair:'Ремонт канализации',chase:'Штробление канала канализации'},
      aircon:{install:'Установка кондиционера',configure:'Настройка кондиционера',repair:'Ремонт кондиционера'},
      insulation:{insulate:'Утепление',remove:'Удаление утепления'},
      constructionWaste:{haul:'Вывоз строительного мусора',load:'Погрузка строительного мусора',remove:'Удаление строительного мусора'},
      power:{install:'Установка блока питания',replace:'Замена блока питания',mount:'Монтаж блока питания'},
      leak:{repair:'Поиск и устранение протечки'},
      washing:{install:'Установка стиральной машины',connect:'Подключение стиральной машины',repair:'Ремонт стиральной машины'},
      trunk:{install:'Установка багажника',mount:'Монтаж багажника',repair:'Ремонт багажника',replace:'Замена багажника',dismantle:'Демонтаж багажника',paint:'Покраска багажника'},
      bumper:{install:'Установка бампера',repair:'Ремонт бампера',replace:'Замена бампера',dismantle:'Демонтаж бампера',paint:'Покраска бампера'},
      hood:{install:'Установка капота',repair:'Ремонт капота',replace:'Замена капота',dismantle:'Демонтаж капота'},
      headlight:{install:'Установка фары',replace:'Замена фары',repair:'Ремонт фары'},
      mirror:{install:'Установка зеркала',replace:'Замена зеркала',repair:'Ремонт зеркала'},
      wheel:{install:'Установка колеса',replace:'Замена колеса',repair:'Ремонт колеса'},
      brake:{repair:'Ремонт тормоза',replace:'Замена тормоза',dismantle:'Демонтаж тормоза'},
      battery:{install:'Установка аккумулятора',replace:'Замена аккумулятора',repair:'Ремонт аккумулятора'}
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
    {ru:'Штробление',forms:['штробление','штробить','штробовка','штробов','штробавк','штробовк','штробан','штроблен','штроб','chasing','frezare santuri','frezare canale']},
    {ru:'Монтаж',forms:['собрать и установить']}
  ];

  const RU_ACTION_WORDS = new Set([
    'установка','укладка','монтаж','ремонт','демонтаж','замена','покраска','шпаклевка','грунтовка',
    'прокладка','подключение','настройка','сварка','изготовление','срез','удаление','покос','вывоз',
    'погрузка','очистка','шлифовка','утепление','крепление','фиксация','сверление','герметизация',
    'диагностика','обслуживание','регулировка','сборка','разработка','бурение','штукатурка',
    'гидроизоляция','звукоизоляция','штробление'
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
      [/^(?:при)?крепл/i,'Крепление'],[/^фикс/i,'Фиксация'],[/^уклад|^улож|^полож/i,'Укладка'],[/^герметиз/i,'Герметизация'],[/^диагност/i,'Диагностика'],[/^обслуж/i,'Обслуживание'],
      [/^регулир/i,'Регулировка'],[/^сверл/i,'Сверление'],[/^бур/i,'Бурение'],[/^штукатур/i,'Штукатурка'],[/^гидроизоляц/i,'Гидроизоляция'],
      [/^звукоизоляц/i,'Звукоизоляция'],[/^штроб/i,'Штробление'],[/^монта/i,'Монтаж'],[/^устан/i,'Установка'],[/^ремонт/i,'Ремонт'],[/^демонт/i,'Демонтаж'],
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
      motor:'мотор',motora:'мотора',motorul:'мотор',motore:'мотор',motorele:'моторы',engine:'двигатель',masina:'машина',masinae:'машины',masinii:'машины',generator:'генератор',generatorul:'генератора',
      pompa:'насос',pompei:'насоса',pompa:'насос',suport:'крепление',suportul:'крепления',suportare:'опора',prindere:'крепление',fixare:'фиксация',
      surub:'винт',suruburi:'винты',piulita:'гайка',piulite:'гайки',cutie:'коробка',cutia:'коробки',motorina:'дизель',benzina:'бензин',
      ustnovka:'установка',ustanovka:'установка',ustanoa:'установка',sanitare:'сантехника',scurgere:'протечка',iarba:'трава',teren:'участок',deseuri:'отходы',constructie:'конструкция',
      lemn:'дерево',metal:'металл',fier:'железо',otel:'сталь',aluminiu:'алюминий',cauciuc:'резина',sticla:'стекло',usa:'дверь',usi:'двери',
      geam:'окно',geamuri:'окна',perete:'стена',pereti:'стены',podea:'пол',tavan:'потолок',acoperis:'крыша',gard:'забор',poarta:'ворота',
      roata:'колесо',roti:'колёса',frana:'тормоз',frane:'тормоза',ulei:'масло',filtru:'фильтр',baterie:'аккумулятор',baterii:'аккумуляторы',
      cablu:'кабель',cabluul:'кабеля',teava:'труба',tevi:'трубы',apa:'вода',kafela:'кафеля',korney:'корней',kafela:'кафеля',registratora:'видеорегистратора',registrator:'видеорегистратор',copaci:'деревья',taere:'срез',taiere:'срез',pompaapa:'водяной насос','motor electric':'электродвигатель',kreplenie:'крепление',krepl:'крепление',fixarea:'фиксация',fixare:'фиксация',prindere:'крепление',
      acoperisului:'крыши',peretele:'стены',tavanul:'потолка'
    };
    const actions={schimbare:'замена',schimbarea:'замена',prokladka:'прокладка',pozare:'прокладка',instalare:'установка',montare:'монтаж',demontare:'демонтаж',evacuare:'вывоз',cosire:'покос',udalenie:'удаление',eliminare:'удаление',nastroyka:'настройка',fixare:'фиксация',prindere:'крепление',taere:'срез',taiere:'срез',proverka:'проверка'};
    return known[n]||actions[n]||null;
  }

  function normalizeLooseInput(text){
    const s=stripPunct(text);
    const phraseMap={
      'fixare motor':'фиксация мотор','prindere motor':'крепление мотор','schimbare teava apa':'замена труб','schimbare teava':'замена труб',
      'prokladka cablu':'прокладка кабель','nastroyka registratora':'настройка видеорегистратор','udalenie korney':'удаление корней',
      'taere copaci':'срез деревьев','evacuare deseuri constructie':'вывоз строительный мусор','scurgere apa':'поиск и устранение протечки',
      'ukladka kafela':'укладка кафеля','montare faianta baie':'укладка плитки в ванной комнате','demontare sanitare':'демонтаж сантехники',
      'cosire iarba teren':'покос травы на участке','reparare teava':'ремонт труб'
    };
    const exactPhrase=phraseMap[norm(s)];
    if(exactPhrase)return exactPhrase;
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
    const known={дырк:'дырка',двер:'дверь',окн:'окно',стен:'стена',потол:'потолок',труб:'труба',кабел:'кабель',раковн:'раковина',мотор:'мотор',генератор:'генератор',двигател:'двигатель',насос:'насос',филтр:'фильтр',моторн:'мотор',сантех:'сантехника',богашек:'багажник',богажник:'багажник',багажн:'багажник',багаж:'багажник',бампр:'бампер',бампе:'бампер',акумулятор:'аккумулятор',акумлятор:'аккумулятор',машын:'машина'};
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
          const recognized=bestConcepts(ntext,OBJECTS,.58)[0];
          if(recognized){
            objectPhrase=recognized.cases||recognized.base;
          }else{
            objectPhrase=toGenitiveLoose(obj[0]);
          }
        }
        return cleanupGenerated(`${action.ru} ${objectPhrase}`);
      }
      return action.ru;
    }
    // No recognizable action: repair known noisy/phonetic nouns even when
    // there is no explicit action word. This prevents an obvious typo such
    // as "Задний богашек" from being reported as already correct.
    const repaired=toks.map(t=>normalizeUnknownNoun(t));
    return cleanupGenerated(repaired.join(' '));
  }

  function cleanupGenerated(text){
    let s=capital(stripPunct(text));
    s=s.replace(/^(услуга|работа|название услуги)\s*[:—-]?\s*/i,'');
    s=s.replace(/\s+/g,' ').trim();
    // Canonicalize a few high-value professional constructions after AI output.
    // The remote model may understand the meaning but occasionally choose an
    // unnatural word order such as "Сборка разборки квадроцикла". These rules
    // change grammar/order only; they do not invent a new object or service.
    s=s.replace(/^(?:сборка\s+(?:разборки|разборка|разбор)|разборка\s+(?:сборки|сборка|сбор)|сборка\s+и\s+разборка|разборка\s+и\s+сборка)\s+(.+)$/i,'Разборка и сборка $1');
    s=s.replace(/^(?:задняя)\s+(багажник|бампер|капот|мотор|двигатель|генератор|насос|фильтр|компрессор|кабель|провод)$/i,'Задний $1');
    s=s.replace(/^(?:передняя)\s+(багажник|бампер|капот|мотор|двигатель|генератор|насос|фильтр|компрессор|кабель|провод)$/i,'Передний $1');
    s=s.replace(/^(?:левая|правая)\s+(багажник|бампер|капот|мотор|двигатель|генератор|насос|фильтр|компрессор|кабель|провод)$/i,(m,a)=>`${/^левая/i.test(m)?'Левая':'Правая'} ${a}`);
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

  function contextualServicePhrase(text){
    let s=clean(normalizeLooseInput(text)||text,MAX_INPUT);
    if(!s)return '';
    const direct=[
      [/(?:^|\s)(?:креплние|креплн|крпление|крепл|крепление)\s+(?:мотра|мтора|мтор|мотро|мотор)\s+к\s+(?:рам|рма|раме|рама)(?:$|\s)/i,'Крепление мотора к раме'],
      [/(?:^|\s)(?:креплние|креплн|крпление|крепл|крепление)\s+(?:мотра|мтора|мтор|мотро|мотор)(?:$|\s)/i,'Крепление мотора'],
      [/(?:^|\s)(?:устанвка|устновка|установка)\s+(?:раковн|раковна|раковина)(?:$|\s)/i,'Установка раковины'],
      [/(?:^|\s)(?:фиксация|fixare)\s+(?:мотор|мотора)(?:$|\s)/i,'Фиксация мотора'],
      [/(?:^|\s)(?:сбрка|сборк|сборка)\s+(?:разборки|разборка|разбор)\s+(?:квадроцикл|квадроцикла|квадроциклa)(?:$|\s)/i,'Разборка и сборка квадроцикла'],
      [/(?:^|\s)(?:разборка|разборки|разбор)\s+(?:и\s+)?(?:сборка|сборки|сбор)\s+(?:квадроцикл|квадроцикла)(?:$|\s)/i,'Разборка и сборка квадроцикла'],
      [/(?:^|\s)(?:сбрка|сборк|сборка)\s+(?:двигател|двгатель|двигатель)(?:$|\s)/i,'Сборка двигателя'],
      [/(?:^|\s)(?:настройка|настойка|настроыка)\s+(?:регистратора|регистратор)(?:$|\s)/i,'Настройка видеорегистратора'],
      [/(?:^|\s)(?:уклдк|укладк|укладка)\s+(?:кафла|кафел|кафель)\s+(?:ваной|ваннй|ванная|ванной)(?:$|\s)/i,'Укладка кафеля в ванной комнате'],
      [/(?:^|\s)(?:уклдк|укладк|укладка)\s+(?:плитк|плитка|плитки)\s+(?:ваной|ваннй|ванная|ванной)(?:$|\s)/i,'Укладка плитки в ванной комнате'],
      [/(?:^|\s)(?:убрть|убарт|убрать)\s+(?:корни|корен|корнеи)\s+(?:дерево|дерева|деревьев|дерев)(?:$|\s)/i,'Удаление корней дерева'],
      [/(?:^|\s)(?:покраска|покрас)\s+(?:стена|стен|стены)\s+(?:кухня|кухне)(?:$|\s)/i,'Покраска стен на кухне'],
      [/(?:^|\s)(?:надо|нужно|нада)?\s*(?:покрас|покраска)\s+(?:стена|стен|стэна|стэн)(?:$|\s)/i,'Покраска стен'],
      [/(?:^|\s)(?:плитку|плитк|кафель|кафла)\s+(?:в|во)\s+(?:ванной|ваной|ванна|ванной\s+комнате)(?:$|\s)/i,'Укладка плитки в ванной комнате'],
      [/(?:^|\s)(?:срез|срз)\s+(?:дрв|дерев|дерево|деревья|деревьев)(?:$|\s)/i,'Срез деревьев'],
      [/(?:^|\s)(?:монтж|монта|монтаж)\s+(?:метало\s+конструкции|металлоконструкция|металлоконструкции)(?:$|\s)/i,'Монтаж металлоконструкции'],
      [/(?:^|\s)(?:сверл\s+дырк|сверлить\s+дырк|сверление\s+отверст)\s+(?:бет|бетон|бетоне)(?:$|\s)/i,'Сверление отверстия в бетоне'],
      [/(?:^|\s)(?:поиск|найти)\s+(?:протеч|протечки|протечку)\s+(?:вода|воды|вод)(?:$|\s)/i,'Поиск и устранение протечки воды'],
      [/(?:^|\s)(?:покос|кос)\s+(?:трава|травы|трав)\s+(?:на\s+)?(?:участок|участке|участка)(?:$|\s)/i,'Покос травы на участке'],
      [/(?:^|\s)(?:вывоз|вывез|вывезти)\s+(?:строй\s+)?(?:мусор|мусора)(?:$|\s)/i,'Вывоз строительного мусора'],
      [/(?:^|\s)плитку\s+(?:в\s+)?(?:ваной|ванной)(?:$|\s)/i,'Укладка плитки в ванной комнате'],
      [/(?:^|\s)(?:срез|среза?)\s+дрв(?:$|\s)/i,'Срез деревьев'],
      [/(?:^|\s)удаление\s+корнеи(?:$|\s)/i,'Удаление корней'],
      [/(?:^|\s)удаление\s+корней(?:$|\s)/i,'Удаление корней'],
      [/(?:^|\s)настройка\s+регистратора(?:$|\s)/i,'Настройка видеорегистратора'],
      [/(?:^|\s)(?:schimbare|замена)\s+труб(?:$|\s)/i,'Замена труб'],
      [/(?:^|\s)(?:prokladka|прокладка)\s+кабель(?:$|\s)/i,'Прокладка кабеля'],
      [/(?:^|\s)(?:вывоз|evacuare)\s+строительный\s+мусор(?:$|\s)/i,'Вывоз строительного мусора'],
      [/(?:^|\s)(?:поиск\s+и\s+устранение\s+протечк|scurgere\s+apa)(?:$|\s)/i,'Поиск и устранение протечки'],
      [/(?:^|\s)(?:убрать|удаление)\s+корни(?:$|\s)/i,'Удаление корней']
    ];
    for(const [re,out] of direct)if(re.test(s))return out;
    const frames=[
      [/(?:^|\s)(установка|монтаж|сборка|ремонт|замена|подключение|настройка)\s+(мотор|двигатель|раковина|смеситель|унитаз|генератор|насос|фильтр|кондиционер|компрессор)(?=$|\s)/i,(_,a,n)=>`${a} ${{мотор:'мотора',двигатель:'двигателя',раковина:'раковины',смеситель:'смесителя',унитаз:'унитаза',генератор:'генератора',насос:'насоса',фильтр:'фильтра',кондиционер:'кондиционера',компрессор:'компрессора'}[n.toLowerCase()]||n}`],
      [/(?:^|\s)(покраска|шпаклевка|грунтовка|ремонт|шлифовка|утепление)\s+(стена|стены|стен)(?=$|\s)/i,(_,a)=>`${a} стен`],
      [/(?:^|\s)(удаление|срез)\s+(корни|корень|ветка|ветки|дерево|деревья)(?=$|\s)/i,(_,a,n)=>`${a} ${{корни:'корней',корень:'корня',ветка:'веток',ветки:'веток',дерево:'дерева',деревья:'деревьев'}[n.toLowerCase()]||n}`],
      [/(?:^|\s)(укладка|монтаж|ремонт|замена)\s+(плитка|кафель|дверь|окно|крыша|рама|труба|кабель)(?=$|\s)/i,(_,a,n)=>`${a} ${{плитка:'плитки',кафель:'кафеля',дверь:'двери',окно:'окна',крыша:'крыши',рама:'рамы',труба:'трубы',кабель:'кабеля'}[n.toLowerCase()]||n}`]
    ];
    for(const [re,repl] of frames){if(re.test(s))s=s.replace(re,repl);}
    const rel=[
      [/(^|\s)к\s+рама(?=$|\s)/gi,'$1к раме'],[/((^|\s)к\s+)рам(?=$|\s)/gi,'$1раме'],[/((^|\s)к\s+)стен(?=$|\s)/gi,'$1стене'],[/((^|\s)к\s+)стена(?=$|\s)/gi,'$1стене'],
      [/(^|\s)к\s+потолок(?=$|\s)/gi,'$1к потолку'],[/((^|\s)к\s+)мотор(?=$|\s)/gi,'$1мотору'],[/((^|\s)к\s+)двигатель(?=$|\s)/gi,'$1двигателю'],
      [/(^|\s)к\s+дверь(?=$|\s)/gi,'$1к двери'],[/(^|\s)к\s+окно(?=$|\s)/gi,'$1к окну'],[/(^|\s)к\s+труба(?=$|\s)/gi,'$1к трубе'],
      [/(^|\s)в\s+ванная(?=$|\s)/gi,'$1в ванной комнате'],[/(^|\s)в\s+ваной(?=$|\s)/gi,'$1в ванной комнате'],[/(^|\s)в\s+кухня(?=$|\s)/gi,'$1на кухне'],[/(^|\s)в\s+кухне(?=$|\s)/gi,'$1на кухне'],
      [/(^|\s)на\s+стена(?=$|\s)/gi,'$1на стене'],[/(^|\s)на\s+стен(?=$|\s)/gi,'$1на стене'],[/(^|\s)на\s+потолок(?=$|\s)/gi,'$1на потолке'],[/(^|\s)на\s+рама(?=$|\s)/gi,'$1на раме'],[/(^|\s)в\s+квартира(?=$|\s)/gi,'$1в квартире'],
      [/(^|\s)на\s+крыша(?=$|\s)/gi,'$1на крыше']
    ];
    for(const [re,to] of rel)s=s.replace(re,to);
    return cleanupGenerated(s);
  }

  function fallback(text,direction,selectedServices){
    const semantic=semanticBrainPhrase(text,direction,selectedServices);
    const generated=buildLocalGeneration(text,direction,selectedServices);
    const catalog=semanticCatalogCandidates(text,direction,selectedServices);
    const suggestions=[];
    const contextual=contextualServicePhrase(text);
    if(contextual && norm(contextual)!==norm(text))suggestions.push({text:contextual,note:'Контекстное восстановление окончания и смысла',confidence:.95});
    if(semantic && norm(semantic.text)!==norm(text) && !suggestions.some(x=>norm(x.text)===norm(semantic.text)))suggestions.push(semantic);
    if(generated.text && !suggestions.some(x=>norm(x.text)===norm(generated.text)))suggestions.push({text:generated.text,note:generated.note,confidence:generated.confidence});
    for(const row of catalog){
      if(!suggestions.some(x=>norm(x.text)===norm(row.name)))suggestions.push({text:cleanupGenerated(row.name),note:'Подходит к каталогу Master Group',confidence:Math.min(.96,row.score)});
      if(suggestions.length>=3)break;
    }
    const cleaned=cleanupGenerated(text);
    if(cleaned && !suggestions.some(x=>norm(x.text)===norm(cleaned))){
      suggestions.push({text:cleaned,note:'Сохранён смысл исходного текста',confidence:.38});
    }
    // Never show the original input or a one-word fragment as an alternative
    // to a multi-word request. Alternatives must add useful information.
    const inputWordCount=tokenise(text).length;
    const filtered=suggestions.filter(x=>{
      const t=cleanupGenerated(x?.text||'');
      if(!t || norm(t)===norm(text))return false;
      if(inputWordCount>=2 && tokenise(t).length<2)return false;
      if(/\b(задняя|передняя|левая|правая|верхняя|нижняя)\s+(багажник|бампер|капот|тормоз|двигатель|мотор|генератор|насос|фильтр|компрессор|кабель|провод)\b/i.test(t))return false;
      if(/^(?:установить|поставить|сделать|починить|заменить|прикрепить|закрепить)\b/i.test(t))return false;
      if(/\bметалл(?:о)?\s+конструк/i.test(t) && !/металлоконструк/i.test(t))return false;
      return true;
    }).slice(0,3);
    const corrected=filtered[0]?.text||cleaned;
    return {corrected,suggestions:filtered,changed:norm(corrected)!==norm(text),engine:'master-local-ai-open-v4',offline:true,confidence:filtered[0]?.confidence||.35};
  }

  // OpenRouter remote brain. The key is stored only in this browser's localStorage;
  // it is NEVER written into the public GitHub Pages source. For a personal PWA this
  // avoids Firebase Functions/Blaze costs while still moving the heavy reasoning off
  // the iPhone. The provider is forced to the free router so paid models are not
  // selected accidentally.
  const OPENROUTER_ENDPOINT='https://openrouter.ai/api/v1/chat/completions';
  const OPENROUTER_MODEL='google/gemma-4-26b-a4b-it:free';
  const OPENROUTER_KEY_STORAGE='mg_openrouter_api_key_v1';
  let remoteBrainState='not-configured';
  let remoteBrainPromise=null;

  function getOpenRouterKey(){
    try{return String(localStorage.getItem(OPENROUTER_KEY_STORAGE)||'').trim();}catch(_){return '';}
  }
  function setOpenRouterKey(key){
    const k=String(key||'').trim();
    if(k){localStorage.setItem(OPENROUTER_KEY_STORAGE,k);remoteBrainState='ready';}
    else{localStorage.removeItem(OPENROUTER_KEY_STORAGE);remoteBrainState='not-configured';}
    clearCache();
    return !!k;
  }
  function hasOpenRouterKey(){return /^sk-or-v1-[A-Za-z0-9_-]+$/.test(getOpenRouterKey());}

  function remoteSuggestionCompatible(candidate,input){
    const c=clean(candidate,180); if(!c)return false;
    const inWords=tokenise(input), cWords=tokenise(c);
    if(inWords.length>=2 && cWords.length<2)return false;
    const inObject=inferObject(input,[]), cObject=inferObject(c,[]);
    if(inObject?.id && cObject?.id && inObject.id!==cObject.id)return false;
    const inAction=inferAction(input,[]), cAction=inferAction(c,[]);
    // When the user clearly supplied an action, the AI is not allowed to
    // silently replace it with a different service type (e.g. «крепление» ->
    // «утепление»). If the action is absent/ambiguous, the AI may choose one.
    if(inAction?.id && cAction?.id && inAction.id!==cAction.id)return false;
    return true;
  }

  function parseRemoteSuggestions(content,input){
    let raw=String(content||'').trim();
    raw=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    let data=null;
    try{data=JSON.parse(raw);}catch(_){
      const m=raw.match(/\{[\s\S]*\}/); if(m)try{data=JSON.parse(m[0]);}catch(__){}
    }
    let rows=Array.isArray(data?.suggestions)?data.suggestions:[];
    if(!rows.length && typeof data?.corrected==='string')rows=[{text:data.corrected,note:'OpenRouter AI',confidence:.9}];
    if(!rows.length){
      const lines=raw.split(/\r?\n/).map(x=>x.replace(/^\s*[-*•\d.)]+\s*/,'').trim()).filter(Boolean);
      rows=lines.slice(0,5).map(x=>({text:x,note:'OpenRouter AI',confidence:.82}));
    }
    const out=[]; const seen=new Set();
    for(const row of rows){
      const text=cleanupGenerated(row?.text||row?.name||'');
      if(!text||seen.has(norm(text))||text.length>180)continue;
      const same=norm(text)===norm(input);
      // A correct multi-word input may legitimately be returned unchanged. A
      // lone noun must still produce service phrases rather than «confirming» it.
      if(same && (tokenise(input).length<2 || hasSuspiciousToken(input)))continue;
      if(!remoteSuggestionCompatible(text,input))continue;
      seen.add(norm(text));
      out.push({text,note:String(row?.note|| (same?'AI подтвердил введённую формулировку':'Понято AI по смыслу всей фразы')),confidence:Math.max(.45,Math.min(.99,Number(row?.confidence)||.88))});
      if(out.length>=5)break;
    }
    return out;
  }

  async function remoteBrainSuggest(text,direction,selectedServices,memoryHints=[]){
    let key=getOpenRouterKey();
    if(!key && isBrowserRuntime() && typeof window.prompt==='function'){
      const entered=window.prompt('OpenRouter API-ключ\n\nВставьте ключ sk-or-v1-… . Он сохранится только на этом устройстве и не попадёт в код GitHub Pages.');
      if(entered){setOpenRouterKey(entered);key=getOpenRouterKey();}
    }
    if(!key){remoteBrainState='not-configured';return null;}
    if(remoteBrainPromise)return remoteBrainPromise;

    const inputAction=inferAction(text,[]), inputObject=inferObject(text,[]);
    // Only send memory hints that agree with the concepts in the user's phrase.
    // Direction/catalog context is deliberately weaker than the actual text.
    const hints=memoryHints.slice(0,10).map(x=>cleanupGenerated(x?.text||'')).filter(Boolean).filter(h=>{
      const ho=inferObject(h,[]), ha=inferAction(h,[]);
      if(inputObject?.id && ho?.id && inputObject.id!==ho.id)return false;
      if(inputAction?.id && ha?.id && inputAction.id!==ha.id)return false;
      return true;
    }).slice(0,5);

    const system=[
      'Ты — главный языковой интеллект приложения Master Group.',
      'Понимай ВСЮ фразу целиком. Не исправляй слова механически по одному.',
      'Пользователь может писать с сильными опечатками, пропусками букв, на русском, румынском, смешанно или транслитом.',
      'Сначала восстанови намерение, затем сформируй профессиональное название услуги на русском.',
      'КРИТИЧЕСКОЕ ПРАВИЛО: если во входе уже явно указан вид работы, например «крепление», «монтаж», «ремонт», «замена», «утепление», НЕ меняй его на другой вид работы.',
      'Если указан объект, например «мотор», «багажник», «раковина», сохраняй именно этот объект. Не подменяй его другим объектом.',
      'Направление каталога — только слабый контекст. Оно НИКОГДА не может переопределять смысл исходной фразы.',
      'Если исходная фраза из двух и более слов уже грамматически и профессионально нормальна, верни её без изменения.',
      'Если введён только один объект, предложи 3–5 реальных услуг с этим объектом: например «багажник» → «Установка багажника», «Монтаж багажника», «Ремонт багажника».',
      'Для парных операций используй естественный профессиональный порядок: «разборка и сборка квадроцикла», а не «сборка разборки квадроцикла» и не «сборка разборка квадроцикла».',
      'Если во входе есть одновременно «сборка» и «разборка», сохрани оба действия и соедини их через «и».',
      'Не придумывай детали, цены, количество, материалы или факты.',
      'Верни ТОЛЬКО JSON. Никаких рассуждений, Markdown, пояснений или текста до/после JSON.'
    ].join('\n');
    const user=[
      `Направление: ${clean(direction,MAX_DIRECTION)||'не указано'}`,
      `Выбранные услуги: ${uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS).join('; ')||'нет'}`,
      `Справочная память (только если совпадает с объектом/действием): ${hints.join(' | ')||'нет'}`,
      `Исходный текст пользователя: ${clean(text)}`,
      'Верни JSON вида: {"suggestions":[{"text":"...","note":"...","confidence":0.0}]}.'
    ].join('\n');

    remoteBrainPromise=(async()=>{
      remoteBrainState='loading';
      const controller=typeof AbortController!=='undefined'?new AbortController():null;
      const timer=controller?setTimeout(()=>controller.abort(),6500):null;
      try{
        const res=await fetch(OPENROUTER_ENDPOINT,{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-Title':'Master Group'},signal:controller?.signal,body:JSON.stringify({
          model:OPENROUTER_MODEL,
          messages:[{role:'system',content:system},{role:'user',content:user}],
          temperature:0,
          max_tokens:120,
          seed:7,
          reasoning:{enabled:false},
          response_format:{type:'json_schema',json_schema:{name:'master_group_service_suggestions',strict:true,schema:{type:'object',properties:{suggestions:{type:'array',minItems:1,maxItems:5,items:{type:'object',properties:{text:{type:'string'},note:{type:'string'},confidence:{type:'number'}},required:['text','note','confidence'],additionalProperties:false}}},required:['suggestions'],additionalProperties:false}}},
          provider:{sort:'throughput',allow_fallbacks:true}
        })});
        if(!res.ok){
          let detail='';try{detail=(await res.json())?.error?.message||'';}catch(_){detail=await res.text().catch(()=> '');}
          const e=new Error(detail||('OpenRouter HTTP '+res.status));e.code='OPENROUTER_HTTP_'+res.status;throw e;
        }
        const data=await res.json();
        const content=data?.choices?.[0]?.message?.content||'';
        const suggestions=parseRemoteSuggestions(content,text);
        if(!suggestions.length)throw new Error('OpenRouter returned no compatible suggestions');
        remoteBrainState='ready';
        return {corrected:suggestions[0].text,suggestions,changed:norm(suggestions[0].text)!==norm(text),engine:'openrouter-gemma4-free-brain',offline:false,remoteInference:true,remoteApi:true,remoteHost:true,model:OPENROUTER_MODEL,confidence:suggestions[0].confidence};
      }catch(err){
        remoteBrainState=hasOpenRouterKey()?'error':'not-configured';
        console.warn('Master Group OpenRouter:',err);
        return null;
      }finally{
        if(timer)clearTimeout(timer);
        remoteBrainPromise=null;
      }
    })();
    return remoteBrainPromise;
  }

  async function testOpenRouter(){
    const result=await remoteBrainSuggest('креплние мотра к рам','',[],[]);
    return !!result?.suggestions?.length;
  }

  async function dictionarySuggest(text){
    try{
      const api=typeof window!=='undefined'?window.MG_DICTIONARY_10M:null;
      if(!api||typeof api.suggest!=='function')return null;
      return await api.suggest(text);
    }catch(err){
      console.warn('Master Group 10m dictionary unavailable',err);
      return null;
    }
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

  async function localLlmSuggest(text,direction,selectedServices,retrievedText=text){
    const generator=await ensureLocalLlm();
    if(!generator)return null;
    const system=`Ты — языковой мозг приложения Master Group.
Работай как человек: сначала пойми, что пользователь хотел сказать, затем исправь слова и грамматику всей фразы.
Пользователь может писать с пропущенными буквами, переставленными буквами, неправильными окончаниями, на слух, по-румынски, латиницей или смешанно.
Слова из внешней памяти — это только кандидаты, а НЕ готовые ответы. Полная фраза может отсутствовать в базе.
Согласуй род, число и падеж. Например: «задняя багажник» → «Задний багажник», «креплние мотра к рам» → «Крепление мотора к раме».
Для поля услуги используй короткую профессиональную формулировку и не добавляй фактов, которых нет во вводе.
Верни только одну итоговую фразу на русском, без объяснений.
Примеры: «заднй бампр» → «Задний бампер»; «устновит раковн» → «Установка раковины»; «мне нада устновит мотор на машыну» → «Установка мотора на машину».`;
    const user=`Направление: ${clean(direction,MAX_DIRECTION)||'не указано'}\nПредварительная смысловая интерпретация: ${clean(semanticBrainPhrase(text,direction,selectedServices)?.text)||'нет'}\nУже выбранные услуги: ${uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS).join('; ')||'нет'}\nИсходный текст пользователя: ${clean(text)}\nРезультат предварительного поиска во внешней памяти словаря: ${clean(retrievedText)||'нет данных'}\n\nВерни только правильное название услуги на русском.`;
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

  async function localLlmRepair(text,direction,selectedServices){
    const generator=await ensureLocalLlm();
    if(!generator)return null;
    const system=`Ты выполняешь второй, строгий этап проверки русского текста услуги. Текст может содержать неизвестные слова и сильные опечатки. Не используй принцип "слова нет в словаре = ошибка" и не придумывай факты. Сравни звучание, соседние буквы, типичные русские окончания и смысл всей фразы. Восстанови наиболее вероятное правильное название услуги. Если фраза уже правильная, верни её без изменений. Верни только одну фразу на русском, без объяснений.`;
    const user=`Направление: ${clean(direction,MAX_DIRECTION)||'не указано'}\nИсходный текст: ${clean(text)}\nПроверь особенно слова с пропущенными, лишними, переставленными или заменёнными буквами. Верни исправленный вариант либо исходный текст, если он действительно без ошибок.`;
    try{
      const messages=[{role:'system',content:system},{role:'user',content:user}];
      let output;
      const tokenizer=generator.tokenizer;
      if(tokenizer&&typeof tokenizer.apply_chat_template==='function'){
        const prompt=await tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true,enable_thinking:false});
        output=await generator(prompt,{max_new_tokens:48,do_sample:false,return_full_text:false});
      }else output=await generator(messages,{max_new_tokens:48,do_sample:false});
      const corrected=extractGeneratedText(output);
      if(!corrected||corrected.length<2||corrected.length>180)return null;
      return {corrected,suggestions:[{text:corrected,note:'Строгая проверка орфографии и смысла Qwen3',confidence:.94}],changed:norm(corrected)!==norm(text),engine:'local-llm-qwen3-0.6b',offline:true,modelCached:true,remoteInference:false,confidence:.94};
    }catch(err){console.warn('Master Group Qwen3 repair failed',err);return null;}
  }

  function hasSuspiciousToken(text){
    const toks=tokenise(text); if(!toks.length)return false;
    const forms=[...ACTIONS,...OBJECTS,...OPEN_ACTIONS].flatMap(x=>x.forms||[]).map(norm).filter(x=>x.length>2);
    const common=new Set(['и','в','во','на','по','для','с','со','из','у','к','от','до','за','под','над','без','не','все','это','как','или','а','для','внутри','наружный','наружная','задний','задняя','передний','передняя','правый','левый','новый','старая','старый']);
    return toks.some(t=>t.length>=4 && !common.has(t) && !forms.includes(t) && bestForm(t,forms).score<.62);
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
    const input=clean(text);if(!input)return {corrected:'',suggestions:[],changed:false,engine:'master-local-ai',offline:true,confidence:1};
    const services=uniq(selectedServices).slice(0,MAX_CONTEXT_ITEMS);const key=JSON.stringify({input,d:clean(direction,MAX_DIRECTION),s:services});
    if(CACHE.has(key))return CACHE.get(key);

    // ONLINE BRAIN FIRST: the entire phrase goes to OpenRouter before any
    // token-by-token correction. Local memory is supporting evidence only.
    const memorySuggestions=memoryPhraseCandidates(input,direction,services);
    const remote=await remoteBrainSuggest(input,direction,services,memorySuggestions);
    if(remote?.suggestions?.length){
      const result={...remote,dictionaryUsed:false,dictionaryEntries:10000000,dictionaryLoadedShards:[],uncertain:false};
      CACHE.set(key,result);if(CACHE.size>MAX_CACHE)CACHE.delete(CACHE.keys().next().value);
      return result;
    }

    // If OpenRouter is unavailable, keep the existing local semantic fallback.
    // This is a safety net only; normal operation uses the remote brain above.

    // WHOLE-TEXT semantic retrieval is the primary stage. The 10M word memory
    // supports recognition, but is not allowed to manufacture the visible answer
    // by correcting one token at a time.
    const dict=await dictionarySuggest(input); // supporting evidence only
    const retrievedText=memorySuggestions.slice(0,8).map(x=>x.text).join(' | ') || input;
    const retrievalSuggestions=memorySuggestions;

    // Local deterministic intelligence receives the ORIGINAL sentence. It may
    // interpret it, but it must never turn a per-word correction into the final UI
    // suggestion when whole-phrase memory already found a semantic candidate.
    const localInput=input;
    const local=fallback(localInput,direction,services);
    const combined=[];
    const isQualitySuggestion=(t)=>{
      const x=cleanupGenerated(t); if(!x||norm(x)===norm(input))return false;
      const words=tokenise(x); const inputWords=tokenise(input);
      if(inputWords.length>=2 && words.length<2)return false;
      // A single noun is a query for phrase memory, not a request to turn it
      // into an isolated genitive/inflected fragment. Return useful service
      // combinations instead.
      if(inputWords.length===1 && words.length<2)return false;
      if(/^\s*(?:установить|поставить|сделать|починить|заменить|прикрепить|закрепить|смонтировать|удалить|убрать|снять)\b/i.test(x))return false;
      if(/\bметалл(?:о)?\s+конструк/i.test(x)&&!/металлоконструк/i.test(x))return false;
      if(/\b(задняя|передняя|левая|правая|верхняя|нижняя)\s+(багажник|бампер|капот|тормоз|двигатель|мотор|генератор|насос|фильтр|компрессор|кабель|провод)\b/i.test(x))return false;
      // Main-object relevance: once the request has a recognizable object,
      // unrelated candidates are not allowed through (e.g. «раковина» must
      // never surface «Установка камеры» just because the action is «Установка»).
      const requestObject=inferObject(input,[]);
      if(requestObject?.id){
        const candidateObjects=bestConcepts(x,OBJECTS,.62);
        if(candidateObjects.length && !candidateObjects.some(o=>o.id===requestObject.id)){
          const canonicalForms=(requestObject.forms||[]).map(norm);
          if(!canonicalForms.some(f=>f && norm(x).includes(f)))return false;
        }
      }
      // Do not show a candidate that simply copies a clearly malformed token
      // from the request while claiming to be a correction.
      const src=inputWords; const dst=tokenise(x);
      for(const bad of src){
        if(bad.length<5)continue;
        const still=dst.includes(bad);
        if(still && !Object.values(COMMON_NOUNS).some(v=>v.forms.some(f=>norm(f)===norm(bad))) && !/^(?:крепление|установка|монтаж|ремонт|замена|покраска|укладка|удаление|демонтаж|сварка|изготовление)$/i.test(bad))return false;
      }
      return true;
    };
    const addCombined=(row)=>{if(!row?.text)return;const t=cleanupGenerated(row.text);if(!isQualitySuggestion(t))return;if(combined.some(x=>norm(x.text)===norm(t)))return;combined.push({...row,text:t});};
    // Phrase memory first. Deterministic/local model can add candidates only after it.
    for(const row of memorySuggestions)addCombined(row);
    if(local?.suggestions)for(const row of local.suggestions)addCombined(row);
    // Dictionary corrections remain hidden retrieval evidence; never surface them
    // as standalone suggestions for multi-word input.
    if(!combined.length && tokenise(input).length===1 && dict?.suggestions?.length){
      // A lone ordinary word is the one case where the 10M spelling memory may
      // return a word correction directly. Service concepts still use phrase memory.
      const wordRows=dict.suggestions
        .map(row=>({...row,text:cleanupGenerated(row.text)}))
        .filter(row=>row.text && norm(row.text)!==norm(input))
        .filter(row=>tokenise(row.text).length===1)
        .slice(0,3);
      for(const row of wordRows){
        combined.push({...row,note:row.note||'Исправлено по внешней памяти словаря 10 млн'});
      }
    }
    const localResult={...(local||{}),
      corrected:combined[0]?.text||clean(retrievedText),
      suggestions:combined.slice(0,5),
      changed:norm(combined[0]?.text||retrievedText)!==norm(input),
      engine:dict?.changed?'master-ai-with-10m-memory':(local?.engine||'master-local-ai'),
      offline:true,
      dictionaryUsed:!!dict,
      dictionaryEntries:10000000,
      dictionaryLoadedShards:dict?.loadedShards||[],
      confidence:combined[0]?.confidence||dict?.confidence||local?.confidence||.45
    };

    // Qwen3 is reserved for cases where retrieval + deterministic context are not
    // enough, or where the original input still contains suspicious tokens.
    let llm=null;
    const suspicious=hasSuspiciousToken(input);
    const semanticCandidate=semanticBrainPhrase(input,direction,services);
    const semanticStrong=!!semanticCandidate&&semanticCandidate.confidence>=.90&&norm(semanticCandidate.text)!==norm(input);
    const phraseMemoryStrong=memorySuggestions.some(x=>Number(x.confidence||0)>=.90 && tokenise(x.text).length>=2);
    const multiToken=tokenise(input).length>=2;
    const shortInput=tokenise(input).length<=2;
    // Qwen is reserved for cases where whole-text phrase memory and deterministic
    // reasoning are genuinely uncertain. This keeps normal typing fast and avoids
    // loading the 0.6B model for every short word.
    // Do not start the old on-device Qwen3 fallback on phones: it can consume
    // substantial WebGPU/WASM memory and was the source of the previous reloads.
    // The online OpenRouter brain is the heavy reasoning layer now.
    const needsDeep=false;
    if(needsDeep) try{
      const nativePromise=nativeSuggest(input,direction,services);
      llm=await Promise.race([nativePromise,new Promise(resolve=>setTimeout(()=>resolve(null),1400))]);
      if(!llm){
        const llmPromise=localLlmSuggest(input,direction,services,retrievedText);
        const responseGuard=localLlmState==='loading'?2200:3000;
        llm=await Promise.race([llmPromise,new Promise(resolve=>setTimeout(()=>resolve(null),responseGuard))]);
      }
    }catch(_){llm=null;}
    let result=llm||localResult;
    if(result?.corrected && localResult?.corrected && norm(result.corrected)===norm(input) && norm(localResult.corrected)!==norm(input)){
      result={...localResult,uncertain:true};
    }
    // If Qwen echoes the input while dictionary/local retrieval found a candidate,
    // keep the recovered candidate rather than incorrectly declaring the text correct.
    if(result && norm(result.corrected||'')===norm(input) && localResult.changed){
      result={...localResult,uncertain:true};
    }
    // Never label an unresolved suspicious input as fully correct.
    if(result && semanticCandidate && norm(semanticCandidate.text)!==norm(input)){
      const semanticWords=tokenise(semanticCandidate.text).length;
      const inputWords=tokenise(input).length;
      // Reverse-memory rule: a single concept such as «багажник» or «сантехика»
      // must resolve to useful professional phrase candidates, never to the bare
      // corrected noun. A one-word semantic output is therefore not allowed to
      // override a multi-word phrase already retrieved from memory.
      const bareSingleConcept=(inputWords===1);
      const modelBacked=['native-local-ai','local-llm-qwen3-0.6b'].includes(result.engine);
      const semanticIsBetter=!bareSingleConcept && (!modelBacked || !result.changed || result.confidence<semanticCandidate.confidence);
      if(semanticIsBetter){
        result={...result,corrected:semanticCandidate.text,suggestions:[semanticCandidate,...(result.suggestions||[]).filter(x=>norm(x.text)!==norm(semanticCandidate.text))].slice(0,5),changed:true,confidence:semanticCandidate.confidence,uncertain:false,engine:'master-semantic-brain-v410'};
      }
    }
    if(result && !result.changed && suspicious){
      result={...result,corrected:result.corrected,suggestions:[{text:result.corrected,note:'AI не смог уверенно подтвердить написание — проверьте слово',confidence:.45}],confidence:.45,uncertain:true};
    }
    CACHE.set(key,result);if(CACHE.size>MAX_CACHE)CACHE.delete(CACHE.keys().next().value);
    return result;
  }

  function clearCache(){CACHE.clear();}
  function getStatus(){return {
    engine:remoteBrainState==='ready'?'openrouter-gemma4-free-brain':(localLlmState.startsWith('ready')?'local-llm-qwen3-0.6b':(nativeState==='available'?'native-local-ai':'master-ai-with-10m-memory')),
    native:nativeState,
    localLlm:localLlmState,
    model:OPENROUTER_MODEL,
    dictionary:'master-dictionary-10m',
    dictionaryEntries:10000000,
    offline:remoteBrainState!=='ready',
    remoteInference:remoteBrainState==='ready',
    remoteApi:true,
    remoteHost:true,
    remoteBrainState,
    configured:hasOpenRouterKey()
  };}

  window.MG_AI_SERVICE={suggestServiceName,clearCache,getStatus,setOpenRouterKey,getOpenRouterKey,hasOpenRouterKey,testOpenRouter,esc,region:null,version:'v415-openrouter-gemma4-fast'};
})();
