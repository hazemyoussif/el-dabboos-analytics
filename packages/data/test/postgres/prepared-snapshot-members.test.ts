import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture,deltaSource,observedFact} from './business-delta-fixture.ts';
import {exposeBusinessDeltaMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('snapshot preparation preserves selected dates and canonical sparse masking',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);
 try{
  const cutoff='2026-10-21T09:00:00.000Z';
  const debt=fixture.initial.filter(fact=>fact.sourceObject==='command_receivable').map(fact=>observedFact(fact,cutoff,'2026-10-21'));
  const result=await exposeBusinessDeltaMonth(fixture.db.ingestor,deltaSource(fixture.source,cutoff,[{object:'command_receivable',id:'10',facts:debt}],['command_receivable']));
  const read=(tenant:string,through:string)=>tenantTransaction(fixture.db.ingestor,tenant,async client=>(await client.query(`SELECT measure_id,business_day::text AS "day",amount::numeric(30,6)::text value FROM mart.prepared_work_complete_snapshot_rows('a',$1,'business',$2) ORDER BY measure_id`,[result.revisionId,through])).rows,true);
  const expected=[...fixture.initial.filter(fact=>fact.kind==='snapshot'&&fact.sourceObject!=='command_receivable'),...debt.filter(fact=>fact.kind==='snapshot')]
   .map(fact=>({measure_id:fact.measureId,day:fact.businessDate,value:fact.value})).sort((left,right)=>left.measure_id.localeCompare(right.measure_id));
  assert.deepEqual((await read('a','2026-10-21')).sort((left,right)=>left.measure_id.localeCompare(right.measure_id)),expected);
  assert.deepEqual(await read('foreign','2026-10-21'),[]);
  assert.deepEqual(await read('a','2026-09-30'),[]);
 }finally{await fixture.db.close();}
});
