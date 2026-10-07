/* Direct, mobile-safe estimate document actions. */
(()=>{
  'use strict';
  const prepared={key:'',file:null,promise:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const core=()=>window.MGAppCore||{};
  const estimate=()=>core().state?.estimate||null;
  const money=value=>{try{return core().money?.(Number(value)||0)??(Number(value)||0).toFixed(2)}catch(_){return (Number(value)||0).toFixed(2)}};
  const rowsFor=e=>{
    const items=core().allItemsFromEstimate?.(e)||[];
    return items.map((item,i)=>({n:String(i+1),name:String(item.name||'Услуга'),direction:String(item.direction||''),unit:String(item.unit||'шт'),price:money(item.price),qty:String(item.qty??0),sum:money((Number(item.qty)||0)*(Number(item.price)||0))}));
  };
  function wrap(text,max){const words=String(text||'').split(/\s+/);const out=[];let line='';for(const word of words){if(!word)continue;if(word.length>max){if(line){out.push(line);line=''}for(let i=0;i<word.length;i+=max)out.push(word.slice(i,i+max));continue}if((line?line.length+1:0)+word.length>max){out.push(line);line=word}else line+=(line?' ':'')+word}if(line)out.push(line);return out.length?out:['—']}
  function makeSvg(e){
    const W=1080,p=38,inner=W-p*2,cols=[50,420,100,150,100,inner-820],xs=[p];cols.forEach((w,i)=>xs.push(xs[i]+w));
    const data=rowsFor(e);let y=236,body='';
    body+=`<text x="${p}" y="78" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#17191c">СМЕТА № ${esc(e.number||'—')}</text><text x="${W-p}" y="78" text-anchor="end" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="#17191c">MASTER GROUP</text><line x1="${p}" y1="100" x2="${W-p}" y2="100" stroke="#333" stroke-width="2"/>`;
    body+=`<text x="${p}" y="138" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="1.2" fill="#777">КЛИЕНТ</text><text x="${p}" y="166" font-family="Arial,sans-serif" font-size="21" font-weight="700" fill="#17191c">${esc(e.client||'—')}</text>`;
    const contact=[e.phone&&`Телефон: ${e.phone}`,(e.address||e.object)&&`Адрес: ${e.address||e.object}`,e.date&&`Дата: ${e.date}`].filter(Boolean).join('   ·   ');
    body+=`<text x="${p}" y="196" font-family="Arial,sans-serif" font-size="15" fill="#555">${esc(contact||'')}</text>`;
    const headH=48;body+=`<rect x="${p}" y="${y}" width="${inner}" height="${headH}" fill="#f0f1f2"/>`;
    const labels=['№','Работа / услуга','Ед. изм.','Цена за единицу','Количество','Сумма'];
    labels.forEach((label,i)=>{const right=i>=2&&i!==4;body+=`<text x="${right?xs[i+1]-10:xs[i]+(i===0?cols[i]/2:10)}" y="${y+30}" ${right?'text-anchor="end"':i===0?'text-anchor="middle"':''} font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#444">${esc(label)}</text>`});
    y+=headH;
    data.forEach((r,i)=>{const nameLines=wrap(r.name,43),dirLines=r.direction?wrap(r.direction,48).slice(0,1):[];const lineCount=Math.max(nameLines.length+dirLines.length,1);const h=Math.max(54,20+lineCount*21);if(i%2===1)body+=`<rect x="${p}" y="${y}" width="${inner}" height="${h}" fill="#fafafa"/>`;body+=`<line x1="${p}" y1="${y+h}" x2="${W-p}" y2="${y+h}" stroke="#e2e3e5"/>`;
      const base=y+25;body+=`<text x="${xs[0]+cols[0]/2}" y="${base}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#333">${esc(r.n)}</text>`;
      nameLines.forEach((line,j)=>body+=`<text x="${xs[1]+10}" y="${base+j*21}" font-family="Arial,sans-serif" font-size="16" font-weight="600" fill="#222">${esc(line)}</text>`);
      dirLines.forEach((line,j)=>body+=`<text x="${xs[1]+10}" y="${base+(nameLines.length+j)*21}" font-family="Arial,sans-serif" font-size="12" fill="#777">${esc(line)}</text>`);
      [r.unit,r.price,r.qty,r.sum].forEach((value,j)=>{const c=j+2;body+=`<text x="${xs[c+1]-10}" y="${base}" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#333">${esc(value)}</text>`});y+=h;
    });
    if(!data.length){body+=`<text x="${W/2}" y="${y+34}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#777">Услуги не добавлены</text>`;y+=60}
    y+=24;body+=`<line x1="${p}" y1="${y}" x2="${W-p}" y2="${y}" stroke="#333" stroke-width="2"/><text x="${W-p-220}" y="${y+42}" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#222">ИТОГО:</text><text x="${W-p}" y="${y+42}" text-anchor="end" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#17191c">${esc(money(e.total))} MDL</text>`;y+=68;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
  }
  function keyFor(e){return JSON.stringify([e.id,e.number,e.client,e.phone,e.address,e.total,e.directions,e.items,e.date])}
  async function prepare(e=estimate()){
    if(!e)throw new Error('Сначала откройте смету');const key=keyFor(e);if(prepared.key===key&&prepared.file)return prepared.file;if(prepared.key===key&&prepared.promise)return prepared.promise;
    prepared.key=key;prepared.file=null;prepared.promise=(async()=>{const blob=new Blob([makeSvg(e)],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);try{const img=new Image();img.decoding='async';await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Не удалось подготовить изображение сметы'));img.src=url});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas недоступен');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);const png=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не удалось создать PNG')),'image/png'));const file=new File([png],`smeta-${String(e.number||'estimate').replace(/[^\w.-]+/g,'-')}.png`,{type:'image/png'});prepared.file=file;return file}finally{URL.revokeObjectURL(url)}})();try{return await prepared.promise}catch(err){prepared.promise=null;throw err}
  }
  window.__mgPrepareEstimateShareImage=()=>{const e=estimate();if(e)prepare(e).catch(err=>console.warn('Estimate image preparation:',err))};
  async function shareImage(){const e=estimate();if(!e){core().toast?.('Сначала откройте сохранённую смету');return false}try{const file=prepared.key===keyFor(e)&&prepared.file?prepared.file:await prepare(e);const data={files:[file],title:`Смета № ${e.number||''}`,text:`Смета № ${e.number||''} · ${e.client||''}`};if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({files:[file]}))){const result=navigator.share(data);result?.then?.(()=>{try{window.v60AskSent?.(e.id)}catch(_){}},err=>{if(err?.name!=='AbortError')console.warn('Image share failed:',err)});return false}const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);core().toast?.('Фото сметы сохранено — прикрепите его в чате');return false}catch(err){console.warn('Estimate image share:',err);core().toast?.('Не удалось подготовить фото сметы');return false}}
  function textFor(e){const items=rowsFor(e);return `Смета № ${e.number||''}\nКлиент: ${e.client||'—'}\nТелефон: ${e.phone||'—'}\nАдрес: ${e.address||e.object||'—'}\n\n${items.map(x=>`${x.n}. ${x.direction?x.direction+' · ':''}${x.name} — ${x.qty} ${x.unit} × ${x.price} = ${x.sum} MDL`).join('\n')}\n\nИТОГО: ${money(e.total)} MDL`}
  function sendTo(kind){const e=estimate();if(!e){core().toast?.('Сначала откройте сохранённую смету');return false}const text=textFor(e);const url=kind==='wa'?`https://wa.me/?text=${encodeURIComponent(text)}`:`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;try{const tab=window.open(url,'_blank');if(tab)tab.opener=null;else window.location.assign(url)}catch(_){window.location.assign(url)}try{if(e.id)window.v60AskSent?.(e.id)}catch(_){}return false}
  function printEstimate(){const e=estimate();if(!e){core().toast?.('Сначала откройте сохранённую смету');return false}try{const render=core().documentBody;if(typeof render==='function')render({...e,template:window.MGEstimateTemplates?.resolveForEstimate?.(e)||e.template||'template1'});document.documentElement.classList.add('printing');setTimeout(()=>{try{window.print()}catch(err){console.warn('Print failed:',err);core().toast?.('Печать недоступна в этом браузере')}} ,80)}catch(err){console.warn('Print failed:',err);core().toast?.('Не удалось открыть печать')}return false}
  window.__mgEstimateShareImage=shareImage;window.__mgEstimateSendTo=sendTo;window.__mgEstimatePrint=printEstimate;
  document.addEventListener('click',event=>{const button=event.target?.closest?.('#documentScreen [data-action]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.dataset.action==='share')shareImage();else if(button.dataset.action==='wa')sendTo('wa');else if(button.dataset.action==='tg')sendTo('tg');else if(button.dataset.action==='print')printEstimate()},true);
  const doc=document.getElementById('document');if(doc){new MutationObserver(()=>window.__mgPrepareEstimateShareImage()).observe(doc,{childList:true,subtree:true,characterData:true});if(doc.childNodes.length)window.__mgPrepareEstimateShareImage()}
})();
