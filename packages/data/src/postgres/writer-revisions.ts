import type { PoolClient } from 'pg';
import { factTransition, productionFactIdentity } from '@el-dabboos/domain';
import type { ProductionFact, SourceMapping } from '@el-dabboos/domain';
import { factColumns, productionFactFromRow } from './records.ts';
import { insertMartRow } from './writer-persistence.ts';
import type { WriteCounters } from './writer-persistence.ts';

async function claimSnapshot(client: PoolClient,fact: ProductionFact,key: string): Promise<void> {
  await client.query('INSERT INTO mart.snapshot_owners(tenant_id,dataset_id,measure_id,entity_id,effective_date,fact_key) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[fact.tenantId,fact.datasetId,fact.measureId,fact.entityId,fact.businessDate,key]);
  const owner = (await client.query('SELECT fact_key FROM mart.snapshot_owners WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND entity_id=$4 AND effective_date=$5',[fact.tenantId,fact.datasetId,fact.measureId,fact.entityId,fact.businessDate])).rows[0];
  if (owner?.fact_key!==key) throw new Error('Ambiguous snapshot ownership');
}
export async function writeRevision(client: PoolClient,fact: ProductionFact,mapping: SourceMapping,counters: WriteCounters): Promise<void> {
  const key = productionFactIdentity(fact);
  const previous = (await client.query(`SELECT revision.*,revision.business_date::text AS business_date,revision.rate_date::text AS rate_date FROM mart.fact_heads head JOIN mart.fact_revisions revision USING (tenant_id,dataset_id,fact_key,source_revision)
    WHERE head.tenant_id=$1 AND head.dataset_id=$2 AND head.fact_key=$3 FOR UPDATE OF head`,[fact.tenantId,fact.datasetId,key])).rows[0];
  const transition = factTransition(previous ? productionFactFromRow(previous,mapping) : undefined,fact,mapping);
  if (transition==='replay') counters.factsReplayed++;
  else {
    await insertMartRow(client,'fact_revisions',factColumns(fact));
    await client.query('INSERT INTO mart.fact_heads(tenant_id,dataset_id,fact_key,source_revision) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,dataset_id,fact_key) DO UPDATE SET source_revision=EXCLUDED.source_revision',[fact.tenantId,fact.datasetId,key,fact.sourceRevision]);
    if (fact.status==='tombstone') counters.factsTombstoned++;
    else if (transition==='insert') counters.factsInserted++;
    else counters.factsUpdated++;
    if (fact.kind==='snapshot') await claimSnapshot(client,fact,key);
  }
  await insertMartRow(client,'batch_facts',{ tenant_id: fact.tenantId,dataset_id: fact.datasetId,batch_id: fact.batchId,fact_key: key,source_revision: fact.sourceRevision });
}
