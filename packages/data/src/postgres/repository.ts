import type { Pool, PoolClient } from 'pg';
import { categoricalDimensions, certifiedDimensions, requiredMeasures, semanticCatalog, timeDimensions, validateQuery, validateSourceMapping } from '@el-dabboos/domain';
import type { AnalyticsContext, AnalyticsQuery, AnalyticsRepository, AnalyticsResult, AnalyticsRow, DimensionId, DimensionValueRepository, SourceMapping } from '@el-dabboos/domain';
import { periodKeys, periodRange, previousTimeKey, shiftRange } from '../calendar.ts';
import { tenantTransaction } from './session.ts';
import { bind, dimensionSql, filterSql, numericOutput } from './sql.ts';

export interface PostgresRepositoryOptions {
  reportingCurrencies: Readonly<Record<string,string>>;
  /** Trusted metadata configuration, resolved freshly; never a query/client currency. */
  reportingCurrency?: (tenantId: string) => Promise<string | null>; clock?: () => Date;
  maxGroups?: number; maxDateSpanDays?: number; statementTimeoutMs?: number;
}
interface Slot { key: string | null; from: string | null; to: string | null; match_key: string | null }
const compare = (v: number | null, p: number | null) => ({ comparisonValue: p, absoluteChange: v === null || p === null ? null : v-p, percentageChange: v === null || p === null || p === 0 ? null : (v-p)/Math.abs(p)*100 });
const order = (direction: 'top'|'bottom') => (a: AnalyticsRow,b: AnalyticsRow) => a.value === null ? (b.value === null ? String(a.key).localeCompare(String(b.key)) : 1) : b.value === null ? -1 : (direction === 'top' ? b.value-a.value : a.value-b.value) || String(a.key).localeCompare(String(b.key));
const mean = (values: (number|null)[]) => { const present = values.filter((v): v is number => v !== null); return present.length ? present.reduce((a,b) => a+b,0)/present.length : null; };
export class PostgresAnalyticsRepository implements AnalyticsRepository, DimensionValueRepository {
  private readonly maxGroups: number;
  constructor(private readonly pool: Pool, private readonly options: PostgresRepositoryOptions) {
    this.maxGroups = options.maxGroups ?? 1000;
    if (!Number.isInteger(this.maxGroups) || this.maxGroups < 1 || this.maxGroups > 5000 || !Number.isInteger(options.maxDateSpanDays ?? 3660) || (options.maxDateSpanDays ?? 3660) < 1) throw new Error('Invalid PostgreSQL query bounds');
  }
  private async release(client: PoolClient, context: AnalyticsContext): Promise<SourceMapping> {
    const row = (await client.query(`SELECT m.* FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id) WHERE b.tenant_id=$1 AND m.approval_status='approved'`, [context.tenantId])).rows[0];
    if (!row) throw new Error('No approved serving binding');
    const m = row.specification as SourceMapping; validateSourceMapping(m);
    const trustedCurrency = this.options.reportingCurrency ? await this.options.reportingCurrency(context.tenantId) : this.options.reportingCurrencies[context.tenantId];
    if (m.approval.status !== 'approved' || m.tenantId !== context.tenantId || m.datasetId !== row.dataset_id || m.sourceId !== row.source_id || m.mappingVersion !== row.mapping_version || m.mappingId !== row.mapping_id || m.reportingCurrency !== row.reporting_currency || m.reportingCurrency !== trustedCurrency) throw new Error('Uncertified binding/reporting currency mismatch');
    return m;
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
      const certified = certifiedDimensions(mapping,query.metric);
      if (!mapping.capabilities.some(c => c.metric === query.metric) || query.groupBy && !certified.includes(query.groupBy)) throw new Error('Uncertified metric/dimension combination');
      const filters = [...(query.filters ?? []),...(context.enforcedFilters ?? [])];
      const params: unknown[] = [context.tenantId,mapping.datasetId,requiredMeasures(query.metric)];
      const predicates = filterSql(filters,params,certified);
      const scope = 'f.tenant_id=$1 AND f.dataset_id=$2 AND f.measure_id=ANY($3::text[])';
      const metric = semanticCatalog[query.metric]; const semantics = metric.semantics;
      const isSnapshot = semantics.kind === 'snapshot'; const isTime = !!query.groupBy && timeDimensions.includes(query.groupBy);
      let keys: (string|null)[];
      if (!query.groupBy) keys = [null];
      else if (isSnapshot && isTime && query.dateRange) keys = periodKeys(query.dateRange,query.groupBy);
      else {
        const ps = [...params];
        const latest = isSnapshot && !isTime;
        const cutoff = latest && query.dateRange ? `AND business_date<=${bind(ps,query.dateRange.to)}::date` : '';
        const input = latest ? `(SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) ${cutoff} ORDER BY measure_id,entity_id,business_date DESC)` : 'mart.canonical_facts';
        const range = !isSnapshot && query.dateRange ? `AND f.business_date BETWEEN ${bind(ps,query.dateRange.from)}::date AND ${bind(ps,query.dateRange.to)}::date` : '';
        const result = await client.query(`SELECT DISTINCT ${dimensionSql(query.groupBy)} AS key FROM ${input} f WHERE ${scope} AND ${predicates} ${range} AND ${dimensionSql(query.groupBy)} IS NOT NULL ORDER BY key LIMIT ${this.maxGroups+1}`,ps);
        keys = result.rows.map(r => String(r.key));
      }
      if (keys.length > this.maxGroups) throw new Error('Grouping exceeds technical bound');
      keys.sort((a,b) => String(a).localeCompare(String(b)));
      const current: Slot[] = keys.map(key => {
        let range = query.dateRange;
        if (key !== null && isTime && query.groupBy) { const period = periodRange(key,query.groupBy); range = range ? { from: period.from > range.from ? period.from : range.from,to: period.to < range.to ? period.to : range.to } : period; }
        return { key,from: range?.from ?? null,to: range?.to ?? null,match_key: key };
      });
      const comparison = query.analysis?.comparison ?? (semantics.kind === 'comparison_derived' ? semantics.defaultComparison : undefined);
      const prior: Slot[] = comparison ? keys.map(key => {
        if (key !== null && isTime && query.groupBy) { const match_key = previousTimeKey(key,query.groupBy,comparison); const range = periodRange(match_key,query.groupBy); return { key,match_key,from: range.from,to: range.to }; }
        if (!query.dateRange) throw new Error('Comparison requires date range');
        const range = shiftRange(query.dateRange,comparison); return { key,match_key: key,from: range.from,to: range.to };
      }) : [];
      const base = semantics.kind === 'comparison_derived' ? semantics.base : query.metric;
      const baseSemantics = semanticCatalog[base].semantics;
      const aggregate = async (slots: Slot[]): Promise<(number|null)[]> => {
        if (!slots.length) return [];
        const ps = [...params]; const slotParam = bind(ps,JSON.stringify(slots));
        const snapshot = baseSemantics.kind === 'snapshot';
        const group = query.groupBy && !(snapshot && isTime) ? `AND (s.match_key IS NULL OR ${dimensionSql(query.groupBy)}=s.match_key)` : '';
        const range = snapshot ? '' : 'AND (s."from" IS NULL OR f.business_date>=s."from") AND (s."to" IS NULL OR f.business_date<=s."to")';
        const input = snapshot ? `(SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND (s."to" IS NULL OR business_date<=s."to") ORDER BY measure_id,entity_id,business_date DESC)` : 'mart.canonical_facts';
        const agg = query.aggregation ?? 'sum'; const fn = { sum: 'sum',count: 'count',average: 'avg',min: 'min',max: 'max' }[agg];
        const average = !snapshot && agg === 'average';
        const reduced = average ? 'coalesce(sum(value),0)::text AS numerator, count(value)::text AS denominator' : baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived'
          ? `coalesce(sum(value) FILTER (WHERE measure_id=${bind(ps,baseSemantics.numerator)}),0)::text AS numerator, coalesce(sum(value) FILTER (WHERE measure_id=${bind(ps,baseSemantics.denominator)}),0)::text AS denominator`
          : `coalesce(${snapshot ? 'sum' : fn}(value),${snapshot ? 'NULL' : '0'})::text AS value`;
        const result = await client.query(`SELECT s.key,a.* FROM jsonb_to_recordset(${slotParam}::jsonb) AS s(key text,"from" date,"to" date,match_key text)
          CROSS JOIN LATERAL (SELECT ${reduced} FROM ${input} f WHERE ${scope} AND ${predicates} ${range} ${group}) a`,ps);
        const map = new Map(result.rows.map(r => [r.key,r]));
        return slots.map(s => {
          const r = map.get(s.key)!;
          if (average || baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived') { const denom = numericOutput(r.denominator)!; return denom === 0 ? (average ? 0 : null) : numericOutput(r.numerator)!/denom*(baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived' ? baseSemantics.scale : 1); }
          return numericOutput(r.value);
        });
      };
      const values = await aggregate(current); const priors = await aggregate(prior);
      let rows: AnalyticsRow[] = keys.map((key,i) => { const v = values[i] ?? null; if (!comparison) return { key,value: v }; const p = priors[i] ?? null; const changes = compare(v,p); return semantics.kind === 'comparison_derived' ? { key,value: changes.percentageChange } : { key,value: v,...changes }; });
      if (query.analysis?.movingAverage) { const before = rows; const window = query.analysis.movingAverage.window; rows = before.map((r,i) => { const slice = before.slice(Math.max(0,i-window+1),i+1); const v = mean(slice.map(r => r.value)); return comparison ? { key: r.key,value: v,...compare(v,mean(slice.map(r => r.comparisonValue ?? null))) } : { key: r.key,value: v }; }); }
      if (query.analysis?.runningTotal) { let v=0,p=0; rows = rows.map(r => { v+=r.value ?? 0; p+=r.comparisonValue ?? 0; return comparison ? { key: r.key,value: v,...compare(v,p) } : { key: r.key,value: v }; }); }
      if (query.analysis?.percentageContribution) { const total = rows.reduce((n,r) => n+(r.value ?? 0),0); rows = rows.map(r => ({ key: r.key,value: total === 0 ? null : (r.value ?? 0)/total*100 })); }
      if (query.analysis?.ranking) { const rank = new Map([...rows].sort(order('top')).map((r,i) => [r.key,i+1])); rows = rows.map(r => ({ ...r,rank: rank.get(r.key)! })); }
      if (query.analysis?.topN) rows = rows.sort(order(query.analysis.topN.direction)).slice(0,query.analysis.topN.limit);
      if (rows.some(r => Object.values(r).some(v => typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v)>Number.MAX_SAFE_INTEGER)))) throw new Error('Unsafe derived result');
      const coverageParams: unknown[] = [context.tenantId,mapping.datasetId,requiredMeasures(query.metric)];
      const policy = filterSql(context.enforcedFilters ?? [],coverageParams,certified);
      const coverage = (await client.query(`SELECT max(f.business_date)::text AS date FROM mart.canonical_facts f WHERE ${scope} AND ${policy}`,coverageParams)).rows[0]?.date;
      const objects = [...new Set(mapping.measures.filter(m => requiredMeasures(query.metric).includes(m.measureId)).map(m => m.sourceObject))];
      const freshness = (await client.query(`SELECT min(latest) AS date, count(*) FILTER (WHERE latest IS NOT NULL)::int AS n FROM unnest($3::text[]) o(object) LEFT JOIN LATERAL (SELECT max(source_as_of) latest FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=$2 AND status='committed' AND pagination_complete AND o.object=ANY(source_objects)) b ON true`, [context.tenantId,mapping.datasetId,objects])).rows[0];
      const percentage = !!query.analysis?.percentageContribution;
      return { metric: query.metric,groupBy: query.groupBy ?? null,rows,metadata: { sourceId: 'postgres',executedAt: (this.options.clock?.() ?? new Date()).toISOString(),...(coverage ? { dataThrough: coverage } : {}),...(freshness?.date && freshness.n === objects.length ? { sourceAsOf: freshness.date.toISOString() } : {}),metricType: percentage ? 'percentage' : metric.type,...(percentage ? { unit: '%' } : metric.presentation.unit ? { unit: metric.presentation.unit } : {}),semantics: semantics.kind } };
    },true,this.options.statementTimeoutMs ?? 15000);
  }
  async listDimensionValues(dimension: DimensionId, context: AnalyticsContext): Promise<string[]> {
    if (!context.tenantId.trim() || !categoricalDimensions.includes(dimension)) throw new Error('Unsupported dimension');
    return tenantTransaction(this.pool,context.tenantId,async client => {
      const m = await this.release(client,context);
      // Use only inputs of a metric certified for both discovery and every policy dimension.
      const eligible = m.capabilities.filter(c => c.dimensions.includes(dimension) && (context.enforcedFilters ?? []).every(f => c.dimensions.includes(f.dimension)));
      if (!eligible.length) throw new Error('Uncertified discovery/policy dimension');
      const measures = [...new Set(eligible.flatMap(c => requiredMeasures(c.metric)))];
      const ps: unknown[] = [context.tenantId,m.datasetId,measures];
      const policy = filterSql(context.enforcedFilters ?? [],ps,[...new Set(eligible.flatMap(c => c.dimensions))]);
      const d = dimensionSql(dimension);
      const result = await client.query(`SELECT DISTINCT ${d} AS value FROM ((SELECT * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND kind='event')
        UNION ALL (SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND kind='snapshot' ORDER BY measure_id,entity_id,business_date DESC)) f WHERE ${policy} AND ${d} IS NOT NULL ORDER BY value LIMIT ${this.maxGroups+1}`,ps);
      if (result.rows.length > this.maxGroups) throw new Error('Discovery exceeds technical bound');
      return result.rows.map(r => String(r.value));
    },true,this.options.statementTimeoutMs ?? 15000);
  }
}
