import {CAMPUSES, esc, prettyDate, clock, areaEvents, svgMarkup} from './core.js';

export function download(name,content,type='application/json'){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function safeJSON(data){return JSON.stringify(data).replace(/</g,'\\u003c');}
export async function offlineHTML(snapshot){
  let html;
  if(document.getElementById('offline-runtime'))html='<!doctype html>\n'+document.documentElement.outerHTML;
  else {const response=await fetch('./offline-template.html');if(!response.ok)throw Error('Build the project first to enable offline HTML export.');html=await response.text();}
  html=html.replace(/(<script id="snapshot" type="application\/json">)[\s\S]*?(<\/script>)/,(_,a,b)=>a+safeJSON(snapshot)+b);
  return {name:'AirNexus-editable-offline.html',blob:new Blob([html],{type:'text/html'})};
}
export async function svgImage(id,doc,date=''){
  const svg=svgMarkup(id,doc,{date});const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not render map for export.'));img.src=url;});}finally{URL.revokeObjectURL(url);}
}
// Small, dependency-free PDF writer. Each page embeds one JPEG produced by Canvas.
// Raster text preserves the browser's font shaping, including Urdu names.
export function imagePDF(pages,width=842,height=595){
  const enc=new TextEncoder();const pieces=[];let length=0;const offsets=[0];const add=value=>{const bytes=typeof value==='string'?enc.encode(value):value;pieces.push(bytes);length+=bytes.length;};
  const object=(n,body)=>{offsets[n]=length;add(`${n} 0 obj\n`);add(body);add('\nendobj\n');};
  add('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  pages.forEach((page,i)=>{const n=3+i*3;const binary=atob(page.jpeg.split(',')[1]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    object(n,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${i} ${n+1} 0 R >> >> /Contents ${n+2} 0 R >>`);
    offsets[n+1]=length;add(`${n+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);add(bytes);add('\nendstream\nendobj\n');
    const cmd=`q ${width} 0 0 ${height} 0 0 cm /Im${i} Do Q`;object(n+2,`<< /Length ${enc.encode(cmd).length} >>\nstream\n${cmd}\nendstream`);
  });const start=length;add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(pieces,{type:'application/pdf'});
}
function wrap(ctx,text,width){const lines=[];for(const raw of String(text||'').split('\n')){let line='';for(const word of raw.split(' ')){if(ctx.measureText(line+' '+word).width>width&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}return lines;}
function pageCanvas(title,subtitle,page){const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=1414;const ctx=canvas.getContext('2d');ctx.fillStyle='#fcfcf5';ctx.fillRect(0,0,2000,1414);ctx.fillStyle='#153b43';ctx.font='bold 48px Arial';ctx.fillText(title,74,96,1852);ctx.font='22px Arial';ctx.fillStyle='#647b77';ctx.fillText(subtitle,74,137,1852);ctx.fillRect(74,166,1852,2);ctx.font='18px Arial';ctx.fillText('AIR UNIVERSITY  /  AIRNEXUS     ·     Asia/Karachi (PKT)     ·     Schematic, verify on site',74,1370);ctx.textAlign='right';ctx.fillText(String(page),1926,1370);ctx.textAlign='left';return {canvas,ctx};}
export async function exportPDF(id,doc,date='',imageFactory=svgImage){
  const pages=[];const c=CAMPUSES[id];const image=await imageFactory(id,doc,date);const title=`${doc.title} · ${c.name}`;const events=areaEvents(doc,null,date);let page=pageCanvas(title,`${prettyDate(date)}  ·  ${doc.zones.length} areas  ·  ${events.length} events`,1);
  const box={x:74,y:196,w:1250,h:1090};const scale=Math.min(box.w/image.width,box.h/image.height);page.ctx.drawImage(image,box.x+(box.w-image.width*scale)/2,box.y+(box.h-image.height*scale)/2,image.width*scale,image.height*scale);
  page.ctx.fillStyle='#153b43';page.ctx.font='bold 25px Arial';page.ctx.fillText('AREA DIRECTORY',1390,235);let y=280;
  for(const z of doc.zones){if(y>1230){pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});page=pageCanvas(title,'Area directory · continued',pages.length+1);y=225;}
    page.ctx.fillStyle=z.color;page.ctx.fillRect(1390,y-17,20,20);page.ctx.font='bold 21px Arial';page.ctx.fillStyle='#153b43';const ls=wrap(page.ctx,z.name,465);ls.forEach((l,i)=>page.ctx.fillText(l,1425,y+i*25,465));y+=ls.length*25;page.ctx.font='16px Arial';page.ctx.fillStyle='#6c7e73';const detailLines=wrap(page.ctx,`${z.category} · ${z.rooms.length} rooms${z.verified?'':' · name to confirm'}`,465);detailLines.forEach((l,i)=>page.ctx.fillText(l,1425,y+i*20,465));y+=detailLines.length*20+14;
  }pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});
  if(doc.zones.some(z=>z.rooms.length)){
    page=pageCanvas(title,'Rooms & named spaces · complete campus directory',pages.length+1);y=210;
    for(const z of doc.zones.filter(z=>z.rooms.length)){
      if(y>1170){pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});page=pageCanvas(title,'Rooms & spaces · continued',pages.length+1);y=210;}
      page.ctx.fillStyle=z.color;page.ctx.fillRect(74,y-17,18,23);page.ctx.fillStyle='#153b43';page.ctx.font='bold 27px Arial';page.ctx.fillText(z.name,110,y+4,1790);y+=42;
      for(const r of z.rooms){if(y>1260){pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});page=pageCanvas(title,`Rooms & spaces · ${z.name} · continued`,pages.length+1);y=210;}page.ctx.font='22px Arial';page.ctx.fillStyle='#647b77';page.ctx.fillText(`${r.name}  ·  ${r.capacity?r.capacity+' people':'capacity not set'}`,110,y,1785);y+=36;}y+=25;
    }pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});
  }
  page=pageCanvas(title,`Event schedule · ${prettyDate(date)} · all times PKT`,pages.length+1);y=210;
  if(!events.length){page.ctx.font='28px Arial';page.ctx.fillStyle='#647b77';page.ctx.fillText('No events have been booked for this selection.',74,270);}
  for(const e of events){const z=doc.zones.find(z=>z.id===e.areaId);const room=z.rooms.find(r=>r.id===e.roomId);page.ctx.font='20px Arial';const notes=wrap(page.ctx,e.notes,1790);page.ctx.font='bold 28px Arial';const titleLines=wrap(page.ctx,e.title,1790);page.ctx.font='21px Arial';const locationLines=wrap(page.ctx,`${prettyDate(e.date)} · ${clock(e.start)} – ${clock(e.end)}  |  ${z.name} / ${room?.name||'Whole area'}  |  ${e.status}`,1790);const height=55+titleLines.length*34+locationLines.length*27+(e.notes?notes.length*25:0)+28;
    if(y+height>1290){pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});page=pageCanvas(title,'Event schedule · continued · all times PKT',pages.length+1);y=210;}
    const ctx=page.ctx;ctx.fillStyle=z.color;ctx.fillRect(74,y-5,8,height-17);ctx.fillStyle='#153b43';ctx.font='bold 28px Arial';let lineY=y+24;titleLines.forEach(l=>{ctx.fillText(l,105,lineY,1790);lineY+=34;});ctx.font='21px Arial';lineY+=3;locationLines.forEach(l=>{ctx.fillText(l,105,lineY,1790);lineY+=27;});ctx.fillStyle='#647b77';ctx.font='20px Arial';lineY+=7;ctx.fillText(`${e.organizer||'Organizer not specified'} · ${e.attendees||0} attendees`,105,lineY,1790);lineY+=30;if(e.notes)notes.forEach(l=>{ctx.fillText(l,105,lineY,1790);lineY+=25;});y+=height+14;
  }pages.push({jpeg:page.canvas.toDataURL('image/jpeg',.94),width:2000,height:1414});
  return {name:`AirNexus-${id}-${date||'all-dates'}.pdf`,blob:imagePDF(pages)};
}
