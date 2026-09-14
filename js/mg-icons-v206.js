/* Master Group v204 — detailed monochrome work pictograms. */
(()=>{
const P={
clean:`<path d="M25 7l-7 24"/><path d="M18 31l-7 5 16 2 5-7z"/><path d="M12 38l-4 4h28"/><path d="M31 24c4 0 7 3 7 7"/><path d="M37 18c-3 1-5 3-6 6"/>`,
camera:`<path d="M6 17h27v20H6z"/><path d="M33 22l10-5v20l-10-5"/><path d="M13 17l3-5h10l3 5"/><circle cx="20" cy="27" r="7"/><circle cx="20" cy="27" r="3"/>`,
plumbing:`<path d="M7 12h13v11h-6v6c0 5 3 8 8 8h7"/><path d="M30 12h11v10H30"/><path d="M35 28v10"/><path d="M31 38h8"/><path d="M25 36h8"/>`,
electrical:`<path d="M29 5L12 27h12l-3 16 17-24H27z"/><path d="M31 13l-4 7"/>`,
construction:`<path d="M8 24c0-9 7-15 16-15s16 6 16 15"/><path d="M8 24h32"/><path d="M13 24v8h22v-8"/><path d="M17 32v8M31 32v8M12 40h24"/>`,
masonry:`<path d="M7 12h34v28H7z"/><path d="M7 21h34M7 30h34"/><path d="M18 12v9M31 12v9M13 21v9M25 21v9M36 30v10"/><path d="M34 27l7 7-5 5-7-7z"/>`,
welding:`<path d="M17 10h11c6 0 9 4 9 10v9c0 5-3 9-9 9H17l-6-6V16z"/><path d="M17 14h12v10H17z"/><path d="M13 38l-5 5M39 18l5-3M40 24h6M38 30l6 3"/><path d="M29 36l3 4"/>`,
metal:`<path d="M7 11h34v8H27v7h14v8H27v10h-8V19H7z"/><path d="M11 15h11M31 30h6"/><path d="M9 39h11"/>`,
paint:`<rect x="7" y="10" width="27" height="11" rx="2"/><path d="M13 15h15"/><path d="M20 21v19M15 40h10M34 14h7"/><path d="M37 18v7"/>`,
aircon:`<rect x="6" y="10" width="36" height="20" rx="3"/><path d="M12 17h24M12 22h18"/><path d="M16 34v7M32 34v7"/><path d="M14 34c1 3 3 4 6 4M28 34c1 3 3 4 6 4"/>`,
heating:`<rect x="9" y="8" width="30" height="32" rx="2"/><path d="M15 8v32M21 8v32M27 8v32M33 8v32"/><path d="M9 15h30M9 23h30M9 31h30"/><path d="M6 12h3M39 12h3"/>`,
ventilation:`<rect x="7" y="7" width="34" height="34" rx="3"/><circle cx="24" cy="24" r="4"/><path d="M24 20c-7-8-14 1-4 5M28 24c8-7-1-14-5-4M24 28c7 8 14-1 4-5"/><path d="M11 11h26v26H11z"/>`,
window:`<rect x="7" y="7" width="34" height="34" rx="1"/><path d="M24 7v34M7 24h34"/><path d="M11 11h26v26H11z"/><path d="M35 35l4 4"/>`,
roof:`<path d="M6 27l18-18 18 18"/><path d="M11 27v13h26V27"/><path d="M20 40V30h8v10"/><path d="M34 15h4v7"/>`,
finishing:`<path d="m7 37 20-20 8 8-20 20H7z"/><path d="m28 16 5-5 6 6-5 5"/><path d="M9 42h22"/><path d="M14 32l8 8"/>`,
dril:`<path d="M8 15h21v14H8z"/><path d="M29 18h8l5 5-5 5h-8"/><path d="M14 29v9M10 38h12M42 23h4"/><path d="M13 19h11"/>`,
landscape:`<path d="M24 40V27"/><path d="M13 27c-4-7 1-13 7-13 1-7 11-7 13 0 6 0 9 7 5 13-3 5-8 5-14 4"/><path d="M8 40h32"/><path d="M11 35c4-2 8-2 12 0"/>`,
excavator:`<path d="M7 38h34"/><path d="M10 31h22l4-9-10-6H12v15"/><path d="M26 16l8-7 8 7-7 10"/><circle cx="15" cy="38" r="5"/><circle cx="31" cy="38" r="5"/><path d="M36 31l5 7"/>`,
transport:`<path d="M6 18h27v20H6z"/><path d="M33 24h7l4 5v9H33z"/><circle cx="14" cy="40" r="3"/><circle cx="37" cy="40" r="3"/><path d="M11 23h14"/>`,
sewer:`<path d="M7 12h20v9H14v7c0 6 4 10 10 10h7v-8"/><path d="M31 30h10M36 26v9"/><path d="M36 38c0 3-4 3-4 0"/>`,
water:`<path d="M24 6c-6 8-11 14-11 21a11 11 0 0 0 22 0c0-7-5-13-11-21z"/><path d="M18 29c1 4 3 6 6 6"/><path d="M35 18l4 4"/>`,
fence:`<path d="M7 40V16M17 40V11M27 40V11M37 40V16"/><path d="M5 20h34M5 31h34M5 40h34"/><path d="M12 11v29M32 11v29"/><path d="M9 14l3-3 3 3M29 14l3-3 3 3"/>`,
flooring:`<path d="m7 31 12-12 8 8-12 12z"/><path d="m19 19 8-8 13 13-8 8z"/><path d="M7 39h34"/><path d="M16 28l5 5M28 19l8 8"/>`,
tools:`<path d="m8 38 14-14M25 29l10-10"/><path d="m29 16 4-4 7 7-4 4"/><path d="m19 29-7 7"/><path d="M27 36l8-8"/><path d="M9 9h13v8H9zM15 17v8"/>`,
other:`<path d="m24 7 4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z"/>`
};
const aliases={"🌿":"landscape","📹":"camera","⚙️":"metal","🔧":"plumbing","bolt":"electrical","home":"construction","brick":"masonry","brush":"finishing","snow":"aircon","drain":"sewer","tree":"landscape","case":"other","car":"transport"};
function key(v,n='') { let x=String(v||'').trim().toLowerCase(); if(aliases[x])x=aliases[x]; if(P[x])return x; const s=String(n).toLowerCase(); if(/клининг|уборк/.test(s))return'clean';if(/видео|камер/.test(s))return'camera';if(/сантех|труб/.test(s))return'plumbing';if(/электрик|кабел/.test(s))return'electrical';if(/строитель|стройк/.test(s))return'construction';if(/кладк|кирпич/.test(s))return'masonry';if(/сварк/.test(s))return'welding';if(/металл/.test(s))return'metal';if(/покраск|маляр/.test(s))return'paint';if(/кондиционер|климат/.test(s))return'aircon';if(/отоплен|радиатор/.test(s))return'heating';if(/вентиляц/.test(s))return'ventilation';if(/окн|двер/.test(s))return'window';if(/кровл|крыша/.test(s))return'roof';if(/отделоч/.test(s))return'finishing';if(/дрель|монтаж/.test(s))return'drill';if(/ландшафт|газон|дерев/.test(s))return'landscape';if(/землян|экскават/.test(s))return'excavator';if(/перевоз|вывоз|транспорт/.test(s))return'transport';if(/канализац/.test(s))return'sewer';if(/водоснаб|вода/.test(s))return'water';if(/забор|огражден/.test(s))return'fence';if(/наполь|пол/.test(s))return'flooring';if(/инструмент|ремонт/.test(s))return'tools';return'other'; }
function svg(v,n){const k=key(v,n);const label=labels?.[k]||n||k;return `<img src="./icons/direction-approved/${k}.png" class="mg-work-icon-image" alt="${String(label).replace(/"/g,'&quot;')}" draggable="false" loading="eager">`}
const labels={clean:'Клининг участка',camera:'Видеонаблюдение',plumbing:'Сантехника',electrical:'Электрика',construction:'Строительство',masonry:'Кладочные работы',welding:'Сварка',metal:'Металлоконструкции',paint:'Покраска',aircon:'Кондиционирование',heating:'Отопление',ventilation:'Вентиляция',window:'Окна и двери',roof:'Кровля',finishing:'Отделочные работы',drill:'Монтаж и инструменты',landscape:'Ландшафт',excavator:'Земляные работы',transport:'Вывоз мусора',sewer:'Канализация',water:'Водоснабжение',fence:'Заборы',flooring:'Напольные покрытия',tools:'Ремонт техники',other:'Другие работы'};
window.MGIconSVG=svg;window.MGIconKey=key;window.MGIconLabel=v=>labels[key(v)]||'';
})();
