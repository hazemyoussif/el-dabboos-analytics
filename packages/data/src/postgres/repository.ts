import type { Pool, PoolClient } from 'pg';
import { publishedQueryIssues, DimensionDiscoveryLimitError, UncertifiedDimensionError, categoricalDimensions, certifiedDimensions, requiredMeasures, semanticCatalog, validateQuery, validateSourceMapping } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, AnalyticsRow, DimensionId, DimensionValueRepository, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { projectPublishedRelease } from './published-capabilities.ts';
import { readDerivedCoverage } from './read-derived-coverage.ts';
import type { PublishedReconciliationCoverage } from './published-capabilities.ts';
import type { PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { selectQueryKeys,querySlots } from './query-slots.ts';
import { aggregateQuerySlots } from './query-aggregate.ts';
import { queryDimensionLabels } from './query-labels.ts';
import { queryMetadata } from './query-metadata.ts';
import { analyzeRows } from './query-analysis.ts';
import { certifiedMapping } from './mapping-releases.ts';
import { dimensionSql, filterSql } from './sql.ts';

export interface PostgresRepositoryOptions {
  reportingCurrencies: Readonly<Record<string,string>>;
  /** Trusted metadata configuration, resolved freshly; never a query/client currency. */
  reportingCurrency?: (tenantId: string) => Promise<string | null>; clock?: () => Date;
  maxGroups?: number; maxDateSpanDays?: number; statementTimeoutMs?: number;
}
const compare = (v: number | null, p: number | null) => ({ comparisonValue: p, absoluteChange: v === null || p === null ? null : v-p, percentageChange: v === null || p === null || p === 0 ? null : (v-p)/Math.abs(p)*100 });
export class PostgresAnalyticsRepository implements AnalyticsRepository, DimensionValueRepository {
  private readonly maxGroups: number;
  constructor(private readonly pool: Pool, private readonly options: PostgresRepositoryOptions) {
    this.maxGroups = options.maxGroups ?? 1000;
    if (!Number.isInteger(this.maxGroups) || this.maxGroups < 1 || this.maxGroups > 5000 || !Number.isInteger(options.maxDateSpanDays ?? 3660) || (options.maxDateSpanDays ?? 3660) < 1) throw new Error('Invalid PostgreSQL query bounds');
  }
  private async release(client: PoolClient, context: AnalyticsContext): Promise<SourceMapping> {
    const row = (await client.query(`SELECT m.* FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=$1 AND m.approval_status='approved'`, [context.tenantId])).rows[0];
    if (!row) throw new Error('No approved serving binding');
    const m = certifiedMapping(row); validateSourceMapping(m);
    const trustedCurrency = this.options.reportingCurrency ? await this.options.reportingCurrency(context.tenantId) : this.options.reportingCurrencies[context.tenantId];
    if (m.approval.status !== 'approved' || m.tenantId !== context.tenantId || m.datasetId !== row.dataset_id || m.sourceId !== row.source_id || m.mappingVersion !== row.mapping_version || m.mappingId !== row.mapping_id || m.reportingCurrency !== row.reporting_currency || m.reportingCurrency !== trustedCurrency) throw new Error('Uncertified binding/reporting currency mismatch');
    return m;
  }
  async getPublishedCapabilities(context: AnalyticsContext): Promise<PublishedAnalyticsCapabilities> {
    return tenantTransaction(this.pool,context.tenantId,async client => {
      if (!(await client.query('SELECT 1 FROM mart.serving_bindings WHERE tenant_id=$1',[context.tenantId])).rowCount) return { tenantId: context.tenantId,mode: 'certified',releases: [] };
      const mapping = await this.release(client,context);
      const coverage = (await client.query<PublishedReconciliationCoverage>('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',[context.tenantId,mapping.datasetId])).rows;
      const derived=await readDerivedCoverage(client,context.tenantId,mapping.datasetId,{metrics:mapping.capabilities.filter(capability=>semanticCatalog[capability.metric].semantics.kind==='ratio').map(capability=>capability.metric)});
      return projectPublishedRelease(mapping,coverage,context,derived);
    },true,this.options.statementTimeoutMs ?? 15000);
  }
  async isDataReady(tenantId: string): Promise<boolean> {
    return tenantTransaction(this.pool, tenantId, async client => {
      if (!(await client.query("SELECT 1 FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=$1 AND m.approval_status='approved'", [tenantId])).rowCount) return false;
      await this.release(client, { tenantId, locale: 'en' }); return true;
    });
  }
  async execute(query: AnalyticsQuery, context: AnalyticsContext): Promise<AnalyticsResult> {
    validateQuery(query,context);
    if (query.dateRange && (Date.parse(query.dateRange.to)-Date.parse(query.dateRange.from))/86400000+1 > (this.options.maxDateSpanDays ?? 3660)) throw new Error('Date span exceeds technical bound');
    return tenantTransaction(this.pool,context.tenantId,async client => {
      const mapping = await this.release(client,context);
      if (requiresPublishedOutput(query)) {
        const coverage=(await client.query<PublishedReconciliationCoverage>('SELECT * FROM mart.published_reconciliation_coverage($1,$2)',[context.tenantId,mapping.datasetId])).rows;
        const derived=await readDerivedCoverage(client,context.tenantId,mapping.datasetId,{metrics:semanticCatalog[query.metric].semantics.kind==='ratio'?[query.metric]:[],groupings:[null,query.groupBy ?? null,...(context.enforcedFilters ?? []).map(filter=>filter.dimension)]});
        if (publishedQueryIssues(query,projectPublishedRelease(mapping,coverage,context,derived)).length) throw new Error('Uncertified derived metric/dimension capability');
      }
      const certified = certifiedDimensions(mapping,query.metric);
      if (!mapping.capabilities.some(c => c.metric === query.metric) || query.groupBy && !certified.includes(query.groupBy)) throw new Error('Uncertified metric/dimension combination');
      const filters = [...(query.filters ?? []),...(context.enforcedFilters ?? [])];
      const params: unknown[] = [context.tenantId,mapping.datasetId,requiredMeasures(query.metric)];
      const predicates = filterSql(filters,params,certified);
      const scope = 'f.tenant_id=$1 AND f.dataset_id=$2 AND f.measure_id=ANY($3::text[])';
      const semantics = semanticCatalog[query.metric].semantics;
      const sql = { params,scope,predicates,maxGroups: this.maxGroups };
      const keys = await selectQueryKeys(client,query,sql);
      const { current,prior,comparison } = querySlots(query,keys);
      const values = await aggregateQuerySlots(client,query,sql,current); const priors = await aggregateQuerySlots(client,query,sql,prior);
      let rows: AnalyticsRow[] = keys.map((key,i) => { const v = values[i] ?? null; if (!comparison) return { key,value: v }; const p = priors[i] ?? null; const changes = compare(v,p); return semantics.kind === 'comparison_derived' ? { key,value: changes.percentageChange } : { key,value: v,...changes }; });
      rows = analyzeRows(rows,query,!!comparison);
      const metadata = await queryMetadata(client,query,context,mapping,this.options);
      const dimensionLabels=await queryDimensionLabels(client,query,sql,keys,context.locale);
      return { metric: query.metric,groupBy: query.groupBy ?? null,rows,metadata:{...metadata,...(Object.keys(dimensionLabels).length?{dimensionLabels}:{})} };
    },true,this.options.statementTimeoutMs ?? 15000);
  }
  async listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]> {
    if (!context.tenantId.trim() || !categoricalDimensions.includes(dimension)) throw new Error('Unsupported dimension');
    return tenantTransaction(this.pool,context.tenantId,async client => {
      const m = await this.release(client,context);
      // Use only inputs of a metric certified for both discovery and every policy dimension.
      const eligible = m.capabilities.filter(c => c.dimensions.includes(dimension) && (context.enforcedFilters ?? []).every(f => c.dimensions.includes(f.dimension)));
      if (!eligible.length) {
        if (!m.capabilities.some(capability => (context.enforcedFilters ?? []).every(filter => capability.dimensions.includes(filter.dimension)))) throw new Error('Uncertified discovery/policy dimension');
        throw new UncertifiedDimensionError(dimension);
      }
      const measures = [...new Set(eligible.flatMap(c => requiredMeasures(c.metric)))];
      const ps: unknown[] = [context.tenantId,m.datasetId,measures];
      const policy = filterSql(context.enforcedFilters ?? [],ps,[...new Set(eligible.flatMap(c => c.dimensions))]);
      const d = dimensionSql(dimension);
      const result = await client.query(`SELECT DISTINCT ${d} AS value FROM ((SELECT * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND kind='event')
        UNION ALL (SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND kind='snapshot' ORDER BY measure_id,entity_id,business_date DESC)) f WHERE ${policy} AND ${d} IS NOT NULL ORDER BY value LIMIT ${this.maxGroups+1}`,ps);
      if (result.rows.length > this.maxGroups) throw new DimensionDiscoveryLimitError(dimension);
      return result.rows.map(r => String(r.value));
    },true,this.options.statementTimeoutMs ?? 15000);
  }
}

function requiresPublishedOutput(query: AnalyticsQuery) { return query.metric.startsWith('aged_') || ['net_aged_receivable','total_overdue_receivable','gross_open_receivable_components','credit_balances','average_confirmed_order_value','average_invoice_value','overdue_receivable_percentage'].includes(query.metric); }
