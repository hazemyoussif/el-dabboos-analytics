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
import {pendingCommandInitialization} from '../../src/business/initialization-state.ts';
import {runCommandBackgroundUnit} from '../../src/business/initialization-worker.ts';
import {withSalesCommandRecipe} from '../../src/business/sales-command-mapping.ts';

test('sealed one-recipe capture is exact, immutable and private to ingestor',{skip:!enabled},async()=>{
 const db=await database();
 try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const base=await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'business'),'business');
  await tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:base.revisionId},{maxCellsPerChunk:100000,maxChunks:200}));
  await tenantTransaction(db.migrator,'a',client=>client.query("INSERT INTO mart.prepared_activation VALUES('a',$1,100000,200)",[base.revisionId]));
  const source=fixture('2026-09',false,'business',true),selectedMapping=withSalesCommandRecipe(fixture('2026-09').mapping,'command_invoice',false);
  const facts=[];for await(const page of source.facts)facts.push(...page.filter(fact=>fact.sourceObject==='command_invoice'));
  const cutoff='2026-11-03T09:00:00.000Z',revision='SYNTHETIC COMMAND NEXT';
  const captured=facts.map(fact=>({...fact,sourceAsOf:cutoff,sourceVersion:cutoff,frozenRevision:revision}));
  const controls=(await source.controls()).filter(control=>selectedMapping.measures.some(rule=>rule.sourceObject==='command_invoice'&&rule.measureId===control.measure));
  const candidateId=randomUUID();
  await tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.command_capture_candidates
   (tenant_id,candidate_id,month,source_object,base_revision,base_partition,mapping,source_cutoff,source_revision)
   VALUES('a',$1,'2026-09-01','command_invoice',$2,$3,$4,$5,$6)`,
   [candidateId,base.revisionId,base.partitionId,JSON.stringify(selectedMapping),cutoff,revision]));
  await tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.command_capture_facts VALUES($1,$2,0,$3)',
   ['a',candidateId,JSON.stringify(captured)]));
  await tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.command_capture_controls VALUES($1,$2,0,$3)',
   ['a',candidateId,JSON.stringify(controls)]));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query(
   'INSERT INTO mart.command_capture_seals VALUES($1,$2,1,1,$3,$4)',
   ['a',candidateId,captured.length,controls.length+1])),/Incomplete Command capture pages/);
  await tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.command_capture_seals VALUES($1,$2,1,1,$3,$4)',
   ['a',candidateId,captured.length,controls.length]));
  await assert.rejects(tenantTransaction(db.ingestor,'a',client=>client.query('INSERT INTO mart.command_capture_facts VALUES($1,$2,1,$3)',
   ['a',candidateId,JSON.stringify([captured[0]])])),/immutable/);
  await assert.rejects(tenantTransaction(db.runtime,'a',client=>client.query('SELECT * FROM mart.command_capture_facts')),/permission denied/);
  const trusted=(await tenantTransaction(db.runtime,'a',client=>client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a']),true)).rows[0].revision_id;
  assert.equal(trusted,base.revisionId);
  const oldCapability=(await tenantTransaction(db.runtime,'a',client=>client.query(`SELECT part.capabilities FROM mart.analytics_trusted_serving trusted
   JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
   WHERE trusted.tenant_id='a' AND member.family='business' AND member.month='2026-09-01'`),true)).rows[0].capabilities;
  assert.ok(oldCapability.releases[0].capabilities.every((capability:{metric:string})=>!capability.metric.startsWith('command_')));
  const interrupted=randomUUID();
  await tenantTransaction(db.ingestor,'a',client=>client.query(`INSERT INTO mart.command_capture_candidates
   SELECT tenant_id,$2,month,source_object,base_revision,base_partition,mapping,source_cutoff,source_revision
   FROM mart.command_capture_candidates WHERE tenant_id='a' AND candidate_id=$1`,[candidateId,interrupted]));
  assert.equal((await pendingCommandInitialization(db.ingestor,'a'))?.candidate_id,candidateId);
  assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.command_capture_abandoned WHERE candidate_id=$1',[interrupted])).rows[0].count,1);
  assert.equal((await tenantTransaction(db.ingestor,'b',client=>client.query('SELECT 1 FROM mart.command_capture_candidates'),true)).rowCount,0);
  const phases:string[]=[];let concurrentReview:string|undefined;let injectedRollback=false;
  for(let unit=0;unit<250;unit++){
   if(phases.at(-1)==='prepared_sealed'&&!concurrentReview){
    const privateWork=(await db.admin.query('SELECT revision_id FROM mart.command_initializations WHERE candidate_id=$1',[candidateId])).rows[0].revision_id;
    const privateBindings=await tenantTransaction(db.runtime,'a',client=>client.query(
     'SELECT 1 FROM mart.prepared_bindings WHERE tenant_id=$1 AND revision_id=$2',['a',privateWork]),true);
    assert.equal(privateBindings.rowCount,0,'sealed private preparation remains invisible');
    concurrentReview=(await exposeReviewMonth(db.ingestor,fixture('2026-08',false,'review'),'review')).partitionId;
    await db.admin.query(`CREATE FUNCTION mart.synthetic_command_publish_failure() RETURNS trigger LANGUAGE plpgsql AS $$
     BEGIN RAISE EXCEPTION 'SYNTHETIC command promotion rollback'; END $$;
     CREATE TRIGGER synthetic_command_publish_failure BEFORE UPDATE ON mart.analytics_trusted_serving
     FOR EACH ROW EXECUTE FUNCTION mart.synthetic_command_publish_failure()`);
    const before=(await db.admin.query('SELECT count(*)::int count FROM mart.analytics_serving_revisions')).rows[0].count;
    await assert.rejects(runCommandBackgroundUnit({mart:db.ingestor,tenantId:'a',actorId:'synthetic',trigger:'operator',
     openSource:async()=>{throw new Error('No source on publication retry');}}),/SYNTHETIC command promotion rollback/);
    assert.equal((await db.admin.query('SELECT count(*)::int count FROM mart.analytics_serving_revisions')).rows[0].count,before);
    await db.admin.query('DROP TRIGGER synthetic_command_publish_failure ON mart.analytics_trusted_serving');
    injectedRollback=true;
   }
   const result=await runCommandBackgroundUnit({mart:db.ingestor,tenantId:'a',actorId:'synthetic',trigger:'operator',
    openSource:async()=>{throw new Error('Sealed capture must resume offline');}});
   if(result.phase!=='published'){
    const partition=(await db.admin.query('SELECT partition_id FROM mart.command_initializations WHERE candidate_id=$1',[candidateId])).rows[0]?.partition_id;
    if(partition)assert.equal((await tenantTransaction(db.runtime,'a',client=>client.query(
     'SELECT 1 FROM mart.review_facts WHERE tenant_id=$1 AND partition_id=$2',['a',partition]),true)).rowCount,0,'private canonical pages remain invisible');
   }
   phases.push(result.phase);
   if(result.phase==='published')break;
  }
  assert.equal(phases.at(-1),'published');
  assert.ok(injectedRollback);
  const retained=(await tenantTransaction(db.runtime,'a',client=>client.query(`SELECT member.partition_id
   FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   WHERE trusted.tenant_id='a' AND member.family='review' AND member.month='2026-08-01'`),true)).rows[0]?.partition_id;
  assert.equal(retained,concurrentReview);
  assert.ok(phases.includes('canonical_fact_page'));
  assert.ok(phases.includes('prepared_chunk'));
  const served=(await tenantTransaction(db.runtime,'a',client=>client.query(`SELECT extraction.mapping
   FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
   WHERE trusted.tenant_id='a' AND member.family='business' AND member.month='2026-09-01'`),true)).rows[0].mapping;
  assert.ok(served.capabilities.some((capability:{metric:string})=>capability.metric==='command_invoice_total'));
  assert.ok(!served.capabilities.some((capability:{metric:string})=>capability.metric==='command_same_day_rate'));

 }finally{await db.close();}
});
