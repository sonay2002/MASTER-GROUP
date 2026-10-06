const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('js/mg-ai-service.js','utf8');
const context={
  window:{MGCatalog:{data:[
    {name:'Клининг участка',services:[
      {name:'Покос травы',unit:'сотка'},{name:'Срез деревьев',unit:'шт'},{name:'Удаление корней',unit:'шт'},{name:'Сбор и погрузка мусора',unit:'загрузка'}]},
    {name:'Установка видеонаблюдения',services:[
      {name:'Установка камеры',unit:'шт'},{name:'Настройка видеорегистратора',unit:'шт'},{name:'Прокладка кабеля',unit:'м'}]},
    {name:'Сантехнические работы',services:[
      {name:'Монтаж труб',unit:'м'},{name:'Установка сантехники',unit:'шт'},{name:'Поиск и устранение протечки',unit:'шт'},{name:'Демонтаж сантехники',unit:'шт'}]},
    {name:'Отделочные работы',services:[
      {name:'Укладка плитки',unit:'м²'},{name:'Покраска стен',unit:'м²'},{name:'Шпаклевка стен',unit:'м²'}]}
  ]}},
  console,setTimeout,clearTimeout,JSON,String,Number,Map,Object,Array,Error,Set,Math,Promise
};
context.window.window=context.window;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
  const cases=[
    'уклдк кафла ваной','montare faianta baie','ukladka kafela','плитку в ваной','надо покрас стен','покрас стэн','покраска стена кухня',
    'schimbare teava apa','schimbare teava','устанвка раковн','ustnovka rakovina','prokladka cablu','установка камери','nastroyka registratora',
    'убрть корни дерева','udalenie korney','taere copaci','срез дрв','покос травы на участке','cosire iarba teren',
    'демонтаж сантех','demontare sanitare','поиск протечки вода','scurgere apa','вывоз строй мусор','evacuare deseuri constructie'
  ];
  for(const input of cases){
    const r=await context.window.MG_AI_SERVICE.suggestServiceName({text:input,direction:'',selectedServices:[]});
    if(!r||!r.corrected)throw new Error('No result: '+input);
    if(r.offline!==true)throw new Error('Not offline: '+input);
    if(!['master-local-ai-open-v4','native-local-ai','master-semantic-brain-v408','master-semantic-brain-v410','master-ai-with-10m-memory','local-llm-qwen3-0.6b'].includes(r.engine))throw new Error('Bad engine: '+r.engine);
    if(r.corrected.length>180)throw new Error('Too long: '+input);
    if(/на стене|на потолке|на участке|в подвале|на крыше/.test(r.corrected) && !/(стен|потол|участ|подвал|крыш|teren|curte|baie|bucatar|acoperis|tavan|perete)/i.test(input)) throw new Error('Suspicious invented location: '+input+' => '+r.corrected);
    console.log(input,'=>',r.corrected);
  }
  console.log('AI stress smoke: OK');
})();
