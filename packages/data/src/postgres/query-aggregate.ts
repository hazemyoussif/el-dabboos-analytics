import type { PoolClient } from 'pg';
import { semanticCatalog,timeDimensions } from '@el-dabboos/domain';
import type { AnalyticsQuery,MetricSemantics,AdditiveAggregation } from '@el-dabboos/domain';
import { bind,dimensionSql,numericOutput } from './sql.ts';
import type { QuerySlot,QuerySqlScope } from './query-slots.ts';
export async function aggregateQuerySlots(client: PoolClient,query: AnalyticsQuery,sql: QuerySqlScope,slots: QuerySlot[]): Promise<(number|null)[]> {
  const semantics = semanticCatalog[query.metric].semantics;
  const base = semantics.kind==='comparison_derived' ? semantics.base : query.metric;
  const baseSemantics = semanticCatalog[base].semantics;
  const timeGrouping = !!query.groupBy && timeDimensions.includes(query.groupBy);
  if (!slots.length) return [];
  const snapshot = snapshotBasis(baseSemantics);
  if (query.groupBy && !timeGrouping && slots.every(slot=>slot.from===slots[0]!.from && slot.to===slots[0]!.to)) return groupedValues(client,query,sql,slots,baseSemantics);
  const parameters = [...sql.params]; const slotParam = bind(parameters,JSON.stringify(slots));
  const group = query.groupBy && !(snapshot && timeGrouping) ? `AND (slot.match_key IS NULL OR ${dimensionSql(query.groupBy)}=slot.match_key)` : '';
  const range = snapshot ? '' : 'AND (slot."from" IS NULL OR f.business_date>=slot."from") AND (slot."to" IS NULL OR f.business_date<=slot."to")';
  const input = snapshot ? `(SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) AND (slot."to" IS NULL OR business_date<=slot."to") ORDER BY measure_id,entity_id,business_date DESC)` : 'mart.canonical_facts';
  const agg = query.aggregation ?? 'sum';
  const average = !snapshot && agg === 'average';
  const reduced = aggregateExpression(baseSemantics,parameters,agg,snapshot);
  const result = await client.query(`SELECT slot.key,aggregate_values.* FROM jsonb_to_recordset(${slotParam}::jsonb) AS slot(key text,"from" date,"to" date,match_key text)
    CROSS JOIN LATERAL (SELECT ${reduced} FROM ${input} f WHERE ${sql.scope} AND ${sql.predicates} ${range} ${group}) aggregate_values`,parameters);
  const map = new Map(result.rows.map(row => [row.key,row]));
  return slots.map(slot => {
    const row = map.get(slot.key)!;
    if (average || baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived') { const denom = numericOutput(row.denominator)!; return denom === 0 ? (average ? 0 : null) : numericOutput(row.numerator)!/denom*(baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived' ? baseSemantics.scale : 1); }
    return numericOutput(row.value);
  });
}

function aggregateExpression(semantics: MetricSemantics,parameters: unknown[],aggregation: AdditiveAggregation,snapshot: boolean): string {
  if (!snapshot && aggregation==='average') return 'coalesce(sum(value),0)::text AS numerator,count(value)::text AS denominator';
  if (semantics.kind==='ratio' || semantics.kind==='duration_derived') return `coalesce(sum(value) FILTER (WHERE measure_id=${bind(parameters,semantics.numerator)}),0)::text AS numerator,coalesce(sum(value) FILTER (WHERE measure_id=${bind(parameters,semantics.denominator)}),0)::text AS denominator`;
  if (semantics.kind==='distinct_count') return `count(DISTINCT nullif(${dimensionSql(semantics.dimension)},'unassigned'))::text AS value`;
  const operation = { sum: 'sum',count: 'count',average: 'avg',min: 'min',max: 'max' }[aggregation];
  return `coalesce(${snapshot ? 'sum' : operation}(value),${snapshot ? 'NULL' : '0'})::text AS value`;
}

/** Aggregate categorical groups in one pass; never rescan the authorized ledger once per customer/rep. */
async function groupedValues(client:PoolClient,query:AnalyticsQuery,sql:QuerySqlScope,slots:QuerySlot[],semantics:MetricSemantics):Promise<(number|null)[]> {
 const parameters=[...sql.params];
 const snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
 const reduced=aggregateExpression(semantics,parameters,query.aggregation??'sum',snapshot);
 const range=slots[0]!;
 const from=!snapshot && range.from?`AND f.business_date>=${bind(parameters,range.from)}::date`:'';
 const to=range.to?`AND f.business_date<=${bind(parameters,range.to)}::date`:'';
 const input = snapshot ? `(SELECT DISTINCT ON (measure_id,entity_id) * FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=ANY($3::text[]) ${range.to ? `AND business_date<=${bind(parameters,range.to)}::date` : ''} ORDER BY measure_id,entity_id,business_date DESC)` : 'mart.canonical_facts';
 const grouping=dimensionSql(query.groupBy!);
 const result=await client.query(`SELECT ${grouping} key,${reduced} FROM ${input} f WHERE ${sql.scope} AND ${sql.predicates} ${from} ${to} GROUP BY ${grouping}`,parameters);
 const values=new Map(result.rows.map(row=>[row.key,row]));
 return slots.map(slot=>{
  const row=values.get(slot.match_key);
  if(query.aggregation==='average'||semantics.kind==='ratio'||semantics.kind==='duration_derived') {
   const denominator=numericOutput(row?.denominator??'0')!;
   if(denominator===0)return query.aggregation==='average'?0:null;
   const scale=semantics.kind==='ratio'||semantics.kind==='duration_derived'?semantics.scale:1;
   return numericOutput(row?.numerator??'0')!/denominator*scale;
  }
  return numericOutput(row?.value??'0');
 });
}

function snapshotBasis(semantics: MetricSemantics) { return semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot'; }
