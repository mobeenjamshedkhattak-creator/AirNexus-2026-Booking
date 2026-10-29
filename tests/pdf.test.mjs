import test from 'node:test';
import assert from 'node:assert/strict';
import {imagePDF,safeJSON} from '../public/exports.js';
test('PDF cross-reference offsets point to the exact objects and include all pages',async()=>{
  const data='data:image/jpeg;base64,'+Buffer.from('JPEG TEST BYTES').toString('base64');const pdf=imagePDF([{jpeg:data,width:20,height:10},{jpeg:data,width:20,height:10}]);const text=Buffer.from(await pdf.arrayBuffer()).toString('utf8');assert.ok(text.startsWith('%PDF-1.4'));assert.ok(text.includes('/Count 2'));const start=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(start,start+4),'xref');const offsets=text.slice(start).split('\n').slice(3,11);offsets.forEach((line,i)=>{const offset=Number(line.slice(0,10));assert.equal(text.slice(offset,offset+7),`${i+1} 0 obj`);});
});
test('HTML backups cannot terminate their embedded JSON script',()=>assert.equal(safeJSON({title:'</script><script>alert(1)</script>'}).includes('</script>'),false));
