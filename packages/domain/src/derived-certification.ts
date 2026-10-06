import { semanticCatalog } from './catalog.ts';
import { isCanonicalDecimal, reconciliationStatus } from './production-data.ts';
import type { DimensionId, MetricId } from './contracts.ts';
import type { ReconciliationCase } from './production-data.ts';

/** Separate output approval; approved inputs alone never publish a ratio. */
export interface DerivedMetricCertification {
  tenantId: string; datasetId: string; mappingVersion: string; reference: string;
  metric: MetricId; grouping: DimensionId|null; from: string; to: string;
  caseIds: readonly string[]; approvalReference: string; approvedAt: string;
  businessSemantics: string; technicalReference: string;
}
export interface DerivedRatioControl {
  groupKey: string|null; numerator: string; denominator: string;
  /** An exact rational representation avoids inventing decimal precision for recurring ratios. */
  value: { numerator: string; denominator: string; scale: number }|null;
}
export function reconcileDerivedRatio(metric: MetricId,cases: readonly ReconciliationCase[]): DerivedRatioControl[] {
  const recipe=semanticCatalog[metric]?.semantics;
  if (recipe?.kind!=='ratio' || !cases.length) throw new Error('Governed ratio and exact input evidence required');
  const first=cases[0]!;
  const scope=(control: ReconciliationCase) => JSON.stringify([control.tenantId,control.datasetId,control.mappingVersion,control.from,control.to,control.grouping,control.frozenRevision]);
  const groups=new Map<string|null,Map<string,ReconciliationCase>>();
  for (const control of cases) {
    if (scope(control)!==scope(first) || reconciliationStatus(control)!=='passed' || control.expectedValue!==control.actualValue || control.expectedCount!==control.actualCount) throw new Error('Exact compatible inputs required');
    if (![recipe.numerator,recipe.denominator].includes(control.measureId)) throw new Error('Unexpected ratio input');
    const group=groups.get(control.groupKey) ?? new Map<string,ReconciliationCase>();
    if (group.has(control.measureId)) throw new Error('Duplicate ratio input');
    group.set(control.measureId,control);groups.set(control.groupKey,group);
  }
  return [...groups].map(([groupKey,group]) => {
    const numerator=group.get(recipe.numerator);const denominator=group.get(recipe.denominator);
    if (!numerator || !denominator || !isCanonicalDecimal(denominator.actualValue) || BigInt(denominator.actualValue.replace('.',''))<0n) throw new Error('Missing/invalid ratio denominator');
    return { groupKey,numerator: numerator.actualValue,denominator: denominator.actualValue,value: BigInt(denominator.actualValue.replace('.',''))===0n ? null : { numerator: numerator.actualValue,denominator: denominator.actualValue,scale: recipe.scale } };
  });
}
export function validateDerivedCertification(certification: DerivedMetricCertification,cases: readonly ReconciliationCase[]): void {
  const first=cases[0];
  if (!first || !certification.approvalReference?.trim() || !certification.businessSemantics?.trim() || !certification.technicalReference?.trim() || !certification.reference?.trim() || !Number.isFinite(Date.parse(certification.approvedAt))) throw new Error('Authorized output approval required');
  for (const key of ['tenantId','datasetId','mappingVersion','from','to','grouping'] as const) if (certification[key]!==first[key]) throw new Error('Derived certification scope mismatch');
  if (new Set(certification.caseIds).size!==cases.length || cases.some(control=>!certification.caseIds.includes(control.caseId))) throw new Error('Complete exact input cases required');
  reconcileDerivedRatio(certification.metric,cases);
}
