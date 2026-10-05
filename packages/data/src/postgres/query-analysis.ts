import type { AnalyticsQuery, AnalyticsRow } from '@el-dabboos/domain';
export const compareValues = (value: number|null,prior: number|null) => ({ comparisonValue: prior,absoluteChange: value===null || prior===null ? null : value-prior,percentageChange: value===null || prior===null || prior===0 ? null : (value-prior)/Math.abs(prior)*100 });
const mean = (values: (number|null)[]) => { const present = values.filter((value): value is number => value!==null); return present.length ? present.reduce((sum,value) => sum+value,0)/present.length : null; };
function numericOrder(direction: 'top'|'bottom') {
  return (left: AnalyticsRow,right: AnalyticsRow): number => {
    if (left.value===null) return right.value===null ? String(left.key).localeCompare(String(right.key)) : 1;
    if (right.value===null) return -1;
    return (direction==='top' ? right.value-left.value : left.value-right.value) || String(left.key).localeCompare(String(right.key));
  };
}
function movingAverage(rows: AnalyticsRow[],window: number,comparison: boolean): AnalyticsRow[] {
  return rows.map((row,index) => {
    const slice = rows.slice(Math.max(0,index-window+1),index+1);
    const value = mean(slice.map(item => item.value));
    return comparison ? { key: row.key,value,...compareValues(value,mean(slice.map(item => item.comparisonValue ?? null))) } : { key: row.key,value };
  });
}
function runningTotal(rows: AnalyticsRow[],comparison: boolean): AnalyticsRow[] {
  let total=0,priorTotal=0;
  return rows.map(row => {
    total+=row.value ?? 0; priorTotal+=row.comparisonValue ?? 0;
    return comparison ? { key: row.key,value: total,...compareValues(total,priorTotal) } : { key: row.key,value: total };
  });
}
export function analyzeRows(input: AnalyticsRow[],query: AnalyticsQuery,comparison: boolean): AnalyticsRow[] {
  let rows = input;
  if (query.analysis?.movingAverage) rows = movingAverage(rows,query.analysis.movingAverage.window,comparison);
  if (query.analysis?.runningTotal) rows = runningTotal(rows,comparison);
  if (query.analysis?.percentageContribution) {
    const total = rows.reduce((sum,row) => sum+(row.value ?? 0),0);
    rows = rows.map(row => ({ key: row.key,value: total===0 ? null : (row.value ?? 0)/total*100 }));
  }
  if (query.analysis?.ranking) {
    const ranks = new Map([...rows].sort(numericOrder('top')).map((row,index) => [row.key,index+1]));
    rows = rows.map(row => ({ ...row,rank: ranks.get(row.key)! }));
  }
  if (query.analysis?.topN) rows = [...rows].sort(numericOrder(query.analysis.topN.direction)).slice(0,query.analysis.topN.limit);
  if (rows.some(row => Object.values(row).some(value => typeof value==='number' && (!Number.isFinite(value) || Math.abs(value)>Number.MAX_SAFE_INTEGER)))) throw new Error('Unsafe derived result');
  return rows;
}
