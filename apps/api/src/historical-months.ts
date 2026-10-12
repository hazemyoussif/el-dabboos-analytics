import { validDateRange, reconcileDerivedRatio } from '@el-dabboos/domain';
import type { MetricId, ReconciliationCase } from '@el-dabboos/domain';

export function historicalMonths(from = '2025-10-01', to = '2026-09-30') {
  if (!validDateRange({from,to}) || !from.endsWith('-01')) throw new Error('Complete historical month boundaries required');
  const first = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
  const finalDay = new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).toISOString().slice(0,10);
  const count = (end.getUTCFullYear()-first.getUTCFullYear())*12 + end.getUTCMonth()-first.getUTCMonth()+1;
  if (to !== finalDay || count < 1 || count > 24) throw new Error('One to twenty-four complete months required');
  return Array.from({length:count},(_,index) => {
    const start = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+index,1));
    const last = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+index+1,0));
    return {month:start.toISOString().slice(0,7),from:start.toISOString().slice(0,10),to:last.toISOString().slice(0,10)};
  });
}
export function reconciliationLedger(cases: readonly ReconciliationCase[]) {
  const groups = new Map<string, ReconciliationCase[]>();
  for (const control of cases) {
    const key = JSON.stringify([control.measureId, control.grouping]);
    const group = groups.get(key) ?? [];
    group.push(control); groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    metric: group[0]!.measureId, dimension: group[0]!.grouping, groupCount: group[0]!.grouping ? group.length : 0,
    exactCases: group.filter(control => control.actualValue === control.expectedValue && control.actualCount === control.expectedCount).length,
    deltaCases: group.filter(control => control.actualValue !== control.expectedValue || control.actualCount !== control.expectedCount).length,
  }));
}
export function validateHistoricalMonth(period: { month: string; from: string; to: string }): void {
  const months = historicalMonths(period.from,period.to);
  if (months.length !== 1 || months[0]!.month !== period.month) throw new Error('Complete historical month required');
}

/** Ratios use the existing exact rational control; inputs alone never certify outputs. */
export function historicalRatioLedger(cases: readonly ReconciliationCase[], metrics: readonly MetricId[]) {
  return metrics.flatMap(metric => [null,'business_line','salesperson','customer'].flatMap(dimension => {
    const operands = metric === 'average_confirmed_order_value' ? ['order_revenue','order_count'] : metric === 'average_invoice_value' ? ['invoiced_revenue','invoice_count'] : ['total_overdue_receivable','net_aged_receivable'];
    const inputs = cases.filter(control => control.grouping === dimension && operands.includes(control.measureId));
    if (!inputs.length) return [];
    const controls = reconcileDerivedRatio(metric,inputs);
    return [{metric,dimension,groupCount:dimension ? controls.length : 0,exactCases:controls.length,deltaCases:0,controls,status:'exact-rational-inputs',certified:false}];
  }));
}
export function verifyGroupedSums(cases: readonly ReconciliationCase[]): void {
  const summaries = cases.filter(control => control.grouping === null);
  for (const total of summaries) for (const dimension of ['business_line','salesperson','customer']) {
    const groups = cases.filter(control => control.measureId === total.measureId && control.grouping === dimension);
    if (!groups.length) continue;
    const sum = (field: 'expectedValue'|'actualValue') => groups.reduce((value,control) => value + BigInt(control[field].replace('.','')),0n);
    if (sum('expectedValue') !== BigInt(total.expectedValue.replace('.','')) || sum('actualValue') !== BigInt(total.actualValue.replace('.',''))) throw new Error(`Historical group sum discrepancy: ${total.measureId}/${dimension}`);
    const count = (field: 'expectedCount'|'actualCount') => groups.reduce((value,control) => value + BigInt(control[field]),0n);
    if (count('expectedCount') !== BigInt(total.expectedCount) || count('actualCount') !== BigInt(total.actualCount)) throw new Error(`Historical group population discrepancy: ${total.measureId}/${dimension}`);
  }
}
export function verifyHistoricalCheckpoint(period: {month:string;from:string;to:string}, prior: {month:string;cases:ReconciliationCase[];snapshot:{frozenRevision:string}}, rows: {specification:ReconciliationCase;status:string;group_completeness:boolean}[]): void {
  validateHistoricalMonth(period);
  if (prior.month !== period.month || !prior.cases?.length || rows.length !== prior.cases.length) throw new Error('Historical checkpoint scope conflict');
  const canonical = (value: unknown) => JSON.stringify(value, (_key,item) => item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item);
  const stored = new Map(rows.map(row => [row.specification.caseId,row]));
  for (const control of prior.cases) {
    const row = stored.get(control.caseId);
    if (!row || row.status !== 'passed' || !row.group_completeness || canonical(control) !== canonical(row.specification)) throw new Error('Immutable historical checkpoint evidence conflict');
    verifyCheckpointControl(control,period,prior.snapshot.frozenRevision);
  }
}
function verifyCheckpointControl(control:ReconciliationCase,period:{from:string;to:string},frozenRevision:string) {
  if (control.frozenRevision !== frozenRevision || control.from !== period.from || control.to !== period.to || control.expectedValue !== control.actualValue || control.expectedCount !== control.actualCount) throw new Error('Immutable historical checkpoint evidence conflict');
}
