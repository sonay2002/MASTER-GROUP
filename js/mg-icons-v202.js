/* Master Group v202 — semantic work pictograms, rebuilt from scratch. */
(()=>{
const P={
clean:`<path d="M9 39h30"/><path d="M14 34 20 17l9-4 5 5-9 5-5 11"/><path d="M8 39l-3 5h38"/>`,
camera:`<path d="M6 17h28v19H6z"/><path d="m34 22 9-5v19l-9-5"/><path d="m13 17 3-5h10l3 5"/><circle cx="20" cy="26.5" r="6"/>`,
plumbing:`<path d="M8 11h12v11h-6v7c0 5 3 8 8 8h8v-8"/><path d="M30 11h10v10H30"/><path d="M35 28v9M31 37h8"/>`,
electrical:`<path d="M28 5 12 27h11l-3 16 17-24H26z"/>`,
construction:`<path d="M8 23c0-8 7-14 16-14s16 6 16 14"/><path d="M8 23h32"/><path d="M13 23v7h22v-7"/><path d="M16 30v8M32 30v8M12 38h24"/>`,
masonry:`<path d="M7 12h34v28H7z"/><path d="M7 21h34M7 30h34"/><path d="M18 12v9M31 12v9M13 21v9M25 21v9M36 30v10"/><path d="m31 34 7 6M36 32l5 5"/>`,
welding:`<path d="M17 10h12c5 0 8 4 8 9v10c0 5-3 9-8 9H17l-6-6V16z"/><path d="M17 14h12v10H17z"/><path d="m12 37-4 5M38 18l5-2M40 24h5M38 30l5 3"/>`,
metal:`<path d="M7 11h34v8H27v7h14v8H27v10h-8V19H7z"/><path d="M11 15h10M31 30h6"/>`,
paint:`<path d="M8 10h25v10H8z"/><path d="M20 20v20M15 40h10M33 14h8"/><path d="M13 15h15"/>`,
aircon:`<rect x="6" y="11" width="36" height="19" rx="3"/><path d="M12 18h24M12 23h18"/><path d="M17 34v7M31 34v7"/><path d="M15 34c1 3 3 4 5 4M29 34c1 3 3 4 5 4"/>`,
heating:`<path d="M11 9v30M18 9v30M25 9v30M32 9v30M39 9v30"/><path d="M8 9h34M8 39h34"/><path d="M8 16h34M8 23h34M8 30h34"/>`,
ventilation:`<rect x="7" y="7" width="34" height="34" rx="3"/><circle cx="24" cy="24" r="4"/><path d="M24 20c-7-8-13 1-4 5M28 24c8-7-1-13-5-4M24 28c7 8 13-1 4-5"/>`,
window:`<rect x="7" y="7" width="34" height="34"/><path d="M24 7v34M7 24h34"/><path d="M11 11h26v26H11z"/>`,
finishing:`<path d="m7 37 20-20 8 8-20 20H7z"/><path d="m28 16 5-5 6 6-5 5"/><path d="M9 42h22"/>`,
drill:`<path d="M10 15h20v14H10z"/><path d="M30 18h7l5 5-5 5h-7"/><path d="M16 29v9M11 38h11M42 23h4"/>`,
landscape:`<path d="M24 40V27"/><path d="M13 27c-4-7 1-13 7-13 1-7 11-7 13 0 6 0 9 7 5 13-3 5-8 5-14 4"/><path d="M8 40h32"/>`,
excavator:`<path d="M7 37h34"/><path d="M10 31h21l5-9-10-6H12v15"/><path d="m26 16 8-6 8 7-7 10"/><circle cx="15" cy="37" r="5"/><circle cx="31" cy="37" r="5"/>`,
transport:`<path d="M6 18h27v19H6z"/><path d="M33 24h7l4 5v8H33z"/><circle cx="14" cy="39" r="3"/><circle cx="37" cy="39" r="3"/>`,
sewer:`<path d="M7 12h20v9H14v7c0 6 4 10 10 10h7v-8"/><path d="M31 30h10M36 26v9"/>`,
water:`<path d="M24 6c-6 8-11 14-11 21a11 11 0 0 0 22 0c0-7-5-13-11-21z"/><path d="M18 29c1 3 3 5 6 5"/>`,
fence:`<path d="M7 40V16M17 40V11M27 40V11M37 40V16"/><path d="M5 20h34M5 31h34M5 40h34"/><path d="M12 11v29M32 11v29"/>`,
flooring:`<path d="m7 31 12-12 8 8-12 12z"/><path d="m19 19 8-8 13 13-8 8z"/><path d="M7 39h34"/>`,
tools:`<path d="m8 38 13-13M25 28l9-9M29 16l4-4 7 7-4 4"/><path d="m19 29-6 6M26 36l8-8"/><path d="M9 9h13v8H9zM15 17v8"/>`,
other:`<path d="m24 7 4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1z"/>`
};
const aliases={"🌿":"landscape","📹":"camera","⚙️":"metal","🔧":"plumbing","bolt":"electrical","home":"construction","brick":"masonry","brush":"finishing","snow":"aircon","drain":"sewer","tree":"landscape","case":"other","car":"transport"};
function key(v,n=''){
 let x=String(v||'').trim().toLowerCase(); if(aliases[x])x=aliases[x]; if(P[x])return x;
 const s=String(n).toLowerCase();
 if(/клининг|уборк/.test(s))return'clean'; if(/видео|камер/.test(s))return'camera'; if(/сантех|труб/.test(s))return'plumbing';
 if(/электрик|кабел/.test(s))return'electrical'; if(/строитель|стройк/.test(s))return'construction'; if(/кладк|кирпич/.test(s))return'masonry';
 if(/сварк/.test(s))return'welding'; if(/металл/.test(s))return'metal'; if(/покраск|маляр/.test(s))return'paint';
 if(/кондиционер|климат/.test(s))return'aircon'; if(/отоплен|радиатор/.test(s))return'heating'; if(/вентиляц/.test(s))return'ventilation';
 if(/окн|двер/.test(s))return'window'; if(/отделоч/.test(s))return'finishing'; if(/дрель|монтаж/.test(s))return'drill';
 if(/ландшафт|газон|дерев/.test(s))return'landscape'; if(/землян|экскават/.test(s))return'excavator'; if(/перевоз|вывоз|транспорт/.test(s))return'transport';
 if(/канализац/.test(s))return'sewer'; if(/водоснаб|вода/.test(s))return'water'; if(/забор|огражден/.test(s))return'fence';
 if(/наполь|пол/.test(s))return'flooring'; if(/инструмент/.test(s))return'tools'; return'other';
}
function svg(v,n){return `<svg viewBox="0 0 48 48" class="mg-work-icon" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${P[key(v,n)]}</g></svg>`}
window.MGIconSVG=svg; window.MGIconKey=key;
})();
