import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';

const comparison=`WITH canonical AS MATERIALIZED (
 SELECT * FROM mart.prepared_input_rows($1,$2,$3) fact
 WHERE kind=$4 AND business_day<=$6::date AND (kind='snapshot' OR business_day>=$5::date)
),scoped AS MATERIALIZED (
 SELECT * FROM mart.prepared_work_input_rows($1,$2,$3,$4,$5::date,$6::date)
),differences AS (
 (SELECT * FROM canonical EXCEPT ALL SELECT * FROM scoped)
 UNION ALL (SELECT * FROM scoped EXCEPT ALL SELECT * FROM canonical)
) SELECT (SELECT count(*)::int FROM canonical) population,(SELECT count(*)::int FROM differences) mismatches`;

test('month-scoped preparation preserves event operands, snapshot history, pinned revisions and tenant isolation',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  for(const family of ['review','business'] as const){
   const first=await exposeReviewMonth(db.ingestor,fixture('2026-08',false,family),family);
   const second=await exposeReviewMonth(db.ingestor,fixture('2026-09',false,family),family);
   let populated=0;
   for(const revisionId of [first.revisionId,second.revisionId])for(const kind of ['event','snapshot']){
    for(const [from,through] of [['2026-08-01','2026-08-31'],['2026-09-01','2026-09-30'],['2026-08-15','2026-09-14'],['2026-08-16','2026-09-16'],['2026-10-01','2026-10-31']]){
     await tenantTransaction(db.ingestor,'a',async client=>{
      const result=(await client.query(comparison,['a',revisionId,family,kind,from,through])).rows[0];
      assert.equal(result.mismatches,0,`${family} ${kind} ${from}..${through}`);
      populated+=result.population;
     },true);
    }
   }
   assert.ok(populated>0);
   await tenantTransaction(db.ingestor,'b',async client=>{
    for(const kind of ['event','snapshot']){
     assert.equal((await client.query('SELECT * FROM mart.prepared_work_input_rows($1,$2,$3,$4,$5,$6)',
      ['a',second.revisionId,family,kind,'2026-08-01','2026-09-30'])).rowCount,0);
    }
   },true);
   await assert.rejects(db.runtime.query('SELECT * FROM mart.prepared_work_input_rows($1,$2,$3,$4,$5,$6)',
    ['a',second.revisionId,family,'event','2026-08-01','2026-09-30']),/permission denied/);
  }
  const revisionId=(await tenantTransaction(db.ingestor,'a',client=>client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'"),true)).rows[0].revision_id;
  await tenantTransaction(db.ingestor,'a',async client=>{
   for(const kind of ['event','snapshot']){
    assert.equal((await client.query(comparison,['a',revisionId,'facts',kind,'2026-09-01','2026-09-30'])).rows[0].mismatches,0);
   }
  },true);
 }finally{await db.close();}
});
