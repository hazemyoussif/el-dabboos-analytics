import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {database,enabled} from './support.ts';
import {deploy,mapping} from './fixtures.ts';
import {fixture,pages} from './business-fixture.ts';
import {bootstrapOperationalServing} from '../../src/operational/baseline.ts';
import {exposeReviewMonth} from '../../src/review/exposure.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {withSalesCommandRecipe} from '../../src/business/sales-command-mapping.ts';
import {businessCapabilities,businessDefinitionVersion} from '../../src/business/definitions.ts';

type DB=Awaited<ReturnType<typeof database>>;
async function privateInvoiceCandidate(db:DB){
 const base=await exposeReviewMonth(db.ingestor,fixture('2026-09',false,'business'),'business');
 const source=fixture('2026-09',false,'business',true);
 const selected=withSalesCommandRecipe(fixture('2026-09').mapping,'command_invoice',false);
 const facts=[];for await(const page of source.facts)facts.push(...page.filter(fact=>fact.sourceObject==='command_invoice'));
 const cutoff='2026-11-03T09:00:00.000Z',revision='SYNTHETIC COMMAND NEXT';
 const changed=facts.map(fact=>({...fact,sourceAsOf:cutoff,sourceVersion:cutoff,frozenRevision:revision}));
 const controls=(await source.controls()).filter(control=>selected.measures.some(rule=>rule.sourceObject==='command_invoice'&&rule.measureId===control.measure));
 const partitionId=randomUUID(),revisionId=randomUUID();
 await tenantTransaction(db.ingestor,'a',async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['analytics:a']);
  await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,capabilities) VALUES('a',$1,'2026-09-01','business',$2)",
   [partitionId,JSON.stringify(businessCapabilities(selected,{month:'2026-09',cutoff,reference:`technical-exact:${partitionId}`}))]);
  await client.query(`INSERT INTO mart.review_extractions
   (tenant_id,partition_id,month,source_id,currency,source_cutoff,source_revision,definition_version,mapping,completed)
   VALUES('a',$1,'2026-09-01','fixture','IQD',$2,$3,$4,$5,true)`,
   [partitionId,cutoff,revision,businessDefinitionVersion(),JSON.stringify(selected)]);
  await client.query("INSERT INTO mart.business_delta_origins VALUES('a',$1,$2,$3)",[partitionId,base.revisionId,base.partitionId]);
  await client.query("INSERT INTO mart.business_delta_storage VALUES('a',$1)",[partitionId]);
  await client.query(`INSERT INTO mart.review_facts(tenant_id,partition_id,fact_key,payload)
   SELECT 'a',$1,format('[%s,%s,"whole",%s]',to_json(fact->>'sourceObject')::text,
    to_json(fact->>'sourceRecordId')::text,to_json(fact->>'measureId')::text),fact
   FROM jsonb_array_elements($2::jsonb) fact`,[partitionId,JSON.stringify(changed)]);
  await client.query(`INSERT INTO mart.business_delta_replacements
   SELECT DISTINCT 'a',$1,fact->>'sourceObject',fact->>'sourceRecordId' FROM jsonb_array_elements($2::jsonb) fact`,
   [partitionId,JSON.stringify(changed)]);
  await client.query(`INSERT INTO mart.business_delta_checked_roots
   SELECT tenant_id,partition_id,source_object,source_record_id FROM mart.business_delta_replacements
   WHERE tenant_id='a' AND partition_id=$1`,[partitionId]);
  await client.query(`INSERT INTO mart.review_controls
   SELECT tenant_id,$1,measure_id,scope_key,dimensions,expected_value,expected_count FROM mart.review_controls
   WHERE tenant_id='a' AND partition_id=$2`,[partitionId,base.partitionId]);
  await client.query(`INSERT INTO mart.review_controls
   SELECT 'a',$1,control->>'measure',CASE WHEN control->'dimensions'='null'::jsonb THEN 'summary'
    ELSE encode(sha256(convert_to((control->'dimensions')::text,'UTF8')),'hex') END,
    nullif(control->'dimensions','null'::jsonb),(control->>'value')::numeric,(control->>'count')::bigint
   FROM jsonb_array_elements($2::jsonb) control`,[partitionId,JSON.stringify(controls)]);
  await client.query(`INSERT INTO mart.business_delta_source_evidence
   SELECT 'a',$1,control->>'measure',CASE WHEN control->'dimensions'='null'::jsonb THEN 'summary'
    ELSE encode(sha256(convert_to((control->'dimensions')::text,'UTF8')),'hex') END,
    nullif(control->'dimensions','null'::jsonb),(control->>'value')::numeric,(control->>'count')::bigint
   FROM jsonb_array_elements($2::jsonb) control`,[partitionId,JSON.stringify(controls)]);
  await client.query(`INSERT INTO mart.business_recipe_observations
   SELECT DISTINCT ON(rule->>'sourceObject') 'a',$1,rule->>'sourceObject',observed.source_cutoff,
    observed.source_revision,observed.business_day FROM mart.review_extractions extraction,
    LATERAL jsonb_array_elements(extraction.mapping->'measures') rule,
    LATERAL mart.business_measure_observation('a',$2,rule->>'measureId') observed
   WHERE extraction.tenant_id='a' AND extraction.partition_id=$2
   ORDER BY rule->>'sourceObject'`,[partitionId,base.partitionId]);
  await client.query("INSERT INTO mart.business_recipe_observations VALUES('a',$1,'command_invoice',$2,$3,'2026-09-30')",
   [partitionId,cutoff,revision]);
  assert.equal((await client.query('SELECT mart.business_partition_exact($1,$2) exact',['a',partitionId])).rows[0].exact,true);
  await client.query(`INSERT INTO mart.analytics_serving_revisions
   (tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose)
   VALUES('a',$1,$2,$3,ARRAY['2026-09-01'::date],'business')`,[revisionId,base.revisionId,cutoff]);
  await client.query(`INSERT INTO mart.analytics_serving_members
   SELECT tenant_id,$1,month,partition_id,family FROM mart.analytics_serving_members
   WHERE tenant_id='a' AND revision_id=$2 AND NOT(family='business' AND month='2026-09-01')`,[revisionId,base.revisionId]);
  await client.query("INSERT INTO mart.analytics_serving_members VALUES('a',$1,'2026-09-01',$2,'business')",[revisionId,partitionId]);
 });
 return {base,partitionId,revisionId,cutoff};
}

test('private exact Business candidate remains invisible and can join a newer same-base parent',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const candidate=await privateInvoiceCandidate(db);
  assert.equal((await tenantTransaction(db.runtime,'a',client=>client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a']),true)).rows[0].revision_id,candidate.base.revisionId);
  const review=await exposeReviewMonth(db.ingestor,fixture('2026-08',false,'review'),'review');
  const rebased=randomUUID();
  await tenantTransaction(db.ingestor,'a',async client=>{
   await client.query(`INSERT INTO mart.analytics_serving_revisions
    (tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose)
    VALUES('a',$1,$2,$3,ARRAY['2026-09-01'::date],'business')`,[rebased,review.revisionId,candidate.cutoff]);
   await client.query(`INSERT INTO mart.analytics_serving_members
    SELECT tenant_id,$1,month,partition_id,family FROM mart.analytics_serving_members
    WHERE tenant_id='a' AND revision_id=$2 AND NOT(family='business' AND month='2026-09-01')`,[rebased,review.revisionId]);
   await client.query("INSERT INTO mart.analytics_serving_members VALUES('a',$1,'2026-09-01',$2,'business')",[rebased,candidate.partitionId]);
  });
  assert.equal((await tenantTransaction(db.runtime,'a',client=>client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',['a']),true)).rows[0].revision_id,review.revisionId);
 }finally{await db.close();}
});

test('a second private membership cannot reuse a candidate after its accepted Business base changes',{skip:!enabled},async()=>{
 const db=await database();try{
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const candidate=await privateInvoiceCandidate(db);
  const next=fixture('2026-09',false,'business'),facts=[];
  for await(const page of next.facts)facts.push(...page);
  const cutoff='2026-11-04T09:00:00.000Z',revision='SYNTHETIC CHANGED BASE';
  const changed=await exposeReviewMonth(db.ingestor,{...next,cutoff,revision,
   facts:pages(facts.map(fact=>({...fact,sourceAsOf:cutoff,sourceVersion:cutoff,frozenRevision:revision})))},'business');
  const rebased=randomUUID();
  await assert.rejects(tenantTransaction(db.ingestor,'a',async client=>{
   await client.query(`INSERT INTO mart.analytics_serving_revisions
    (tenant_id,revision_id,parent_revision,cutoff,affected_months,purpose)
    VALUES('a',$1,$2,$3,ARRAY['2026-09-01'::date],'business')`,[rebased,changed.revisionId,candidate.cutoff]);
   await client.query(`INSERT INTO mart.analytics_serving_members
    SELECT tenant_id,$1,month,partition_id,family FROM mart.analytics_serving_members
    WHERE tenant_id='a' AND revision_id=$2 AND NOT(family='business' AND month='2026-09-01')`,[rebased,changed.revisionId]);
   await client.query("INSERT INTO mart.analytics_serving_members VALUES('a',$1,'2026-09-01',$2,'business')",[rebased,candidate.partitionId]);
  }),/Business delta publication parent conflict/);
 }finally{await db.close();}
});
