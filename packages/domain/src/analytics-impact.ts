import { requiredMeasures, semanticCatalog } from './catalog.ts';
import type { DimensionId, MetricId } from './contracts.ts';
import type { ProductionFact } from './production-data.ts';
import { validDateRange } from './validation.ts';

export interface FactRevisionChange { previous?: ProductionFact; next: ProductionFact }
export interface AnalyticsPartition {
  metric: MetricId; month: string; dimension: DimensionId | null; identity: string | null;
  dependency: 'base' | 'moving_average' | 'running_total' | 'year_over_year' | 'contribution' | 'snapshot';
}
export interface ImpactPolicy {
  through: string;
  /** Only materialized analyses belong here; ordinary queries derive from governed bases. */
  movingAverageWindows: readonly number[];
  runningTotals: boolean; yearOverYear: boolean; contribution: boolean;
  /** Source dependency adapter proves the last cutoff where a component contributes. */
  snapshotDependencies: (change: FactRevisionChange) => readonly { metric: MetricId; from: string; through: string }[];
}

/** Business time drives invalidation. Source modification time never determines a partition. */
export function resolveAnalyticsImpact(changes: readonly FactRevisionChange[], policy: ImpactPolicy): AnalyticsPartition[] {
  validatePolicy(policy);
  const partitions = new Map<string, AnalyticsPartition>();
  const add = (partition: AnalyticsPartition) => partitions.set(JSON.stringify(partition), partition);
  for (const change of changes) {
    validateChange(change);
    for (const fact of [change.previous, change.next]) {
      if (!fact || fact.status !== 'active') continue;
      const metrics = Object.values(semanticCatalog).filter(metric => requiredMeasures(metric.id).includes(fact.measureId));
      for (const metric of metrics) addFactImpact(fact, metric.id, policy, add);
    }
    for (const dependency of policy.snapshotDependencies(change)) {
      if (!validDateRange({ from: dependency.from, to: dependency.through }) || dependency.through > policy.through) throw new Error('Invalid snapshot dependency scope');
      for (const month of months(dependency.from, dependency.through)) {
        add({ metric: dependency.metric, month, dimension: null, identity: null, dependency: 'snapshot' });
      }
    }
  }
  return [...partitions.values()].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function addFactImpact(fact: ProductionFact, metric: MetricId, policy: ImpactPolicy, add: (partition: AnalyticsPartition) => unknown) {
  const month = fact.businessDate.slice(0, 7);
  const dimensions = semanticCatalog[metric].dimensions;
  const base: AnalyticsPartition = { metric, month, dimension: null, identity: null, dependency: fact.kind === 'snapshot' ? 'snapshot' : 'base' };
  add(base);
  for (const dimension of dimensions) {
    const identity = fact.dimensions[dimension];
    if (identity !== undefined) {
      const group={...base,dimension,identity};
      add(group);addDerivedImpact(group,policy,add);
    }
  }
  addDerivedImpact(base, policy, add);
}

function addDerivedImpact(base: AnalyticsPartition, policy: ImpactPolicy, add: (partition: AnalyticsPartition) => unknown) {
  if (base.dependency === 'snapshot') return;
  for (const window of policy.movingAverageWindows) {
    for (let offset = 0; offset < window; offset++) {
      const month = shiftMonth(base.month, offset);
      if (month <= policy.through.slice(0, 7)) add({ ...base, month, dependency: 'moving_average' });
    }
  }
  if (policy.runningTotals) for (const month of months(`${base.month}-01`, policy.through)) add({ ...base, month, dependency: 'running_total' });
  if (policy.yearOverYear) add({ ...base, month: shiftMonth(base.month, 12), dependency: 'year_over_year' });
  // A changed denominator affects every group's contribution in this period.
  if (policy.contribution) add({ ...base,dimension:null,identity:null,dependency: 'contribution' });
}

function validatePolicy(policy: ImpactPolicy) {
  if (typeof policy.snapshotDependencies!=='function')throw new Error('Explicit snapshot dependency resolver required');
  if (!validDateRange({ from: policy.through, to: policy.through }) || policy.movingAverageWindows.some(window => !Number.isInteger(window) || window < 1 || window > 24)) throw new Error('Invalid impact policy');
}
function validateChange(change: FactRevisionChange) {
  const previous = change.previous, next = change.next;
  if (!validDateRange({ from: next.businessDate, to: next.businessDate })) throw new Error('Invalid business date');
  if (previous && (previous.tenantId !== next.tenantId || previous.sourceId !== next.sourceId || previous.sourceObject !== next.sourceObject || previous.sourceRecordId !== next.sourceRecordId || previous.measureId !== next.measureId || previous.componentId !== next.componentId)) throw new Error('Revision identity conflict');
}
function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
function months(from: string, through: string) {
  const result: string[] = [];
  for (let month = from.slice(0, 7); month <= through.slice(0, 7); month = shiftMonth(month, 1)) {
    if (result.length >= 1200) throw new Error('Impact span exceeds bound');
    result.push(month);
  }
  return result;
}
