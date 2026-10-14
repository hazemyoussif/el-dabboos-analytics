import type {PoolClient} from 'pg';

interface LegacyFinanceAnchor {tenantId:string;datasetId:string;snapshotIds:string[]}

/** Version 040 adopts Finance snapshots independently from operational event recipes.
 * Temporarily withdraw only a standalone, differently versioned Finance anchor on
 * the same migration transaction; restore its exact certified binding before commit.
 * Released migration bytes and immutable approval/evidence records stay untouched.
 */
export async function stageLegacyFinanceAnchors(client:PoolClient):Promise<LegacyFinanceAnchor[]> {
 const anchors:LegacyFinanceAnchor[]=[];
 const tenants=(await client.query<{tenant_id:string}>('SELECT tenant_id FROM serving_adoption_tenants ORDER BY tenant_id')).rows;
 for(const tenant of tenants){
  await client.query("SELECT set_config('mart.tenant_id',$1,true)",[tenant.tenant_id]);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`analytics:${tenant.tenant_id}`]);
  const candidate=(await client.query<{dataset_id:string}>(`SELECT binding.dataset_id
   FROM mart.serving_bindings binding JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id)
   JOIN mart.analytics_baselines baseline USING(tenant_id)
   WHERE binding.tenant_id=$1 AND mapping.mapping_version<>baseline.mapping_version
   AND mapping.source_id=baseline.source_id AND mapping.reporting_currency=baseline.reporting_currency
   AND NOT binding.dataset_id=ANY(baseline.datasets)
   AND NOT EXISTS(SELECT 1 FROM mart.historical_release_members member WHERE member.tenant_id=binding.tenant_id AND member.dataset_id=binding.dataset_id)
   FOR UPDATE OF binding`,[tenant.tenant_id])).rows[0];
  if(!candidate)continue;
  const snapshots=(await client.query<{snapshot_id:string;exact:boolean}>(`SELECT evidence.snapshot_id,
   mart.finance_snapshot_exact(evidence.tenant_id,evidence.snapshot_id) exact
   FROM mart.finance_snapshot_evidence evidence JOIN mart.finance_snapshot_publications publication USING(tenant_id,snapshot_id)
   WHERE evidence.tenant_id=$1 AND evidence.anchor_dataset=$2 ORDER BY evidence.snapshot_id`,[tenant.tenant_id,candidate.dataset_id])).rows;
  if(!snapshots.length||snapshots.some(snapshot=>!snapshot.exact))throw new Error('Standalone Finance anchor requires exact published snapshots');
  await client.query('DELETE FROM mart.serving_bindings WHERE tenant_id=$1 AND dataset_id=$2',[tenant.tenant_id,candidate.dataset_id]);
  anchors.push({tenantId:tenant.tenant_id,datasetId:candidate.dataset_id,snapshotIds:snapshots.map(snapshot=>snapshot.snapshot_id)});
 }
 return anchors;
}

export async function restoreLegacyFinanceAnchors(client:PoolClient,anchors:readonly LegacyFinanceAnchor[]):Promise<void> {
 for(const anchor of anchors){
  await client.query("SELECT set_config('mart.tenant_id',$1,true)",[anchor.tenantId]);
  const coverage=(await client.query<{count:number}>(`SELECT count(*)::int count FROM mart.analytics_trusted_serving trusted
   JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.analytics_partitions partition USING(tenant_id,partition_id)
   WHERE trusted.tenant_id=$1 AND member.family='receivables' AND partition.snapshot_id=ANY($2::text[])
   AND mart.finance_snapshot_exact(partition.tenant_id,partition.snapshot_id)`,[anchor.tenantId,anchor.snapshotIds])).rows[0];
  if(coverage?.count!==anchor.snapshotIds.length)throw new Error('Legacy Finance snapshots must all survive adoption');
  // The unchanged serving-certification trigger rechecks the original approval.
  await client.query('INSERT INTO mart.serving_bindings(tenant_id,dataset_id) VALUES($1,$2)',[anchor.tenantId,anchor.datasetId]);
 }
}
