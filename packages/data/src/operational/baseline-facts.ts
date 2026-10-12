import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { validateProductionFact } from '@el-dabboos/domain';
import type { ProductionFact,SourceMapping } from '@el-dabboos/domain';
import { productionFactFromRow } from '../postgres/records.ts';
import { operationalFactKey } from './facts.ts';
import type { OperationalBaseline } from './contracts.ts';
/** Bounded baseline import copies certified facts into new history without changing originals. */
export async function copyBaselineFacts(client:PoolClient,baseline:OperationalBaseline,mappings:SourceMapping[],options:{requireExactHeads?:boolean}={}) {
 await client.query(`DECLARE operational_baseline NO SCROLL CURSOR FOR SELECT f.*,f.business_date::text business_date,f.rate_date::text rate_date FROM mart.canonical_facts f WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])
 AND NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id),jsonb_array_elements(part.capabilities->'releases') release,jsonb_array_elements(release->'capabilities') capability
 WHERE trusted.tenant_id=f.tenant_id AND member.family='facts' AND member.month=date_trunc('month',f.business_date)::date AND capability->>'metric'=f.measure_id)
 ORDER BY f.dataset_id,f.business_date,f.source_object,f.source_record_id,f.measure_id`,[baseline.tenantId,baseline.datasets]);
 let count=0;
 try {
  while(true) {
   const rows=(await client.query('FETCH FORWARD 500 FROM operational_baseline')).rows;if(!rows.length)break;
   const facts=rows.map(row=>normalizeBaselineFact(productionFactFromRow(row,mappings.find(mapping=>mapping.datasetId===row.dataset_id)!),baseline));
   await insertBaselinePage(client,baseline.tenantId,facts,options.requireExactHeads??false);count+=rows.length;
  }
 }finally{await client.query('CLOSE operational_baseline');}
 return count;
}
function normalizeBaselineFact(fact:ProductionFact,baseline:OperationalBaseline) {
 const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.measureId===fact.measureId&&rule.sourceObject===fact.sourceObject));if(!mapping)throw new Error('Baseline definition conflict');
 const normalized={...fact,datasetId:mapping.datasetId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion};validateProductionFact(normalized,mapping);return normalized;
}
async function insertBaselinePage(client:PoolClient,tenantId:string,facts:ProductionFact[],requireExactHeads:boolean) {
 const records=facts.map(fact=>({key:operationalFactKey(fact),revision:createHash('sha256').update(JSON.stringify(fact)).digest('hex'),payload:fact}));
 await client.query(`INSERT INTO mart.analytics_fact_revisions SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb) ON CONFLICT DO NOTHING`,[tenantId,JSON.stringify(records)]);
 await client.query(`INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) SELECT $1,record.key,record.revision FROM jsonb_to_recordset($2::jsonb) record(key text,revision text) ON CONFLICT DO NOTHING`,[tenantId,JSON.stringify(records)]);
 if(requireExactHeads){
  const mismatch=await client.query(`SELECT 1 FROM jsonb_to_recordset($2::jsonb) expected(key text,payload jsonb)
   LEFT JOIN mart.analytics_fact_heads head ON head.tenant_id=$1 AND head.fact_key=expected.key
   LEFT JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
   WHERE revision.payload IS DISTINCT FROM expected.payload LIMIT 1`,[tenantId,JSON.stringify(records)]);
  if(mismatch.rowCount)throw new Error('Certified historical identity differs from current canonical head');
 }
}
