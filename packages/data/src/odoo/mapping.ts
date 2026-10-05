import { requiredMeasures, validateSourceMapping } from '@el-dabboos/domain';
import type { FactMeasureId, MetricId, SourceMapping } from '@el-dabboos/domain';
const orderMeasures: (FactMeasureId & MetricId)[] = ['order_revenue','order_count','cancelled_orders'];
const invoiceMeasures: (FactMeasureId & MetricId)[] = ['net_invoiced_revenue','invoiced_revenue','refund_value','invoice_count','refund_count'];
export interface OdooMappingIdentity {
  tenantId: string; sourceId: string; datasetId: string; mappingId: string; mappingVersion: string;
  businessOwner: string; reportingCurrency: string; timeZone: string;
}
export function odooComparisonCandidate(identity: OdooMappingIdentity): SourceMapping {
  const metrics: MetricId[] = [...orderMeasures,...invoiceMeasures,'average_confirmed_order_value','average_invoice_value','customers_served'];
  const mapping: SourceMapping = { tenantId: identity.tenantId,sourceId: identity.sourceId,datasetId: identity.datasetId,mappingId: identity.mappingId,mappingVersion: identity.mappingVersion,
    businessOwner: identity.businessOwner,reportingCurrency: identity.reportingCurrency,businessBasis: 'Separate confirmed order totals and signed untaxed posted customer invoices/refunds',approval: { status: 'pending' },
    measures: [...orderMeasures,...invoiceMeasures].map(measureId => {
      const order = orderMeasures.includes(measureId);
      return { measureId,sourceObject: order ? 'sale_order' : 'account_move',grain: 'transaction header',eligibleStates: order ? ['sale','cancel'] : ['posted'],recognitionRule: order ? 'order date in configured business timezone' : 'invoice issue date including refunds',timeZone: identity.timeZone,
        amountBasis: order ? 'confirmed amount_total; cancelled count only' : 'amount_untaxed_signed; invoices and refunds separately governed',taxTreatment: 'tax retained separately in transaction evidence',signConvention: 'net signed; refund magnitude positive',identityRule: 'source object/id/whole/measure',correctionRule: 'write_date revision; explicit eligibility tombstones; no absence deletion',currencyPolicy: `native-${identity.reportingCurrency}`,
        dimensionMappings: { customer: 'transaction partner stable ID; no company-person filter',salesperson: 'business user stable ID; null unassigned',business_line: 'company-scoped stable ID',city: 'stored nullable city',state: 'stable stored governorate ID' } };
    }),
    capabilities: metrics.map(metric => ({ metric,dimensions: ['date','month','quarter','year','customer','salesperson','business_line','city','state'] })) };
  if (mapping.capabilities.some(capability => !requiredMeasures(capability.metric).every(measure => mapping.measures.some(rule => rule.measureId===measure)))) throw new Error('Incomplete comparison mapping');
  validateSourceMapping(mapping);
  return mapping;
}
