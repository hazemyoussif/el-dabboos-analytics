import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import {runCommandBackgroundUnit} from '../../src/business/initialization-worker.ts';
import {commandOnlyMapping} from '../../src/business/sales-command-mapping.ts';

test('new month publishes only its completed recipe and preserves accepted historical raw rows',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const legacy=fixture('2026-09',false,'business');
  const base=await exposeReviewMonth(db.ingestor,legacy,'business');
  await tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:base.revisionId},{maxCellsPerChunk:100000,maxChunks:200}));
  await tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.prepared_activation VALUES('a',$1,100000,200)",[base.revisionId]));
  const before=(await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[base.partitionId])).rows;
  const source=fixture('2026-10',true,'business',true),selected=commandOnlyMapping(legacy.mapping,'command_invoice',true,source.mapping.datasetId);
  const facts=[];for await(const page of source.facts)facts.push(...page.filter(fact=>fact.sourceObject==='command_invoice'));
  const cutoff='2026-11-03T09:00:00.000Z',revision='SYNTHETIC NEW MONTH';
  const captured=facts.map(fact=>({...fact,sourceAsOf:cutoff,sourceVersion:cutoff,frozenRevision:revision}));
  const controls=(await source.controls()).filter(control=>selected.measures.some(rule=>rule.measureId===control.measure));
  const candidate=randomUUID();
  await tenantTransaction(db.ingestor,'a',async client=>{
   await client.query(`INSERT INTO mart.command_capture_candidates VALUES('a',$1,'2026-10-01','command_invoice',$2,NULL,$3,$4,$5)`,
    [candidate,base.revisionId,JSON.stringify(selected),cutoff,revision]);
   await client.query("INSERT INTO mart.command_capture_facts VALUES('a',$1,0,$2)",[candidate,JSON.stringify(captured)]);
   await client.query("INSERT INTO mart.command_capture_controls VALUES('a',$1,0,$2)",[candidate,JSON.stringify(controls)]);
   await client.query("INSERT INTO mart.command_capture_seals VALUES('a',$1,1,1,$2,$3)",[candidate,captured.length,controls.length]);
  });
  let phase='';
  for(let unit=0;unit<250&&phase!=='published';unit++)phase=(await runCommandBackgroundUnit({mart:db.ingestor,tenantId:'a',actorId:'synthetic',trigger:'operator',
   openSource:async()=>{throw new Error('Completed capture must not reopen source');}})).phase;
  assert.equal(phase,'published');
  assert.deepEqual((await db.admin.query('SELECT fact_key,payload FROM mart.review_facts WHERE partition_id=$1 ORDER BY fact_key',[base.partitionId])).rows,before);
  const accepted=(await tenantTransaction(db.runtime,'a',client=>client.query(`SELECT extraction.mapping
   FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
   WHERE trusted.tenant_id='a' AND member.family='business' AND member.month='2026-10-01'`),true)).rows[0].mapping;
  assert.ok(accepted.measures.every((rule:{sourceObject:string})=>rule.sourceObject==='command_invoice'));
  assert.ok(!accepted.capabilities.some((capability:{metric:string})=>capability.metric==='command_same_day_rate'));
 }finally{await db.close();}
});
