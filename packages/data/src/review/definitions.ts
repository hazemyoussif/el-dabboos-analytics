import {reviewAllocationAmountBasis} from './allocation-precision.ts';
import {createHash} from 'node:crypto';
import {semanticCatalog,requiredMeasures,timeDimensions,validateSourceMapping} from '@el-dabboos/domain';
import type {FactMeasureId,MetricId,SourceMapping,PublishedAnalyticsCapabilities,PublishedMetricCapability} from '@el-dabboos/domain';
export const reviewMetrics:readonly MetricId[]=['customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts','customer_collection_ratio','weighted_collection_days','receivables_due_for_collection','order_margin','order_margin_percentage'];
export const productReviewMetrics:readonly MetricId[]=['net_invoiced_revenue','invoiced_revenue','refund_value'];
const receiptRecognitionRule='Payment date; allocations at extraction cutoff; foreign-currency receipts allowed only with exact zero amount/cash and no invoice allocations';
const productMeasures=new Set<FactMeasureId>(productReviewMetrics as FactMeasureId[]);
export function reviewDefinitionVersion(){return createHash('sha256').update(JSON.stringify([...reviewMetrics,...productReviewMetrics].map(metric=>semanticCatalog[metric]))).digest('hex');}
export function reviewMapping(scope:{tenantId:string;sourceId:string;currency:string;timeZone:string;datasetId:string}):SourceMapping {
 const measures=[...new Set([...reviewMetrics,...productReviewMetrics].flatMap(requiredMeasures))];
 const rules=measures.map(measureId=>{
  const order=measureId==='order_margin'||measureId==='order_untaxed_value',product=productMeasures.has(measureId),snapshot=measureId==='receivables_due_for_collection';
  const dims=order?['customer','salesperson','business_line']:product?['customer','salesperson','business_line','product','product_category']:['customer'];
  return {measureId,sourceObject:order?'sale_order':product?'account_move_line':snapshot?'receivable_cutoff':'account_payment',grain:product?'invoice product line':snapshot?'receivable journal item at cutoff':'transaction header',eligibleStates:['posted','sale'],recognitionRule:snapshot?'month-end historic balance with maturity on/before cutoff':order?'order date in business timezone':product?'invoice issue date':receiptRecognitionRule,timeZone:scope.timeZone,amountBasis:order||product||snapshot?'Exact company-currency source operands; ratios derived from matching totals':reviewAllocationAmountBasis,taxTreatment:'Order margin denominator and product invoices untaxed; customer receipts include document settlement tax',signConvention:'Signed invoice net; positive refunds and receipts',identityRule:'object/id/component/measure',correctionRule:'Complete bounded month replacement; immutable prior revisions retained',currencyPolicy:`native-${scope.currency}`,dimensionMappings:Object.fromEntries(dims.map(dimension=>[dimension,'Stable source identity; null unassigned']))};
 });
 const mapping:SourceMapping={tenantId:scope.tenantId,sourceId:scope.sourceId,datasetId:scope.datasetId,mappingId:'collections-product-margin-v3',mappingVersion:'3',businessOwner:'Finance post-exposure review',reportingCurrency:scope.currency,businessBasis:'User-authorized exposure before Finance review; technical exactness required',approval:{status:'pending'},measures:rules,capabilities:[...reviewMetrics,...productReviewMetrics].map(metric=>({metric,dimensions:semanticCatalog[metric].dimensions.filter(dimension=>timeDimensions.includes(dimension)||requiredMeasures(metric).every(measure=>Object.hasOwn(rules.find(rule=>rule.measureId===measure)!.dimensionMappings,dimension)))}))};
 validateSourceMapping(mapping);return mapping;
}
export function reviewCapabilities(mapping:SourceMapping,scope:{month:string;cutoff:string;reference:string}):PublishedAnalyticsCapabilities {
 const capabilities:PublishedMetricCapability[]=mapping.capabilities.map(capability=>({...capability,summary:true,analyses:semanticCatalog[capability.metric].semantics.kind==='additive'?['ranking','topN','percentageContribution']:['ranking','topN']}));
 const to=new Date(Date.UTC(Number(scope.month.slice(0,4)),Number(scope.month.slice(5)),0)).toISOString().slice(0,10);
 return {tenantId:mapping.tenantId,mode:'certified',releases:[{datasetId:mapping.datasetId,sourceId:mapping.sourceId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,certificationReference:scope.reference,financeReview:'pending',period:{from:scope.month+'-01',to},capabilities}]};
}
