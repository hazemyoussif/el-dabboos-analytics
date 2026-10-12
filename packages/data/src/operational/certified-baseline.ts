import type {PoolClient} from 'pg';
import {semanticCatalog} from '@el-dabboos/domain';
import type {PublishedAnalyticsCapabilities,PublishedAnalyticsRelease,PublishedMetricCapability,SourceMapping} from '@el-dabboos/domain';
import {certifiedMapping} from '../postgres/mapping-releases.ts';
import {assertCertifiedRelease} from '../postgres/release-transfer.ts';
import {projectPublishedRelease} from '../postgres/published-capabilities.ts';
import type {PublishedReconciliationCoverage,PublishedDerivedCoverage} from '../postgres/published-capabilities.ts';
import {operationalDefinitionVersion} from './definition-version.ts';
import type {OperationalBaseline} from './contracts.ts';

/** Read approved definitions AND exact stored certification, with no serving binding prerequisite. */
export async function certifiedBaseline(client:PoolClient,tenantId:string,datasets:readonly string[]):Promise<OperationalBaseline & {partitionCapabilities:Record<string,PublishedAnalyticsCapabilities>}> {
 const mappings:SourceMapping[]=[],releases:PublishedAnalyticsRelease[]=[];
 for(const datasetId of datasets){
  await assertCertifiedRelease(client,{tenantId,datasetId});
  const row=(await client.query('SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[tenantId,datasetId])).rows[0];
  const mapping=certifiedMapping(row);mappings.push(mapping);
  releases.push(...await certifiedCapabilities(client,mapping,row.approval_case_ids));
 }
 const first=mappings[0];
 if(!first||mappings.some(mapping=>mapping.sourceId!==first.sourceId||mapping.reportingCurrency!==first.reportingCurrency||mapping.mappingVersion!==first.mappingVersion))throw new Error('Single approved source/currency/mapping version required');
 const periods=releases.flatMap(release=>release.period?[release.period]:[]);
 if(!periods.length)throw new Error('Exact certified coverage required');
 const from=periods.map(period=>period.from).sort()[0]!,to=periods.map(period=>period.to).sort().at(-1)!;
 const capabilities:PublishedAnalyticsCapabilities={tenantId,mode:'certified',releases:[{...releases[0]!,period:{from,to},capabilities:intersectCapabilities(releases)}]};
 return {partitionCapabilities:monthlyCapabilities(tenantId,releases),tenantId,datasets:[...datasets],sourceId:first.sourceId,reportingCurrency:first.reportingCurrency,mappingVersion:first.mappingVersion,definitionVersion:operationalDefinitionVersion(),mappings:[...new Map(mappings.map(mapping=>[JSON.stringify(mapping.measures),mapping])).values()],capabilities,from:from.slice(0,7)+'-01',to};
}
async function certifiedCapabilities(client:PoolClient,mapping:SourceMapping,caseIds:string[]) {
 const coverage=(await client.query<PublishedReconciliationCoverage>(`SELECT specification->>'measureId' measure_id,specification->>'grouping' grouping,
 specification->>'from' period_from,specification->>'to' period_to,
 bool_and(status='passed' AND group_completeness AND (specification->>'expectedValue')::numeric=(specification->>'actualValue')::numeric
 AND (specification->>'expectedCount')::numeric=(specification->>'actualCount')::numeric
 AND (specification->'tolerance'->>'absoluteValue')::numeric=0 AND (specification->'tolerance'->>'absoluteCount')::numeric=0) exact,count(*)::text case_count
 FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2 AND case_id=ANY($3::text[]) GROUP BY 1,2,3,4`,[mapping.tenantId,mapping.datasetId,caseIds])).rows;
 if(coverage.some(row=>!row.exact))throw new Error('Zero-tolerance adoption evidence required');
 const derived=(await client.query<PublishedDerivedCoverage>(`SELECT metric,grouping,period_from::text,period_to::text,reference FROM mart.derived_metric_certifications
 WHERE tenant_id=$1 AND dataset_id=$2 AND mart.derived_inputs_exact(tenant_id,dataset_id,metric,grouping,period_from,period_to,case_ids)`,[mapping.tenantId,mapping.datasetId])).rows;
 return projectPublishedRelease(mapping,coverage,{tenantId:mapping.tenantId,locale:'en'},derived).releases;
}
function intersectCapabilities(releases:PublishedAnalyticsRelease[]):PublishedMetricCapability[] {
 const metrics=[...new Set(releases.flatMap(release=>release.capabilities.map(capability=>capability.metric)))];
 return metrics.map(metric=>{
  const peers=releases.flatMap(release=>release.capabilities.filter(capability=>capability.metric===metric));
  const first=peers[0]!,snapshot=semanticCatalog[metric].semantics.kind==='snapshot';
  const dimensions=first.dimensions.filter(dimension=>peers.every(peer=>peer.dimensions.includes(dimension)));
  return {...first,dimensions:[...new Set([...dimensions,'month' as const])],...(!snapshot?{analyses:['comparison','movingAverage','runningTotal','percentageContribution','ranking','topN'] as const,comparisons:['month_over_month'] as const,analysisDimensions:{comparison:['month' as const],movingAverage:['month' as const]},movingAverageWindows:[3,6]}:{})};
 });
}

function monthlyCapabilities(tenantId:string,releases:PublishedAnalyticsRelease[]):Record<string,PublishedAnalyticsCapabilities> {
 const months=new Map<string,PublishedAnalyticsRelease[]>();
 for(const release of releases){
  if(!release.period)continue;
  const start=new Date(release.period.from.slice(0,7)+'-01T00:00:00Z');
  for(;start.toISOString().slice(0,7)<=release.period.to.slice(0,7);start.setUTCMonth(start.getUTCMonth()+1)){
   const month=start.toISOString().slice(0,7),peers=months.get(month)??[];peers.push(release);months.set(month,peers);
  }
 }
 return Object.fromEntries([...months].map(([month,peers])=>[month,{tenantId,mode:'certified',releases:[{...peers[0]!,capabilities:intersectCapabilities(peers)}]}]));
}
