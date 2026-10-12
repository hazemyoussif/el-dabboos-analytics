import type { FactMeasureId, SourceMapping } from '@el-dabboos/domain';
import { isCanonicalDecimal, validDateRange, validateSourceMapping } from '@el-dabboos/domain';
export const receivableMeasures = ['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','gross_open_receivable_components','credit_balances'] as const satisfies readonly FactMeasureId[];
export interface ReceivableComponent { componentId: string; customerId: string; accountingDate: string; maturityDate: string | null; residual: string }
export interface CustomerAgingSnapshot { customerId: string; values: Record<typeof receivableMeasures[number], string> }
const bucketMeasures = ['aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120'] as const;

export interface ReceivableSummaryMappingIdentity {
 tenantId: string; sourceId: string; datasetId: string; mappingId: string; mappingVersion: string;
 businessOwner: string; reportingCurrency: string; timeZone: string; cutoff: string;
}
/** Canonical signed-aging summary mapping. It is definition-owned and does not depend on a prior environment-specific dataset. */
export function receivableSummaryCandidate(identity: ReceivableSummaryMappingIdentity): SourceMapping {
 if (!validDateRange({from:identity.cutoff,to:identity.cutoff})) throw new Error('Valid receivable summary cutoff required');
 const measures = receivableMeasures.map(measureId => ({
  measureId,sourceObject:'receivable_cutoff',grain:'One company summary at month-end',eligibleStates:['open'],
  recognitionRule:'Signed residual reconstructed at the exact month-end cutoff',timeZone:identity.timeZone,
  amountBasis:'Signed company-currency residual after post-cutoff payment exclusion',taxTreatment:'Residual balance; no tax reclassification',
  signConvention:'Debit/open components positive; credits negative',identityRule:'Stable source company summary identity; one immutable cutoff per monthly release',
  correctionRule:'New immutable cutoff release; no in-place mutation',currencyPolicy:`native-${identity.reportingCurrency}`,dimensionMappings:{},
 }));
 const mapping: SourceMapping = {
  tenantId:identity.tenantId,sourceId:identity.sourceId,datasetId:identity.datasetId,mappingId:identity.mappingId,mappingVersion:identity.mappingVersion,
  businessBasis:`Signed company-ledger month-end snapshot ${identity.cutoff}; exact governed residual reconstruction`,
  reportingCurrency:identity.reportingCurrency,businessOwner:identity.businessOwner,approval:{status:'pending'},measures,
  capabilities:[...receivableMeasures.map(metric => ({metric,dimensions:[]})),{metric:'overdue_receivable_percentage',dimensions:[]}],
 };
 validateSourceMapping(mapping);
 return mapping;
}
function agingBucket(component: ReceivableComponent, cutoff: string) {
 const maturity = component.maturityDate ?? component.accountingDate;
 if (!validDateRange({from:maturity,to:maturity})) throw new Error('Valid maturity/accounting date required');
 const days = (Date.parse(cutoff) - Date.parse(maturity)) / 86400000;
 if (days <= 0) return 'aged_at_date';
 const index = Math.min(Math.ceil(days / 30), 5);
 return bucketMeasures[index]!;
}
function decimal(units: bigint): string {
 const absolute = units < 0n ? -units : units;
 return `${units < 0n ? '-' : ''}${absolute / 1000000n}.${String(absolute % 1000000n).padStart(6,'0')}`;
}
/** Frozen signed ledger residuals, already reconstructed through cutoff by the approved source control.
 * Produces explicit zero complements and derives overdue ONLY from the five exact bucket inputs. */
export function mapReceivableSnapshots(components: readonly ReceivableComponent[], cutoff: string): CustomerAgingSnapshot[] {
 if (!validDateRange({from:cutoff,to:cutoff}) || components.length > 10000) throw new Error('Bounded valid cutoff required');
 const identities = new Set<string>();
 const customers = new Map<string, Record<typeof receivableMeasures[number], bigint>>();
 for (const component of components) {
  if (!component.componentId || !component.customerId || identities.has(component.componentId) || !isCanonicalDecimal(component.residual) || !validDateRange({from:component.accountingDate,to:cutoff})) throw new Error('Unique valid dated receivable component required');
  identities.add(component.componentId);
  const values = customers.get(component.customerId) ?? Object.fromEntries(receivableMeasures.map(measure => [measure,0n])) as Record<typeof receivableMeasures[number], bigint>;
  const residual = BigInt(component.residual.replace('.',''));
  values[agingBucket(component,cutoff)] += residual;
  values[residual >= 0n ? 'gross_open_receivable_components' : 'credit_balances'] += residual;
  customers.set(component.customerId,values);
 }
 return [...customers].sort(([left],[right]) => left.localeCompare(right)).map(([customerId,values]) => {
  values.net_aged_receivable = bucketMeasures.reduce((sum,measure) => sum + values[measure],0n);
  values.total_overdue_receivable = bucketMeasures.slice(1).reduce((sum,measure) => sum + values[measure],0n);
  return {customerId,values:Object.fromEntries(receivableMeasures.map(measure => [measure,decimal(values[measure])])) as CustomerAgingSnapshot['values']};
 });
}
