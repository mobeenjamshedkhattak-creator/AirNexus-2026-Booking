import test from 'node:test';
import assert from 'node:assert/strict';
import {CampusStore} from '../public/storage.js';
import {freshDocument,clone} from '../public/core.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
globalThis.localStorage=memory();globalThis.sessionStorage=memory();
function cloud(){const s=new CampusStore({supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_test'},()=>{});s.session={user:{id:'user-one'},expires_at:Date.now()/1000+3600,access_token:'test'};return s;}
const rows=()=>['e9','h11'].map(id=>({campus_id:id,document:freshDocument(id),revision:0}));
test('local edits survive opening the editor again, including exported snapshot mode',async()=>{
  const s=new CampusStore({},()=>{});s.scope='test-offline';await s.load({e9:freshDocument('e9'),h11:freshDocument('h11')});s.doc('e9').title='Persistent title';s.changed('e9');
  const reopened=new CampusStore({},()=>{});reopened.scope='test-offline';await reopened.load({e9:freshDocument('e9'),h11:freshDocument('h11')});assert.equal(reopened.doc('e9').title,'Persistent title');
});
test('cloud updates use compare-and-swap and clear dirty only after acknowledgement',async()=>{
  const s=cloud();let saved;s.api=async(path,opts)=>{if(path.startsWith('an_campuses'))return rows();saved=JSON.parse(opts.body);return [{revision:1}];};await s.load();s.doc('e9').title='My plan';s.changed('e9');assert.equal(s.isDirty(),true);await s.flush();assert.equal(saved.p_expected_revision,0);assert.equal(saved.p_document.title,'My plan');assert.equal(s.isDirty(),false);assert.equal(s.records.e9.revision,1);
});
test('an edit during a cloud save remains pending and uses the returned revision next',async()=>{
  const s=cloud();s.scope='test-inflight';s.api=async()=>rows();await s.load();let finish;let calls=0;
  s.api=async()=>{calls++;if(calls===1)return new Promise(resolve=>finish=()=>resolve([{revision:1}]));return [{revision:2}];};
  s.doc('e9').title='First';s.changed('e9');const saving=s.flush();await new Promise(resolve=>setImmediate(resolve));s.doc('e9').title='Second';s.changed('e9');finish();await saving;assert.equal(s.isDirty(),true);assert.equal(s.records.e9.revision,1);await s.flush();assert.equal(s.records.e9.revision,2);assert.equal(s.isDirty(),false);
});
test('a concurrent editor conflict pauses writes and keeps the local draft',async()=>{
  const s=cloud();s.scope='test-conflict';s.api=async()=>rows();await s.load();s.doc('e9').title='Do not lose me';s.changed('e9');s.api=async()=>{const e=Error('Concurrent update');e.code='40001';throw e;};await assert.rejects(s.flush());assert.equal(s.blocked,true);assert.equal(s.isDirty(),true);assert.equal(s.doc('e9').title,'Do not lose me');clearTimeout(s.timer);
});
test('stale saved browser drafts are archived rather than overwriting newer cloud data',async()=>{
  const s=cloud();s.scope='test-stale';const draft=freshDocument('e9');draft.title='Old draft';localStorage.setItem(s.key('e9'),JSON.stringify({doc:draft,dirty:true,revision:0,generation:1}));s.api=async()=>rows().map(r=>({...r,revision:3}));await s.load();assert.equal(s.doc('e9').title,'AirNexus Olympiad');assert.equal(s.recovery('e9').doc.title,'Old draft');
});
