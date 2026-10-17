import {prepareActivatedPublication} from '../prepared/publication.ts';
import {assertAdoptionHeadParity} from './adoption-parity.ts';
import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {certifiedMapping} from '../postgres/mapping-releases.ts';
import {certifiedBaseline} from './certified-baseline.ts';
import {copyBaselineFacts} from './baseline-facts.ts';
import {refreshOperationalMonths} from './aggregates.ts';
import {readBaseline} from './baseline.ts';
import {attachFinancePartition} from './snapshot-promotion.ts';

/** Version 040 data migration. The migration runner owns this transaction and ledger write. */
export async function adoptLegacyServing(client:PoolClient) {
 const tenants=(await client.query('SELECT tenant_id FROM serving_adoption_tenants ORDER BY tenant_id')).rows;
 await client.query('ALTER TABLE mart.analytics_baselines DISABLE TRIGGER immutable_history');
 for(const row of tenants){
  await client.query("SELECT set_config('mart.tenant_id',$1,true)",[row.tenant_id]);
  await adoptCertifiedServing(client,row.tenant_id,true);
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');await client.query('SET CONSTRAINTS ALL DEFERRED');
 }
 await client.query('ALTER TABLE mart.analytics_baselines ENABLE TRIGGER immutable_history');
}

/** Explicit offline adoption, also used to initialize directly from approved certified datasets. */
export async function adoptCertifiedServing(client:PoolClient,tenantId:string,migration=false) {
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenantId}`]);
 const prior=(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[tenantId])).rows[0]?.revision_id as string|undefined;
 if(prior&&!migration)return {alreadyBootstrapped:true};
 const datasets=(await client.query(`SELECT dataset_id FROM mart.mapping_releases WHERE tenant_id=$1 AND approval_status='approved'
 AND ($2::boolean=false OR dataset_id IN(SELECT unnest(datasets) FROM mart.analytics_baselines WHERE tenant_id=$1
 UNION SELECT member.dataset_id FROM mart.historical_release_members member JOIN mart.historical_serving_bindings binding USING(tenant_id,reference) WHERE member.tenant_id=$1
 UNION SELECT dataset_id FROM mart.serving_bindings WHERE tenant_id=$1)) ORDER BY dataset_id`,[tenantId,migration])).rows.map(row=>String(row.dataset_id));
 const baseline=await certifiedBaseline(client,tenantId,datasets);
 const existing=(await client.query('SELECT * FROM mart.analytics_baselines WHERE tenant_id=$1',[tenantId])).rows[0];
 if(existing){
  if(existing.definition_version!==baseline.definitionVersion||existing.mapping_version!==baseline.mappingVersion)throw new Error('Explicit semantic migration required');
  // Keep operational recipes stable: existing heads and incremental source records use these IDs.
  const priorBaseline=await readBaseline(client,tenantId);
  const previousRecipes=new Set(priorBaseline.mappings.map(mapping=>JSON.stringify(mapping.measures)));
  baseline.mappings=[...priorBaseline.mappings,...baseline.mappings.filter(mapping=>!previousRecipes.has(JSON.stringify(mapping.measures)))];
  if(datasets.every(dataset=>existing.datasets.includes(dataset)))baseline.capabilities=existing.capabilities;
 }
 const values=[tenantId,baseline.sourceId,baseline.reportingCurrency,datasets,baseline.definitionVersion,baseline.mappingVersion,JSON.stringify(baseline.mappings),JSON.stringify(baseline.capabilities),baseline.from,baseline.to];
 await client.query(`INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 ON CONFLICT(tenant_id) DO UPDATE SET datasets=EXCLUDED.datasets,specification=EXCLUDED.specification,capabilities=EXCLUDED.capabilities,period_from=least(analytics_baselines.period_from,EXCLUDED.period_from),period_to=greatest(analytics_baselines.period_to,EXCLUDED.period_to)`,values);
 const mappings=(await client.query('SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])',[tenantId,datasets])).rows.map(certifiedMapping);
 if(prior){
  const priorParts=(await client.query("SELECT to_char(member.month,'YYYY-MM') AS month,part.capabilities FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id) WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='facts'",[tenantId,prior])).rows;
  for(const part of priorParts)if(!baseline.partitionCapabilities[part.month])baseline.partitionCapabilities[part.month]=part.capabilities;
 }
 await assertAdoptionHeadParity(client,tenantId);
 const canonicalFacts=await copyBaselineFacts(client,baseline,mappings);
 const cutoff=(await client.query("SELECT max(source_as_of) cutoff FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND status='committed'",[tenantId,datasets])).rows[0].cutoff?.toISOString();
 if(!cutoff)throw new Error('Immutable source cutoff required');
 const snapshots=migration?(await client.query('SELECT snapshot_id,snapshot_date::text FROM mart.finance_snapshot_publications WHERE tenant_id=$1 ORDER BY snapshot_date',[tenantId])).rows:[];
 const months=Object.keys(baseline.partitionCapabilities).sort();
 const revisionId=randomUUID();
 await refreshOperationalMonths(client,{tenantId,revisionId,parent:prior??null,runId:null,cutoff,purpose:'adoption',additionalAffectedMonths:snapshots.map(snapshot=>snapshot.snapshot_date.slice(0,7)),partitionCapabilities:baseline.partitionCapabilities},months);
 for(const snapshot of snapshots)await attachFinancePartition(client,{tenantId,revisionId,snapshotId:snapshot.snapshot_id,date:snapshot.snapshot_date});
 if(!migration)await prepareActivatedPublication(client,{tenantId,revisionId});
 await client.query('INSERT INTO mart.analytics_trusted_serving VALUES($1,$2) ON CONFLICT(tenant_id) DO UPDATE SET revision_id=EXCLUDED.revision_id',[tenantId,revisionId]);
 return {alreadyBootstrapped:false,revisionId,cutoff,canonicalFacts,months};
}
