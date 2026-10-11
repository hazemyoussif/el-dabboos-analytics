import type { Pool, PoolClient } from 'pg';
import { publishedQueryIssues, DimensionDiscoveryLimitError, UncertifiedDimensionError, categoricalDimensions, certifiedDimensions, requiredMeasures, semanticCatalog, validateQuery, validateSourceMapping } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, DimensionId, DimensionValueRepository, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { projectPublishedRelease } from './published-capabilities.ts';
import { readDerivedCoverage } from './read-derived-coverage.ts';
import type { PublishedReconciliationCoverage } from './published-capabilities.ts';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import {queryRows} from './query-rows.ts';
import { readEventDimensionOptions,dimensionLabelField,sourceDisplayLabel } from './query-labels.ts';
import { queryMetadata } from './query-metadata.ts';
import { analyzeRows } from './query-analysis.ts';
import { certifiedMapping } from './mapping-releases.ts';
import { dimensionSql, filterSql } from './sql.ts';
import { prepareDatasetScope } from './dataset-scope.ts';

export interface PostgresRepositoryOptions {
  storedProofsOnly?:boolean;
  reportingCurrencies: Readonly<Record<string,string>>;
  /** Trusted composition only; runtime RLS requires explicit historical membership. */
  historicalDatasetId?: string;
  /** Complete approved event members, resolved server-side; never request input. */
  historicalEventDatasets?: readonly string[];
  /** Trusted metadata configuration, resolved freshly; never a query/client currency. */
  reportingCurrency?: (tenantId: string) => Promise<string | null>; clock?: () => Date;
  maxGroups?: number; maxDateSpanDays?: number; statementTimeoutMs?: number;
}
export class PostgresAnalyticsRepository implements AnalyticsRepository, DimensionValueRepository {
  private readonly maxGroups: number;
  constructor(private readonly pool: Pool, private readonly options: PostgresRepositoryOptions) {
    this.maxGroups = options.maxGroups ?? 1000;
    if (!Number.isInteger(this.maxGroups) || this.maxGroups < 1 || this.maxGroups > 5000 || !Number.isInteger(options.maxDateSpanDays ?? 3660) || (options.maxDateSpanDays ?? 3660) < 1) throw new Error('Invalid PostgreSQL query bounds');
  }
  private async release(client: PoolClient, context: AnalyticsContext): Promise<SourceMapping> {
    const historical = this.options.historicalDatasetId;
    const selected = historical ? await client.query(`SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='approved'`,[context.tenantId,historical]) : await client.query(`SELECT m.* FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=$1 AND m.approval_status='approved'`, [context.tenantId]);
    const row = selected.rows[0];
    if (!row) throw new Error('No approved serving binding');
    const m = certifiedMapping(row); validateSourceMapping(m);
    const trustedCurrency = this.options.reportingCurrency ? await this.options.reportingCurrency(context.tenantId) : this.options.reportingCurrencies[context.tenantId];
    if (m.approval.status !== 'approved' || m.tenantId !== context.tenantId || m.datasetId !== row.dataset_id || m.sourceId !== row.source_id || m.mappingVersion !== row.mapping_version || m.mappingId !== row.mapping_id || m.reportingCurrency !== row.reporting_currency || m.reportingCurrency !== trustedCurrency) throw new Error('Uncertified binding/reporting currency mismatch');
    return m;
  }
  async getPublishedCapabilities(context: AnalyticsContext, query?: AnalyticsQuery): Promise<PublishedAnalyticsCapabilities> {
    return tenantTransaction(this.pool,context.tenantId,async client => {
      if(this.options.storedProofsOnly)await client.query("SELECT set_config('mart.stored_proofs_only','on',true)");
      if (!this.options.historicalDatasetId && !(await client.query('SELECT 1 FROM mart.serving_bindings WHERE tenant_id=$1',[context.tenantId])).rowCount) return { tenantId: context.tenantId,mode: 'certified',releases: [] };
      const mapping = await this.release(client,context);
      const coverage = (await client.query<PublishedReconciliationCoverage>('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',[context.tenantId,mapping.datasetId])).rows;
      const derived=await readDerivedCoverage(client,context.tenantId,mapping.datasetId,{metrics:mapping.capabilities.filter(capability=>semanticCatalog[capability.metric].semantics.kind==='ratio' && (!query || capability.metric===query.metric)).map(capability=>capability.metric)});
      return projectPublishedRelease(mapping,coverage,context,derived);
    },true,this.options.statementTimeoutMs ?? 15000);
  }
  async isDataReady(tenantId: string): Promise<boolean> {
    return tenantTransaction(this.pool, tenantId, async client => {
      if(this.options.storedProofsOnly)await client.query("SELECT set_config('mart.stored_proofs_only','on',true)");
      if (!this.options.historicalDatasetId && !(await client.query("SELECT 1 FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=$1 AND m.approval_status='approved'", [tenantId])).rowCount) return false;
      await this.release(client, { tenantId, locale: 'en' }); return true;
    });
  }
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    validateQuery(query,context);
    if (query.dateRange && (Date.parse(query.dateRange.to)-Date.parse(query.dateRange.from))/86400000+1 > (this.options.maxDateSpanDays ?? 3660)) throw new Error('Date span exceeds technical bound');
    return tenantTransaction(this.pool,context.tenantId,async client => {
      if(this.options.storedProofsOnly)await client.query("SELECT set_config('mart.stored_proofs_only','on',true)");
      const mapping = await this.release(client,context);
      await this.validatePublishedOutput(client,query,context,mapping);
      const certified = certifiedDimensions(mapping,query.metric);
      if (!mapping.capabilities.some(c => c.metric === query.metric) || query.groupBy && !certified.includes(query.groupBy)) throw new Error('Uncertified metric/dimension combination');
      const filters = [...(query.filters ?? []),...(context.enforcedFilters ?? [])];
      const datasets=await prepareDatasetScope(client,query.metric,mapping,this.options);
      const params: unknown[] = [context.tenantId,datasets.value,requiredMeasures(query.metric)];
      const predicates = filterSql(filters,params,certified);
      const scope = `f.tenant_id=$1 AND f.${datasets.predicate} AND f.measure_id=ANY($3::text[])`;
      const coverage=queryCoverageObserver(query,this.options);
      const sql = { params,scope,predicates,observeDataThrough:coverage.observe,maxGroups: this.maxGroups,...datasets.queryOptions };
      const selected=await queryRows(client,query,sql,context.locale);
      const rows=analyzeRows(selected.rows,query,selected.comparison);
      const metadata = await queryMetadata(client,query,context,mapping,{...this.options,observedCoverage:coverage.events(),snapshotAsOf:coverage.snapshot()});
      const dimensionLabels=selected.dimensionLabels;
      return { metric: query.metric,groupBy: query.groupBy ?? null,rows,metadata:{...metadata,...(Object.keys(dimensionLabels).length?{dimensionLabels}:{})} };
    },true,this.options.statementTimeoutMs ?? 15000);
  }
  private async validatePublishedOutput(client:PoolClient,query:AnalyticsQuery,context:AnalyticsContext,mapping:SourceMapping) {
    if(!this.options.storedProofsOnly&&!requiresPublishedOutput(query))return;
    if(this.options.historicalEventDatasets)return proveHistoricalOutput(client,query,context,this.options.historicalEventDatasets);
    const coverage=(await client.query<PublishedReconciliationCoverage>('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',[context.tenantId,mapping.datasetId])).rows;
    const derived=await readDerivedCoverage(client,context.tenantId,mapping.datasetId,{metrics:semanticCatalog[query.metric].semantics.kind==='ratio'?[query.metric]:[],groupings:[null,query.groupBy ?? null,...(context.enforcedFilters ?? []).map(filter=>filter.dimension)]});
    if(publishedQueryIssues(query,projectPublishedRelease(mapping,coverage,context,derived)).length)throw new Error('Uncertified derived metric/dimension capability');
  }
  async listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]> {
    return (await this.listDimensionOptions(dimension,context)).map(option=>option.id);
  }
  async listDimensionOptions(dimension: DimensionId, context: AnalyticsContext): Promise<Array<{id:string;label?:string}>> {
    if (!context.tenantId.trim() || !categoricalDimensions.includes(dimension)) throw new Error('Unsupported dimension');
    return tenantTransaction(this.pool,context.tenantId,async client => {
      if(this.options.storedProofsOnly)await client.query("SELECT set_config('mart.stored_proofs_only','on',true)");
      const mapping = await this.release(client,context);
      // Use only inputs of a metric certified for both discovery and every policy dimension.
      const eligible = mapping.capabilities.filter(capability => capability.dimensions.includes(dimension) && (context.enforcedFilters ?? []).every(filter => capability.dimensions.includes(filter.dimension)));
      if (!eligible.length) {
        if (!mapping.capabilities.some(capability => (context.enforcedFilters ?? []).every(filter => capability.dimensions.includes(filter.dimension)))) throw new Error('Uncertified discovery/policy dimension');
        throw new UncertifiedDimensionError(dimension);
      }
      const measures = [...new Set(eligible.flatMap(capability => requiredMeasures(capability.metric)))];
      const ps: unknown[] = [context.tenantId,this.options.historicalEventDatasets ?? mapping.datasetId,measures];
      const policy = filterSql(context.enforcedFilters ?? [],ps,[...new Set(eligible.flatMap(capability => capability.dimensions))]);
      const identity = dimensionSql(dimension);
      const field=dimensionLabelField(dimension);
      const label=field?`nullif(coalesce(f.display_labels->>'${field}',f.transaction_evidence->'labels'->>'${field}'),'')`:'NULL::text';
      const datasets=this.options.historicalEventDatasets ? 'dataset_id=ANY($2::text[])' : 'dataset_id=$2';
      if(this.options.historicalEventDatasets) {
        await client.query('SET LOCAL jit=off');
        return readEventDimensionOptions(client,dimension,{params:ps,scope:`f.tenant_id=$1 AND f.${datasets} AND f.measure_id=ANY($3::text[])`,predicates:policy,maxGroups:this.maxGroups},context.locale);
      }
      const result = await client.query(`SELECT ${identity} AS value,CASE WHEN count(DISTINCT ${label})=1 THEN min(${label}) END label FROM ((SELECT * FROM mart.canonical_facts WHERE tenant_id=$1 AND ${datasets} AND measure_id=ANY($3::text[]) AND kind='event')
        UNION ALL (SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND ${datasets} AND measure_id=ANY($3::text[]) AND kind='snapshot' ORDER BY measure_id,entity_id,business_date DESC)) f WHERE ${policy} AND ${identity} IS NOT NULL GROUP BY ${identity} ORDER BY value LIMIT ${this.maxGroups+1}`,ps);
      if (result.rows.length > this.maxGroups) throw new DimensionDiscoveryLimitError(dimension);
      return result.rows.map(row => ({id:String(row.value),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
    },true,this.options.statementTimeoutMs ?? 15000);
  }
}

function requiresPublishedOutput(query: AnalyticsQuery) { return query.metric.startsWith('aged_') || ['net_aged_receivable','total_overdue_receivable','gross_open_receivable_components','credit_balances','average_confirmed_order_value','average_invoice_value','overdue_receivable_percentage'].includes(query.metric); }

/** Each member must independently approve ratio outputs and policy dimensions. */
async function proveHistoricalOutput(client:PoolClient,query:AnalyticsQuery,context:AnalyticsContext,datasets:readonly string[]) {
 for(const datasetId of datasets) {
  const row=(await client.query(`SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='approved'`,[context.tenantId,datasetId])).rows[0];
  if(!row)throw new Error('Unapproved historical member');
  const mapping=certifiedMapping(row);
  const coverage=(await client.query<PublishedReconciliationCoverage>('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',[context.tenantId,datasetId])).rows;
  const derived=await readDerivedCoverage(client,context.tenantId,datasetId,{metrics:semanticCatalog[query.metric].semantics.kind==='ratio'?[query.metric]:[]});
  const published=projectPublishedRelease(mapping,coverage,context,derived);
  const capability=published.releases.flatMap(release=>release.capabilities).find(capability=>capability.metric===query.metric);
  const dimensions=[...(query.filters??[]),...(context.enforcedFilters??[])].map(filter=>filter.dimension);
  if(!capability?.summary || dimensions.some(dimension=>!capability.dimensions.includes(dimension)) || query.groupBy && query.groupBy!=='month' && !capability.dimensions.includes(query.groupBy))throw new Error('Uncertified historical output');
 }
}

function queryCoverageObserver(query:AnalyticsQuery,options:PostgresRepositoryOptions) {
 let latest:string|null=null;
 const semantics=semanticCatalog[query.metric].semantics;
 const snapshot=semantics.kind==='snapshot' || semantics.kind==='ratio' && semantics.basis==='snapshot';
 return {observe:(date:string|null)=>{latest=date;},events:()=>options.historicalEventDatasets?{dataThrough:latest}:undefined,snapshot:()=>snapshot?latest:null};
}
