export const PALETTE = ['#53b5ff','#faab45','#b59bff','#ff778a','#32c9a0','#f5d547','#54d5de','#e58bd4','#8acb56','#fb8a60','#85a0ed','#d5bb8c','#7dd4b5','#d99efa','#72b9c0','#c5d953'];
export const CATEGORIES = ['Academic','Sports','Outdoor','Facilities','Other'];
export const STATUSES = ['Confirmed','Tentative','Cancelled'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto?.randomUUID?.() || 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function prettyDate(d){if(!d)return 'All dates';return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
export function clock(t){const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
const zone=(id,name,category,points,label,verified=false)=>({id,name,category,points,label,verified,color:PALETTE[0],notes:'',rooms:[]});
const e9 = [
  zone('e9-a','A Block','Academic',[[141,280],[203,247],[253,327],[196,358]],[195,304],true),
  zone('e9-b','B Block','Academic',[[184,209],[258,160],[287,207],[216,258]],[235,207],true),
  zone('e9-n1','North Block 01','Academic',[[254,132],[313,95],[346,153],[288,188]],[301,140]),
  zone('e9-n2','North Block 02','Academic',[[340,84],[420,53],[467,115],[385,158]],[404,104]),
  zone('e9-iaa','IAA','Academic',[[447,190],[468,171],[498,168],[521,188],[522,224],[506,250],[474,257],[449,234],[441,211]],[482,211],true),
  zone('e9-east','East Complex','Academic',[[530,122],[601,88],[628,136],[606,196],[538,178]],[578,141]),
  zone('e9-masjid','Masjid','Facilities',[[50,247],[100,224],[131,291],[74,313]],[89,269],true),
  zone('e9-cside','C-side Building','Academic',[[84,346],[126,328],[154,397],[109,411]],[119,369]),
  zone('e9-south','South Block','Academic',[[251,309],[320,272],[345,309],[275,349]],[299,308]),
  zone('e9-court','West Court','Sports',[[109,172],[163,149],[209,214],[158,245]],[158,195]),
  zone('e9-lawn','South Lawn','Outdoor',[[195,373],[270,346],[316,417],[231,469]],[254,405]),
  zone('e9-parking','North Parking','Facilities',[[433,47],[550,3],[590,44],[478,119]],[511,57]),
  zone('e9-cafe','AU Café','Facilities',[[414,257],[431,247],[450,268],[432,279]],[432,264],true)
];
const h11 = [
  zone('h11-hostel','Hostel Block','Facilities',[[280,15],[319,4],[378,99],[329,126]],[328,66],true),
  zone('h11-courts','Sports Courts','Sports',[[270,216],[393,146],[435,224],[313,298]],[352,221]),
  zone('h11-pitch','Turf Ground','Sports',[[369,268],[435,231],[464,275],[396,315]],[416,273]),
  zone('h11-court2','South Court','Sports',[[282,306],[346,267],[390,336],[327,377]],[335,323]),
  zone('h11-field','Open Sports Field','Outdoor',[[334,381],[465,303],[526,390],[392,467]],[433,387]),
  zone('h11-west','Academic Wing 01','Academic',[[426,476],[498,485],[495,516],[422,507]],[460,496]),
  zone('h11-north','Academic Wing 02','Academic',[[499,477],[548,406],[574,422],[523,492]],[539,450]),
  zone('h11-long','Academic Wing 03','Academic',[[503,512],[528,501],[620,647],[597,661]],[562,578]),
  zone('h11-main','Main Building','Academic',[[419,545],[506,583],[469,642],[391,604]],[448,594]),
  zone('h11-eastcourt','East Hard Court','Sports',[[555,318],[617,282],[734,476],[675,510]],[646,395]),
  zone('h11-northeast','North-east Area 01','Other',[[460,170],[532,126],[564,176],[495,221]],[512,173]),
  zone('h11-northeast2','North-east Area 02','Other',[[499,249],[555,214],[583,263],[529,299]],[543,256]),
  zone('h11-plaza','Central Plaza','Outdoor',[[331,533],[400,506],[426,542],[388,604],[333,632],[305,592]],[360,567]),
  zone('h11-eastopen','East Open Area','Outdoor',[[625,562],[668,536],[732,653],[686,682]],[679,610])
];
e9.forEach((z,i)=>z.color=PALETTE[i%PALETTE.length]);h11.forEach((z,i)=>z.color=PALETTE[i%PALETTE.length]);
export const CAMPUSES = {
  e9:{id:'e9',name:'E-9 Campus',eyebrow:'THE CITY CAMPUS',width:800,height:530,reference:'./assets/e9-reference.png',description:'Academic blocks, shared spaces and courts. One clear plan.',district:'Islamabad · E-9',zones:e9},
  h11:{id:'h11',name:'H-11 Campus',eyebrow:'THE SOUTH CAMPUS',width:753,height:751,reference:'./assets/h11-reference.png',description:'Sports grounds, academic wings and open spaces. All connected.',district:'Islamabad · H-11',zones:h11}
};
export function freshDocument(id){return {schemaVersion:1,campusId:id,title:'AirNexus Olympiad',zones:clone(CAMPUSES[id].zones),events:[]};}
export function areaEvents(doc,areaId,date='',query=''){const q=query.toLowerCase();return doc.events.filter(e=>(!areaId||e.areaId===areaId)&&(!date||e.date===date)&&(!q||`${e.title} ${e.organizer} ${doc.zones.find(z=>z.id===e.areaId)?.name} ${e.roomId?doc.zones.find(z=>z.id===e.areaId)?.rooms.find(r=>r.id===e.roomId)?.name:''}`.toLowerCase().includes(q))).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));}
export function bookingConflict(events,event){if(event.status==='Cancelled')return null;return events.find(e=>e.id!==event.id&&e.status!=='Cancelled'&&e.areaId===event.areaId&&e.date===event.date&&(!e.roomId||!event.roomId||e.roomId===event.roomId)&&e.start<event.end&&e.end>event.start)||null;}
export function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;}
export function validShape(points){if(!Array.isArray(points)||points.length<3)return false;return Math.abs(points.reduce((sum,p,i)=>{const n=points[(i+1)%points.length];return sum+p[0]*n[1]-n[0]*p[1];},0))/2>=4;}
export function validateEvent(doc,e){
  if(typeof e.title!=='string'||typeof e.date!=='string'||typeof e.start!=='string'||typeof e.end!=='string'||typeof e.organizer!=='string'||typeof e.notes!=='string'||!(e.roomId===null||typeof e.roomId==='string'))throw Error('Invalid event fields in backup.');
  const area=doc.zones.find(z=>z.id===e.areaId);if(!area)throw Error('Choose an area.');
  if(!e.title?.trim()||e.title.length>120)throw Error('Enter an event name (up to 120 characters).');
  if(!validDate(e.date))throw Error('Choose a valid date.');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.end)||e.end<=e.start)throw Error('The finish time must be later than the start, on the same day. Split overnight events into two bookings.');
  if(e.roomId&&!area.rooms.some(r=>r.id===e.roomId))throw Error('Choose a room from this area.');
  if(!STATUSES.includes(e.status))throw Error('Choose a valid status.');
  if(!Number.isInteger(e.attendees)||e.attendees<0||e.attendees>100000)throw Error('Attendees must be a whole number between 0 and 100,000.');
  const room=area.rooms.find(r=>r.id===e.roomId);if(e.status!=='Cancelled'&&room?.capacity&&e.attendees>room.capacity)throw Error(`This room holds ${room.capacity} people. Reduce the attendee count or choose another space.`);
  if((e.organizer||'').length>120||(e.notes||'').length>2000)throw Error('Organizer or notes are too long.');
  const conflict=bookingConflict(doc.events,e);if(conflict)throw Error(`Booking clash: “${conflict.title}” already uses this space, ${clock(conflict.start)}–${clock(conflict.end)}. A whole-area booking reserves every room.`);
  return true;
}
export function validateDocument(doc,id=doc?.campusId){
  if(!CAMPUSES[id]||doc?.schemaVersion!==1||doc.campusId!==id||typeof doc.title!=='string'||!doc.title.trim()||doc.title.length>120||!Array.isArray(doc.zones)||doc.zones.length>200||!Array.isArray(doc.events)||doc.events.length>10000)throw Error('This is not a supported AirNexus campus backup.');
  const ids=new Set();for(const z of doc.zones){
    if(!z.id||typeof z.id!=='string'||ids.has(z.id)||typeof z.name!=='string'||!z.name.trim()||z.name.length>80||!/^#[0-9a-f]{6}$/i.test(z.color)||!CATEGORIES.includes(z.category)||typeof z.notes!=='string'||z.notes.length>2000||typeof z.verified!=='boolean')throw Error('Invalid area details in backup.');ids.add(z.id);
    if(!Array.isArray(z.points)||z.points.length<3||z.points.length>100||!z.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=CAMPUSES[id].width&&p[1]>=0&&p[1]<=CAMPUSES[id].height)||!validShape(z.points))throw Error('An area needs a visible shape with at least three distinct corners.');
    if(!Array.isArray(z.label)||z.label.length!==2||!z.label.every(Number.isFinite)||!Array.isArray(z.rooms)||z.rooms.length>200)throw Error('Invalid area position or rooms.');
    const roomIds=new Set();for(const r of z.rooms){if(typeof r.id!=='string'||roomIds.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!(r.capacity===null||Number.isInteger(r.capacity)&&r.capacity>0&&r.capacity<=100000))throw Error('Invalid room in backup.');roomIds.add(r.id);}
  }
  const eventIds=new Set();for(const e of doc.events){if(typeof e.id!=='string'||eventIds.has(e.id))throw Error('Duplicate or invalid event.');eventIds.add(e.id);validateEvent(doc,e);}
  return doc;
}
export function center(points){return [points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];}
function lines(name,max=17){const out=[];for(const word of name.split(' ')){if(!out.length||out[out.length-1].length+word.length+1>max)out.push(word);else out[out.length-1]+=' '+word;}return out;}
function baseMap(id){return id==='e9'?`
  <path d="M18 -25 L57 118 44 201 83 303 129 540 M73 162 L558 -20 M188 517 L753 163 M565 -30 L740 191" class="road-edge"/>
  <path d="M18 -25 L57 118 44 201 83 303 129 540 M73 162 L558 -20 M188 517 L753 163 M565 -30 L740 191" class="road"/>
  <path d="M131 291 L194 360 252 326 328 270 421 258 475 329 M216 258 L264 232 288 187 379 174 478 119 585 57 M159 404 L188 506 M253 326 L321 423 M327 270 L385 261 413 202 408 156 M536 203 L577 245" class="walk"/>
  <path d="M211 472 L689 213 715 243 236 502Z M326 350L393 315 416 346 349 382Z M578 213L609 198 640 229 612 244Z" fill="#d4e0c5"/>
  <path d="M640 299Q686 267 731 303Q766 347 719 390Q675 415 646 373Q625 338 640 299" fill="none" stroke="#e3e5d9" stroke-width="23"/>
  <text x="476" y="428" transform="rotate(-31 476 428)" class="road-label">SERVICE ROAD</text><text x="38" y="155" transform="rotate(71 38 155)" class="road-label">CAMPUS EDGE</text>
  <path d="M74 165L556 -8 695 181 188 519 148 404 70 185Z" fill="none" stroke="#8b9f91" stroke-dasharray="6 7" stroke-width="1.5"/>
  <text x="183" y="516" class="gate-label">↗ CAMPUS ENTRY</text>
`:`
  <path d="M190 -30L317 173 426 117 573 -16 M317 173L252 281 325 465 391 497 M426 117L546 311 632 484 745 665 562 770 M325 465L225 503 300 548 328 652 448 655 510 755 M328 652L391 697 447 674 492 714 564 694 632 484" class="road-edge"/>
  <path d="M190 -30L317 173 426 117 573 -16 M317 173L252 281 325 465 391 497 M426 117L546 311 632 484 745 665 562 770 M325 465L225 503 300 548 328 652 448 655 510 755 M328 652L391 697 447 674 492 714 564 694 632 484" class="road"/>
  <path d="M25 152Q90 111 185 144L263 271 282 418 213 458 134 320Z M42 502Q137 413 211 467L263 598 197 699 110 654Z M581 22L663 54 709 151 640 181Z" fill="#dce5cc"/>
  <path d="M276 138L398 68 M324 485L420 526 448 537 M487 532L548 541 609 652 M558 382L526 340" class="walk"/>
  <text x="164" y="362" transform="rotate(65 164 362)" class="road-label">CAMPUS LANDSCAPE</text>
  <text x="603" y="206" transform="rotate(59 603 206)" class="road-label">EAST CAMPUS ROAD</text>
  <text x="505" y="739" class="gate-label">CAMPUS ENTRY ↗</text>
`;}
export function svgMarkup(id,doc,opts={}){
  const c=CAMPUSES[id],selected=opts.selected,labels=opts.labels!==false,reference=opts.reference;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width+40}" height="${c.height+40}" viewBox="-20 -20 ${c.width+40} ${c.height+40}" role="img" aria-label="${esc(c.name)} editable campus map" class="campus-svg" style="background:#edf0e6"><defs><pattern id="dots-${id}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#bbc9b8" opacity=".4"/></pattern><filter id="zone-shadow"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#173b36" flood-opacity=".12"/></filter></defs><style>.road-edge{stroke:#d3d9cf;stroke-width:19;fill:none;stroke-linecap:round;stroke-linejoin:round}.road{stroke:#fffef8;stroke-width:12;fill:none;stroke-linecap:round;stroke-linejoin:round}.walk{fill:none;stroke:#fffef8;stroke-width:7;stroke-linejoin:round}.road-label{font:8px Arial,sans-serif;fill:#879784;letter-spacing:2px}.gate-label{font:bold 8px Arial,sans-serif;fill:#677c6e;letter-spacing:1px}.area-shape{stroke:#fff;stroke-width:2;stroke-linejoin:round;cursor:pointer;transition:fill-opacity .15s}.area-shape:hover{fill-opacity:1;stroke:#183b42;stroke-width:3}.area-label{font:600 10px Arial,sans-serif;fill:#153740;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#ffffffd9;stroke-width:3;stroke-linejoin:round}.area-count{font:600 8px Arial,sans-serif;fill:#214936;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#fff;stroke-width:2}</style><rect x="-20" y="-20" width="${c.width+40}" height="${c.height+40}" fill="url(#dots-${id})"/>${baseMap(id)}${reference?`<image href="${esc(c.reference)}" x="0" y="0" width="${id==='h11'?864:800}" height="${c.height}" opacity=".83"/>`:''}${doc.zones.map(z=>{
    const booked=areaEvents(doc,z.id,opts.date||'',opts.query||'').filter(e=>e.status!=='Cancelled');const count=booked.length;
    const active=selected===z.id;const faded=opts.category&&z.category!==opts.category;
    const labelLines=lines(z.name,17);
    return `<g data-area="${esc(z.id)}" class="map-area ${active?'selected':''}" opacity="${faded?'.16':'1'}" role="button" tabindex="0" aria-label="${esc(z.name)}, ${count} events"><title>${esc(z.name)} · ${z.category}${z.verified?'':' · confirm name'}</title><polygon class="area-shape" points="${z.points.map(p=>p.join(',')).join(' ')}" fill="${z.color}" fill-opacity="${reference?'.55':'.9'}" ${active?'style="stroke:#123c43;stroke-width:4;filter:url(#zone-shadow)"':''}/>${labels?`<text class="area-label" x="${z.label[0]}" y="${z.label[1]-(labelLines.length-1)*5}">${labelLines.map((l,i)=>`<tspan x="${z.label[0]}" dy="${i?12:0}">${esc(l)}</tspan>`).join('')}</text>${count?`<text class="area-count" x="${z.label[0]}" y="${z.label[1]+labelLines.length*7+9}"><tspan x="${z.label[0]}">${esc(booked[0].title.length>22?booked[0].title.slice(0,21)+'…':booked[0].title)}</tspan>${count>1?`<tspan x="${z.label[0]}" dy="10">+${count-1} more event${count>2?'s':''}</tspan>`:''}</text>`:''}`:''}</g>`;
  }).join('')}<g transform="translate(${id==='e9'?745:58} ${id==='e9'?50:49})"><circle r="23" fill="#fffdf4" stroke="#d8dfd0"/><path d="M0 -15L-5 5 0 2 5 5Z" fill="#27493f"/><text y="16" text-anchor="middle" font-family="Arial" font-size="8" fill="#27493f">UP</text></g><text x="12" y="${c.height-7}" font-family="Arial" font-size="7" fill="#758470">SCHEMATIC · NOT TO SCALE · VERIFY ON SITE</text></svg>`;
}
