import {semanticCatalog,timeDimensions} from '@el-dabboos/domain';
import type {AnalyticsQuery,ComparisonPeriod} from '@el-dabboos/domain';
import {periodRange,previousTimeKey,shiftRange} from '../calendar.ts';
export interface QuerySlot { key:string|null;from:string|null;to:string|null;match_key:string|null }
export function querySlots(query: AnalyticsQuery,keys: (string|null)[]): { current: QuerySlot[]; prior: QuerySlot[]; comparison: ComparisonPeriod | undefined } {
  const semantics = semanticCatalog[query.metric].semantics;
  const timeGrouping = !!query.groupBy && timeDimensions.includes(query.groupBy);
  const current: QuerySlot[] = keys.map(key => {
    let range = query.dateRange;
    if (key !== null && timeGrouping && query.groupBy) { const period = periodRange(key,query.groupBy); range = range ? { from: period.from > range.from ? period.from : range.from,to: period.to < range.to ? period.to : range.to } : period; }
    return { key,from: range?.from ?? null,to: range?.to ?? null,match_key: key };
  });
  const comparison = query.analysis?.comparison ?? (semantics.kind === 'comparison_derived' ? semantics.defaultComparison : undefined);
  const prior: QuerySlot[] = comparison ? keys.map(key => {
    if (key !== null && timeGrouping && query.groupBy) { const match_key = previousTimeKey(key,query.groupBy,comparison); const range = periodRange(match_key,query.groupBy); return { key,match_key,from: range.from,to: range.to }; }
    if (!query.dateRange) throw new Error('Comparison requires date range');
    const range = shiftRange(query.dateRange,comparison); return { key,match_key: key,from: range.from,to: range.to };
  }) : [];

  return { current,prior,comparison };
}
