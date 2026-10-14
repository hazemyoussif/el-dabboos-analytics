import type { PoolClient } from 'pg';
import { semanticCatalog,timeDimensions,categoricalDimensions } from '@el-dabboos/domain';
import type { AnalyticsQuery,MetricSemantics,AdditiveAggregation,Locale } from '@el-dabboos/domain';
import {snapshotInput} from './snapshot-query.ts';
import { bind,dimensionSql,numericOutput } from './sql.ts';
import {dimensionLabelField,sourceDisplayLabel} from './query-labels.ts';
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
  const input = snapshot ? snapshotInput(sql,'AND (slot."to" IS NULL OR business_date<=slot."to")') : 'mart.canonical_facts';
  const agg = query.aggregation ?? 'sum';
  const average = !snapshot && agg === 'average';
  const reduced = aggregateExpression(baseSemantics,parameters,agg,snapshot);
  const bucket = bucketSource(query,sql,baseSemantics,input,snapshot);
  const result = slots.length===1 ? await singleSlotValues(client,query,sql,slots[0]!,baseSemantics) : await client.query(`${bucket.common} SELECT slot.key,aggregate_values.* FROM jsonb_to_recordset(${slotParam}::jsonb) AS slot(key text,"from" date,"to" date,match_key text)
    CROSS JOIN LATERAL (SELECT ${reduced},max(f.business_date)::text data_through FROM ${bucket.input} f WHERE ${bucket.scope} ${range} ${group}) aggregate_values`,parameters);
  observeDataThrough(sql,result.rows);
  const map = new Map(result.rows.map(row => [row.key,row]));
  return slots.map(slot => {
    const row = map.get(slot.key)!;
    if (average || baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived') { const denom = numericOutput(row.denominator)!; return denom === 0 ? (average ? 0 : null) : numericOutput(row.numerator)!/denom*(baseSemantics.kind === 'ratio' || baseSemantics.kind === 'duration_derived' ? baseSemantics.scale : 1); }
    return numericOutput(row.value);
  });
}

/** A single KPI/period needs no parameterized lateral ledger scan. */
async function singleSlotValues(client:PoolClient,query:AnalyticsQuery,sql:QuerySqlScope,slot:QuerySlot,semantics:MetricSemantics) {
 const parameters=[...sql.params];
 const snapshot=snapshotBasis(semantics);
 const from=snapshot?null:bind(parameters,slot.from);const to=bind(parameters,slot.to);
 const range=snapshot?'':`AND (${from}::date IS NULL OR f.business_date>=${from}::date) AND (${to}::date IS NULL OR f.business_date<=${to}::date)`;
 const input=snapshot?snapshotInput(sql,`AND (${to}::date IS NULL OR business_date<=${to}::date)`):'mart.canonical_facts';
 const timeGrouping=!!query.groupBy&&timeDimensions.includes(query.groupBy);
 const group=query.groupBy&&!(snapshot&&timeGrouping)&&slot.match_key!==null?`AND ${dimensionSql(query.groupBy)}=${bind(parameters,slot.match_key)}`:'';
 const reduced=aggregateExpression(semantics,parameters,query.aggregation??'sum',snapshot);
 return client.query(`SELECT ${bind(parameters,slot.key)}::text key,${reduced},max(f.business_date)::text data_through FROM ${input} f WHERE ${sql.scope} AND ${sql.predicates} ${range} ${group}`,parameters);
}

function aggregateExpression(semantics: MetricSemantics,parameters: unknown[],aggregation: AdditiveAggregation,snapshot: boolean): string {
  if (!snapshot && aggregation==='average') return 'coalesce(sum(value),0)::text AS numerator,count(value)::text AS denominator';
  if (semantics.kind==='ratio' || semantics.kind==='duration_derived') return `coalesce(sum(value) FILTER (WHERE measure_id=${bind(parameters,semantics.numerator)}),0)::text AS numerator,coalesce(sum(value) FILTER (WHERE measure_id=${bind(parameters,semantics.denominator)}),0)::text AS denominator`;
  if (semantics.kind==='distinct_count') return `count(DISTINCT nullif(${dimensionSql(semantics.dimension)},'unassigned'))::text AS value`;
  const operation = { sum: 'sum',count: 'count',average: 'avg',min: 'min',max: 'max' }[aggregation];
  return `coalesce(${snapshot ? snapshotOperation(semantics) : operation}(value),${snapshot ? 'NULL' : '0'})::text AS value`;
}

/** Aggregate categorical groups in one pass; never rescan the authorized ledger once per customer/rep. */
async function groupedValues(client:PoolClient,query:AnalyticsQuery,sql:QuerySqlScope,slots:QuerySlot[],semantics:MetricSemantics):Promise<(number|null)[]> {
 const parameters=[...sql.params];
 const snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
 const reduced=aggregateExpression(semantics,parameters,query.aggregation??'sum',snapshot);
 const range=slots[0]!;
 const from=!snapshot && range.from?`AND f.business_date>=${bind(parameters,range.from)}::date`:'';
 const to=range.to?`AND f.business_date<=${bind(parameters,range.to)}::date`:'';
 const input = snapshot ? snapshotInput(sql,range.to ? `AND business_date<=${bind(parameters,range.to)}::date` : '') : 'mart.canonical_facts';
 const grouping=dimensionSql(query.groupBy!);
 const result=await client.query(`SELECT ${grouping} key,${reduced},max(f.business_date)::text data_through FROM ${input} f WHERE ${sql.scope} AND ${sql.predicates} ${from} ${to} GROUP BY ${grouping}`,parameters);
 observeDataThrough(sql,result.rows);
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

function observeDataThrough(scope:QuerySqlScope,rows:{data_through?:string|null}[]) {
 const dates=rows.flatMap(row=>row.data_through?[row.data_through]:[]).sort();
 scope.observeDataThrough?.(dates.at(-1) ?? null);
}

/** Project only aggregation inputs while retaining the full authorized source selection. */
function bucketSource(query:AnalyticsQuery,scope:QuerySqlScope,semantics:MetricSemantics,input:string,snapshot:boolean) {
 if(snapshot)return {common:'',input,scope:`${scope.scope} AND ${scope.predicates}`};
 const identity=semantics.kind==='distinct_count'?semantics.dimension:undefined;
 const categorical=query.groupBy && !timeDimensions.includes(query.groupBy)?query.groupBy:undefined;
 const dimensions=[...new Set([...(categorical?[categorical]:[]),...(identity?[identity]:[])])];
 const columns=`f.measure_id,f.value,f.business_date${dimensions.map(dimension=>`,${dimensionSql(dimension)}`).join('')}`;
 return {common:`WITH authorized_events AS MATERIALIZED (SELECT ${columns} FROM mart.canonical_facts f WHERE ${scope.scope} AND ${scope.predicates})`,input:'authorized_events',scope:'true'};
}

/** Complete categorical populations, totals and latest labels from one authorized event scan. */
export async function selectGroupedEventRows(client:PoolClient,query:AnalyticsQuery,scope:QuerySqlScope,locale:Locale) {
 if(!supportsGroupedScan(query,scope))return undefined;
 const parameters=[...scope.params],grouping=dimensionSql(query.groupBy!);
 const field=dimensionLabelField(query.groupBy);
 const label=field?`nullif(coalesce(f.display_labels->>${bind(parameters,field)},f.transaction_evidence->'labels'->>${bind(parameters,field)}),'')`:'NULL::text';
 const from=query.dateRange?`AND f.business_date>=${bind(parameters,query.dateRange.from)}::date`:'';
 const to=query.dateRange?`AND f.business_date<=${bind(parameters,query.dateRange.to)}::date`:'';
 const reduced=aggregateExpression(semanticCatalog[query.metric].semantics,parameters,query.aggregation ?? 'sum',false);
 const result=await client.query(`WITH authorized_events AS MATERIALIZED (
  SELECT ${grouping} key,f.measure_id,f.value,f.business_date,f.source_as_of,f.source_object,f.source_record_id,${label} label
  FROM mart.canonical_facts f WHERE ${scope.scope} AND ${scope.predicates} ${from} ${to} AND ${grouping} IS NOT NULL)
  SELECT f.key,${reduced},max(f.business_date)::text data_through,
   (array_agg(f.label ORDER BY f.source_as_of DESC,f.business_date DESC,f.source_object COLLATE "C",f.source_record_id COLLATE "C") FILTER(WHERE f.label IS NOT NULL))[1] label
  FROM authorized_events f GROUP BY f.key ORDER BY f.key LIMIT ${scope.maxGroups+1}`,parameters);
 if(result.rows.length>scope.maxGroups)throw new Error('Grouping exceeds technical bound');
 observeDataThrough(scope,result.rows);
 const rows=result.rows.map(row=>({key:String(row.key),value:query.aggregation==='average'?averageValue(row):numericOutput(row.value)})).sort((left,right)=>left.key.localeCompare(right.key));
 const dimensionLabels=Object.fromEntries(result.rows.filter(row=>row.label).map(row=>[row.key,sourceDisplayLabel(row.label,locale)]));
 return {rows,comparison:false,dimensionLabels};
}
function supportsGroupedScan(query:AnalyticsQuery,scope:QuerySqlScope) {
 return scope.labelStrategy==='latest_observed' && !!query.groupBy && categoricalDimensions.includes(query.groupBy)
  && semanticCatalog[query.metric].semantics.kind==='additive' && !query.analysis?.comparison;
}
function averageValue(row:{numerator:string;denominator:string}) {
 const denominator=numericOutput(row.denominator)!;
 return denominator===0?0:numericOutput(row.numerator)!/denominator;
}

function snapshotOperation(semantics:MetricSemantics){return semantics.kind==='snapshot'?semantics.aggregation??'sum':'sum';}
