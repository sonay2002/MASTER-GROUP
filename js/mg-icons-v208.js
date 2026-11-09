/* Master Group — exact 24-card icon set cropped from the user's approved reference image. */
(()=>{
const P=new Set(["clean","camera","plumbing","electrical","construction","masonry","welding","metal","paint","aircon","heating","ventilation","window","roof","finishing","landscape","excavator","transport","sewer","water","fence","flooring","tools","other"]);
const aliases={"🌿":"landscape","📹":"camera","⚙️":"metal","🔧":"plumbing",bolt:"electrical",home:"construction",brick:"masonry",brush:"finishing",snow:"aircon",drain:"sewer",tree:"landscape",case:"other",car:"transport",drill:"tools",dril:"tools"};
const rules=[
  [/клининг|уборк|очистк/,'clean'],
  [/видеонаблюд|видеокамер|камера|наблюден/,'camera'],
  [/свароч|сварк/,'welding'],
  [/металлоконструкц|металлическ.{0,15}конструкц|навес|перил|лестниц|каркас/,'metal'],
  [/водоснабж|водопровод|фильтр.{0,10}вод/,'water'],
  [/канализац|дренаж|ливнев/,'sewer'],
  [/сантехник/,'plumbing'],
  [/кондиционир|кондиционер|климат/,'aircon'],
  [/вентиляц|воздуховод/,'ventilation'],
  [/отоплен|радиатор|котел|котёл/,'heating'],
  [/кров|крыша|крыш/,'roof'],
  [/окн|двер/,'window'],
  [/электрик|электромонтаж|кабел|провод/,'electrical'],
  [/землян|экскават|котлован|транше/,'excavator'],
  [/забор|огражден|ворот/,'fence'],
  [/кладк|кирпич|газобетон|шлакоблок/,'masonry'],
  [/плиточ|наполь|ламинат|паркет|покрыти.{0,12}пол/,'flooring'],
  [/отделоч|штукатур|гипсокартон|гкл/,'finishing'],
  [/маляр|покраск|краск|обо[ие]/,'paint'],
  [/благоустрой|ландшафт|газон|озелен/,'landscape'],
  [/перевоз|доставк|вывоз|самосвал/,'transport'],
  [/бетон|фундамент|монолит|строительн/,'construction'],
  [/инструмент|оборудован/,'tools'],
  [/прочие работы|прочее|дополнительные работы/,'other']
]
function semanticName(n){const s=String(n||"").toLowerCase();return (rules.find(([re])=>re.test(s))||[])[1]||"";}
function key(v,n=""){
  // Explicit catalog icon keys must win over fuzzy name matching.
  // Name-based inference is only for legacy/custom entries without a known key.
  const raw=String(v||"").trim().toLowerCase();
  if(P.has(raw))return raw;
  const byName=semanticName(n);if(byName)return byName;
  return aliases[raw]||"other";
}
function svg(v,n){const k=key(v,n);const label=String(n||labels[k]||k).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));return `<img src="./icons/direction-approved/${k}.png?v=${k==='fence'?565:(['other','transport'].includes(k)?563:(['clean','landscape','flooring','roof'].includes(k)?561:560))}" class="mg-work-icon-image" alt="${label}" draggable="false" loading="eager" decoding="async">`;}
const labels={clean:"Клининг и уборка",camera:"Видеонаблюдение",metal:"Металлоконструкции",plumbing:"Сантехника",construction:"Строительство",electrical:"Электрика",excavator:"Земляные работы",fence:"Заборы и ограждения",finishing:"Отделочные работы",flooring:"Напольные покрытия",heating:"Отопление",landscape:"Благоустройство и ландшафт",masonry:"Кладочные работы",paint:"Малярные работы",sewer:"Канализация",transport:"Перевозки и вывоз",roof:"Кровельные работы",ventilation:"Вентиляция",water:"Водоснабжение",welding:"Сварочные работы",window:"Окна и двери",aircon:"Кондиционирование",tools:"Инструмент и оборудование",other:"Прочие работы и услуги"};
window.MGIconSVG=svg;window.MGIconKey=key;window.MGIconLabel=v=>labels[key(v)]||"";
})();
