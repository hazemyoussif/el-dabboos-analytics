import test from 'node:test';
import assert from 'node:assert/strict';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {snapshotSource} from './snapshot-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {PreparedAnalyticsRepository} from '../../src/prepared/repository.ts';

test('prepared snapshot serving reduces 100000 source items in the background and reads customer rollups interactively',{skip:!enabled,timeout:180000},async testContext=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const inputs=Array.from({length:100000},(_,index)=>({measure:'receivables_due_for_collection' as const,entity:'item:'+index,customer:String(index%1000).padStart(4,'0'),value:'1.000000'}));
  await exposeReviewMonth(db.ingestor,await snapshotSource('2026-09','review',inputs),'review');
  const revisionId=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id;
  const preparationStart=performance.now();
  await tenantTransaction(db.ingestor,'a',async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['analytics:a']);
   await prepareRevision(client,{tenantId:'a',revisionId},{maxCellsPerChunk:50000,maxChunks:100});
  },'repeatable-write',120000);
  const preparationMs=performance.now()-preparationStart;
  const repository=new PreparedAnalyticsRepository(db.runtime,{reportingCurrencies:{a:'IQD'},statementTimeoutMs:15000,maxGroups:4000});
  const context={tenantId:'a',locale:'en' as const},dateRange={from:'2026-09-01',to:'2026-09-30'};
  const elapsed=[];
  for(let sample=0;sample<3;sample++){
   const start=performance.now(),result=await repository.execute({metric:'receivables_due_for_collection',groupBy:'customer',dateRange,analysis:{topN:{direction:'top',limit:100}}},context);
   elapsed.push(performance.now()-start);assert.equal(result.rows.length,100);assert.ok(result.rows.every(row=>row.value===100));
  }
  assert.equal((await repository.execute({metric:'receivables_due_for_collection',dateRange},context)).rows[0]?.value,100000);
  const rows=(await db.admin.query(`SELECT count(*)::int count FROM mart.prepared_cells cell JOIN mart.prepared_bindings binding USING(tenant_id,data_id)
   WHERE binding.tenant_id='a' AND binding.revision_id=$1 AND binding.family='review' AND cell.measure_id='receivables_due_for_collection'
   AND cell.time_grain='cutoff' AND cell.grain_id='["customer"]'`,[revisionId])).rows[0].count;
  assert.equal(rows,1000,'interactive customer population must be prepared rollups, not source items');
  const storage=(await db.admin.query("SELECT pg_total_relation_size('mart.review_facts')::text source_bytes,pg_total_relation_size('mart.prepared_cells')::text prepared_bytes")).rows[0];
  testContext.diagnostic(JSON.stringify({diagnostic:'synthetic local scale sample; not a company dashboard SLA',sourceItems:100000,preparedCustomerRows:rows,preparationMs,queryMs:elapsed,...storage}));
 }finally{await db.close();}
});
