import { requiredMeasures, semanticCatalog, timeDimensions, validateQuery } from '@el-dabboos/domain';
import type { AdditiveAggregation, AnalyticsContext, AnalyticsQuery, AnalyticsResult, AnalyticsRow, DateRange, DimensionId, FactMeasureId, MetricId } from '@el-dabboos/domain';
import { periodKeys, periodRange, previousTimeKey, shiftRange, timeKey } from './calendar.ts';
import type { AnalyticsFact } from './facts.ts';

export interface ExecutionMetadata { sourceId: string; executedAt: string; sourceAsOf?: string }
const isTime = (id: DimensionId | undefined): boolean => !!id && timeDimensions.includes(id);
function dimension(f: AnalyticsFact, id: DimensionId): string | undefined {
  return isTime(id) ? timeKey(f.date, id) : f.dimensions[id];
}
function inRange(f: AnalyticsFact, range: DateRange | undefined): boolean {
  return !range || (f.date >= range.from && f.date <= range.to);
}
function filtered(f: AnalyticsFact, query: AnalyticsQuery, context: AnalyticsContext): boolean {
  return [...(query.filters ?? []), ...(context.enforcedFilters ?? [])].every(filter => filter.values.includes(dimension(f, filter.dimension) ?? ''));
}
function aggregate(values: number[], kind: AdditiveAggregation): number {
  if (!values.length) return 0;
  switch (kind) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'count': return values.length;
    case 'average': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
  }
}
function latestSnapshots(facts: readonly AnalyticsFact[], measureId: FactMeasureId, end?: string): AnalyticsFact[] {
  const latest = new Map<string, AnalyticsFact>();
  for (const fact of facts) {
    if (fact.measureId !== measureId || (end && fact.date > end)) continue;
    if (!fact.entityId) throw new Error(`Snapshot measure ${measureId} requires entityId`);
    const old = latest.get(fact.entityId);
    if (old?.date === fact.date) throw new Error(`Duplicate snapshot for ${measureId}/${fact.entityId}/${fact.date}`);
    if (!old || fact.date > old.date) latest.set(fact.entityId, fact);
  }
  return [...latest.values()];
}
function evaluate(facts: readonly AnalyticsFact[], metricId: MetricId, query: AnalyticsQuery, range: DateRange | undefined, key: string | null, context: AnalyticsContext): number | null {
  const semantics = semanticCatalog[metricId].semantics;
  const groupBy = query.groupBy;
  const matches = (fact: AnalyticsFact): boolean => filtered(fact, query, context) && inRange(fact, range) &&
    (key === null || !groupBy || dimension(fact, groupBy) === key);
  const measure = (id: FactMeasureId, aggregation: AdditiveAggregation = 'sum'): number =>
    aggregate(facts.filter(f => f.measureId === id && matches(f)).map(f => f.value), aggregation);
  if (semantics.kind === 'distinct_count') return new Set(facts.filter(fact => fact.measureId===semantics.measure && matches(fact)).map(fact => fact.dimensions[semantics.dimension]).filter(value => value!==undefined && value!=='unassigned')).size;
  if (semantics.kind === 'additive') return measure(semantics.measure, metricId === query.metric ? query.aggregation ?? 'sum' : 'sum');
  if (semantics.kind === 'ratio' || semantics.kind === 'duration_derived') {
    const operand = (id: FactMeasureId) => semantics.kind === 'ratio' && semantics.basis === 'snapshot' ? latestSnapshots(facts, id, range?.to).filter(fact => filtered(fact, query, context) && (key === null || !groupBy || isTime(groupBy) || dimension(fact, groupBy) === key)).reduce((sum, fact) => sum + fact.value, 0) : measure(id);
    const denominator = operand(semantics.denominator);
    return denominator === 0 ? null : operand(semantics.numerator) / denominator * semantics.scale;
  }
  if (semantics.kind === 'snapshot') {
    const snapshots = latestSnapshots(facts, semantics.measure, range?.to).filter(f => filtered(f, query, context) &&
      (key === null || !groupBy || isTime(groupBy) || dimension(f, groupBy) === key));
    return snapshots.length ? snapshots.reduce((sum, f) => sum + f.value, 0) : null;
  }
  throw new Error('Comparison-derived metrics require comparison evaluation');
}
/** Cache categorical operands once per measure/range; select snapshot assignments before filters.
 * Time series retain per-period evaluation. Missing snapshots stay null; explicit zero stays zero.
 */
function categoricalEvaluation(facts:readonly AnalyticsFact[],query:AnalyticsQuery,context:AnalyticsContext) {
 const groupBy=query.groupBy;
 if(!groupBy||isTime(groupBy))return (metricId:MetricId,range:DateRange|undefined,key:string|null)=>evaluate(facts,metricId,query,range,key,context);
 const cache=new Map<string,Map<string,number>>(),defaultSum=query.aggregation===undefined||query.aggregation==='sum';
 const totals=(measure:FactMeasureId,range:DateRange|undefined,basis:'snapshot'|'event')=>{
  const identity=JSON.stringify([basis,measure,basis==='event'?range?.from:undefined,range?.to]),existing=cache.get(identity);
  if(existing)return existing;
  const grouped=new Map<string,number>();
  const selected=basis==='snapshot'?latestSnapshots(facts,measure,range?.to):facts.filter(fact=>fact.measureId===measure&&inRange(fact,range));
  for(const fact of selected){
   if(!filtered(fact,query,context))continue;
   const key=dimension(fact,groupBy);
   if(key!==undefined)grouped.set(key,(grouped.get(key)??0)+fact.value);
  }
  cache.set(identity,grouped);return grouped;
 };
 return (metricId:MetricId,range:DateRange|undefined,key:string|null):number|null=>{
  const semantics=semanticCatalog[metricId].semantics;
  if(key===null)return evaluate(facts,metricId,query,range,key,context);
  if(semantics.kind==='snapshot')return totals(semantics.measure,range,'snapshot').get(key)??null;
  if(semantics.kind==='additive'&&(metricId!==query.metric||defaultSum))return totals(semantics.measure,range,'event').get(key)??0;
  if(semantics.kind==='ratio'||semantics.kind==='duration_derived'){
   const basis=semantics.kind==='ratio'&&semantics.basis==='snapshot'?'snapshot':'event';
   const denominator=totals(semantics.denominator,range,basis).get(key)??0;
   return denominator===0?null:(totals(semantics.numerator,range,basis).get(key)??0)/denominator*semantics.scale;
  }
  return evaluate(facts,metricId,query,range,key,context);
 };
}
function currentKeys(facts: readonly AnalyticsFact[], query: AnalyticsQuery, context: AnalyticsContext): Array<string | null> {
  if (!query.groupBy) return [null];
  const groupBy = query.groupBy;
  const semantics = semanticCatalog[query.metric].semantics;
  const snapshot = semantics.kind === 'snapshot' || semantics.kind === 'ratio' && semantics.basis === 'snapshot';
  const source = snapshot
    ? requiredMeasures(query.metric).flatMap(measure => latestSnapshots(facts, measure, query.dateRange?.to))
    : facts.filter(fact => inRange(fact, query.dateRange));
  const keys = new Set(source.filter(fact => filtered(fact, query, context) && (snapshot || inRange(fact, query.dateRange)))
    .map(fact => dimension(fact, groupBy)).filter((key): key is string => key !== undefined));
  if (snapshot && isTime(groupBy)) {
    if (query.dateRange) return periodKeys(query.dateRange, groupBy);
    return [...new Set(facts.filter(fact => requiredMeasures(query.metric).includes(fact.measureId) && filtered(fact, query, context))
      .map(fact => dimension(fact, groupBy)).filter((key): key is string => key !== undefined))].sort();
  }
  return [...keys].sort();
}
function rangeForKey(query: AnalyticsQuery, key: string | null): DateRange | undefined {
  if (key === null || !query.groupBy || !isTime(query.groupBy)) return query.dateRange;
  const period = periodRange(key, query.groupBy);
  if (!query.dateRange) return period;
  return { from: period.from > query.dateRange.from ? period.from : query.dateRange.from,
    to: period.to < query.dateRange.to ? period.to : query.dateRange.to };
}
function comparisonRange(query: AnalyticsQuery, key: string | null, comparison: NonNullable<AnalyticsQuery['analysis']>['comparison']): { range: DateRange; key: string | null } {
  if (!comparison || !query.dateRange) throw new Error('Comparison requires a date range');
  if (key !== null && query.groupBy && isTime(query.groupBy)) {
    const previous = previousTimeKey(key, query.groupBy, comparison);
    return { range: periodRange(previous, query.groupBy), key: previous };
  }
  return { range: shiftRange(query.dateRange, comparison), key };
}
function compare(value: number | null, prior: number | null): Pick<AnalyticsRow, 'comparisonValue' | 'absoluteChange' | 'percentageChange'> {
  const difference = value === null || prior === null ? null : value - prior;
  return { comparisonValue: prior, absoluteChange: difference,
    percentageChange: difference === null || prior === null || prior === 0 ? null : difference / Math.abs(prior) * 100 };
}
function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((sum, v) => sum + v, 0) / present.length : null;
}
function numericOrder(a: AnalyticsRow, b: AnalyticsRow, direction: 'top' | 'bottom'): number {
  if (a.value === null) return b.value === null ? String(a.key).localeCompare(String(b.key)) : 1;
  if (b.value === null) return -1;
  return (direction === 'top' ? b.value - a.value : a.value - b.value) || String(a.key).localeCompare(String(b.key));
}
export function executeFacts(facts: readonly AnalyticsFact[], query: AnalyticsQuery, context: AnalyticsContext, execution: ExecutionMetadata): AnalyticsResult {
  validateQuery(query, context);
  if (!execution.sourceId.trim() || Number.isNaN(Date.parse(execution.executedAt))) throw new Error('Execution metadata is required');
  const metric = semanticCatalog[query.metric];
  const measures = new Set(requiredMeasures(query.metric));
  const scoped = facts.filter(f => f.tenantId === context.tenantId && measures.has(f.measureId));
  const dataThrough = scoped.filter(f => (context.enforcedFilters ?? []).every(filter => filter.values.includes(dimension(f, filter.dimension) ?? ''))).reduce<string | undefined>((latest, fact) => !latest || fact.date > latest ? fact.date : latest, undefined);
  const comparison = query.analysis?.comparison ?? (metric.semantics.kind === 'comparison_derived' ? metric.semantics.defaultComparison : undefined);
  const valueAt=categoricalEvaluation(scoped,query,context);
  let rows: AnalyticsRow[] = currentKeys(scoped, query, context).map(key => {
    const currentRange = rangeForKey(query, key);
    const base = metric.semantics.kind === 'comparison_derived' ? metric.semantics.base : query.metric;
    const value = valueAt(base,currentRange,key);
    if (!comparison) return { key, value };
    const previous = comparisonRange(query, key, comparison);
    const prior = valueAt(base,previous.range,previous.key);
    const changes = compare(value, prior);
    if (metric.semantics.kind === 'comparison_derived') return { key, value: changes.percentageChange ?? null };
    return { key, value, ...changes };
  });
  if (query.analysis?.movingAverage) {
    const window = query.analysis.movingAverage.window;
    const before = rows;
    rows = before.map((row, i) => {
      const slice = before.slice(Math.max(0, i - window + 1), i + 1);
      const value = average(slice.map(r => r.value));
      return comparison ? { key: row.key, value, ...compare(value, average(slice.map(r => r.comparisonValue ?? null))) } : { key: row.key, value };
    });
  }
  if (query.analysis?.runningTotal) {
    let total = 0;
    let priorTotal = 0;
    rows = rows.map(row => {
      total += row.value ?? 0;
      if (!comparison) return { key: row.key, value: total };
      priorTotal += row.comparisonValue ?? 0;
      return { key: row.key, value: total, ...compare(total, priorTotal) };
    });
  }
  if (query.analysis?.percentageContribution) {
    const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
    rows = rows.map(row => ({ key: row.key, value: total === 0 ? null : (row.value ?? 0) / total * 100 }));
  }
  if (query.analysis?.ranking) {
    const ranked = [...rows].sort((a, b) => numericOrder(a, b, 'top'));
    const ranks = new Map(ranked.map((row, index) => [row.key, index + 1]));
    rows = rows.map(row => ({ ...row, rank: ranks.get(row.key)! }));
  }
  if (query.analysis?.topN) {
    rows = [...rows].sort((a, b) => numericOrder(a, b, query.analysis!.topN!.direction)).slice(0, query.analysis.topN.limit);
  }
  const percentage = !!query.analysis?.percentageContribution;
  return { metric: query.metric, groupBy: query.groupBy ?? null, rows,
    metadata: { sourceId: execution.sourceId, executedAt: execution.executedAt,
      ...(dataThrough ? { dataThrough } : {}),
      ...(execution.sourceAsOf ? { sourceAsOf: execution.sourceAsOf } : {}),
      metricType: percentage ? 'percentage' : metric.type,
      ...(percentage ? { unit: '%' } : metric.presentation.unit ? { unit: metric.presentation.unit } : {}),
      semantics: metric.semantics.kind } };
}
