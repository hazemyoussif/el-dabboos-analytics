import { createHash } from 'node:crypto';
import { businessMetricIds,semanticCatalog } from '@el-dabboos/domain';
const reviewMetrics=new Set(['customer_cash_collected','cash_applied_to_invoices','unallocated_customer_receipts','customer_collection_ratio','weighted_collection_days','receivables_due_for_collection','order_margin','order_margin_percentage']);
/** Existing fact/aging baselines retain their exact execution definition. The new
 * review family fingerprints its own semantics and line-level dimensions separately. */
export function operationalDefinitionVersion(){
 const legacy=Object.fromEntries(Object.entries(semanticCatalog).filter(([id])=>!reviewMetrics.has(id)&&!businessMetricIds.includes(id as import('@el-dabboos/domain').BusinessMetricId)).map(([id,metric])=>[id,['net_invoiced_revenue','invoiced_revenue','refund_value','average_invoice_value'].includes(id)?{...metric,dimensions:metric.dimensions.filter(dimension=>dimension!=='product'&&dimension!=='product_category')}:metric]));
 return createHash('sha256').update(JSON.stringify(legacy)).digest('hex');
}
export function compatibleOperationalDefinition(version:string){return version===operationalDefinitionVersion();}
