import test from 'node:test';
import assert from 'node:assert/strict';
import {enabled} from './support.ts';
import {deltaFixture} from './business-delta-fixture.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

test('event preparation reads selected canonical members without the shared all-history view',{skip:!enabled},async()=>{
 const fixture=await deltaFixture(false);
 try{
  const expected=fixture.initial.filter(fact=>fact.kind==='event');
  await fixture.db.admin.query('REVOKE SELECT ON mart.review_fact_population FROM dabboos_ingestor');
  const rows=await tenantTransaction(fixture.db.ingestor,'a',async client=>(await client.query(`SELECT measure_id,amount::numeric(30,6)::text value FROM mart.prepared_work_input_rows($1,$2,'business','event','2026-10-01','2026-10-20') ORDER BY measure_id`,['a',fixture.accepted.revisionId])).rows,true);
  assert.deepEqual(rows,expected.map(fact=>({measure_id:fact.measureId,value:fact.value})).sort((left,right)=>left.measure_id.localeCompare(right.measure_id)));
  const foreign=await tenantTransaction(fixture.db.ingestor,'foreign',async client=>(await client.query(`SELECT * FROM mart.prepared_work_input_rows('a',$1,'business','event','2026-10-01','2026-10-20')`,[fixture.accepted.revisionId])).rows,true);
  assert.deepEqual(foreign,[]);
  const missing=await tenantTransaction(fixture.db.ingestor,'a',async client=>(await client.query(`SELECT * FROM mart.prepared_work_input_rows('a',$1,'business','event','2026-09-01','2026-09-30')`,[fixture.accepted.revisionId])).rows,true);
  assert.deepEqual(missing,[]);
 }finally{await fixture.db.close();}
});
