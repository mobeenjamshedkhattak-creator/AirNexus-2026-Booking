import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDocument,validateDocument,validateEvent,bookingConflict,svgMarkup} from '../public/core.js';
const event=(overrides={})=>({id:'event-1',areaId:'e9-a',roomId:null,title:'Debate final',date:'2026-11-10',start:'09:00',end:'10:00',organizer:'Test organizer',attendees:20,status:'Confirmed',notes:'',...overrides});
test('both traced maps have valid, distinct geometry and safe SVG labels',()=>{
  for(const id of ['e9','h11']){const d=freshDocument(id);assert.equal(validateDocument(d,id),d);assert.ok(d.zones.length>=13);assert.equal(new Set(d.zones.map(z=>z.color)).size,d.zones.length);d.zones[0].name='<script>alert(1)</script>';assert.ok(!svgMarkup(id,d).includes('<script>'));}
});
test('overlapping bookings block the same room, touching time boundaries do not',()=>{
  const old=event({roomId:'room-a'});assert.ok(bookingConflict([old],event({id:'new',roomId:'room-a',start:'09:30',end:'10:30'})));
  assert.equal(bookingConflict([old],event({id:'new',roomId:'room-a',start:'10:00',end:'11:00'})),null);
});
test('different rooms can run together; whole-area reservations block either direction',()=>{
  const old=event({roomId:'room-a'});assert.equal(bookingConflict([old],event({id:'new',roomId:'room-b'})),null);
  assert.ok(bookingConflict([old],event({id:'new',roomId:null})));
  assert.ok(bookingConflict([event()],event({id:'new',roomId:'room-a'})));
});
test('dates, campus areas, cancellations and editing the same booking are respected',()=>{
  assert.equal(bookingConflict([event()],event()),null);
  for(const patch of [{date:'2026-11-11'},{areaId:'e9-b'},{status:'Cancelled'}])assert.equal(bookingConflict([event()],event({id:'new',...patch})),null);
  assert.equal(bookingConflict([event({status:'Cancelled'})],event({id:'new'})),null);
});
test('room capacity, valid dates, time ranges and room references are enforced',()=>{
  const d=freshDocument('e9');d.zones[0].rooms=[{id:'room-a',name:'A-101',capacity:30}];
  assert.doesNotThrow(()=>validateEvent(d,event({roomId:'room-a',attendees:30})));
  for(const patch of [{roomId:'room-a',attendees:31},{date:'2026-02-30'},{start:'11:00',end:'10:00'},{roomId:'unknown'},{attendees:1.5}])assert.throws(()=>validateEvent(d,event(patch)));
  assert.doesNotThrow(()=>validateEvent(d,event({roomId:'room-a',attendees:100,status:'Cancelled'})));
});
test('backup validation rejects duplicate IDs, out-of-map geometry and clashing schedules',()=>{
  const a=freshDocument('e9');a.zones.push({...a.zones[0]});assert.throws(()=>validateDocument(a));
  const b=freshDocument('e9');b.zones[0].points[0]=[9999,0];assert.throws(()=>validateDocument(b));
  const c=freshDocument('e9');c.events=[event(),event({id:'new'})];assert.throws(()=>validateDocument(c));
});
