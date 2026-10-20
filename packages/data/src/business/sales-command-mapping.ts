import {commandInvoiceRecipe,commandReceiptRecipe,commandOrderRecipe,commandDebtRecipe,commandSameDayRecipe} from './sales-command-recipes.ts';
import {createHash} from 'node:crypto';
import {currentSalesCommandMetrics,requiredMeasures,salesCommandCatalog,salesCommandMetricIds,timeDimensions,validateSourceMapping} from '@el-dabboos/domain';
import type {FactMeasureId,SourceMapping} from '@el-dabboos/domain';

export function salesCommandSourceObject(measure:FactMeasureId):string|undefined {
 if(!measure.startsWith('command_'))return undefined;
 if(measure==='command_same_day_cash')return 'command_allocation';
 if(measure.startsWith('command_invoice')||measure==='command_net_invoices'||measure.startsWith('command_document'))return 'command_invoice';
 if(measure.startsWith('command_order')||measure.startsWith('command_cancelled')||measure==='command_decided_orders')return 'command_order';
 if(measure.startsWith('command_receipt')||measure==='command_cash_received')return 'command_receipt';
 return 'command_receivable';
}
/** Explicit opt-in extends a complete Business partition; existing measures are never replaced by a subset. */
export function withSalesCommandMapping(mapping:SourceMapping,current:boolean):SourceMapping {
 const metrics=salesCommandMetricIds.filter(metric=>current||!currentSalesCommandMetrics.includes(metric));
 const measures=[...new Set(metrics.flatMap(requiredMeasures))];
 const rules=measures.map(measure=>commandRule(measure,mapping));
 const extended:SourceMapping={...mapping,mappingId:mapping.mappingId+'-sales-command',mappingVersion:salesCommandDefinitionVersion(),businessBasis:'Business-purpose v1 plus Sales Command Center; original recipes retained; tax-inclusive headers, signed cash and current-cutoff receivables; Finance review pending',measures:[...mapping.measures,...rules],capabilities:[...mapping.capabilities,...metrics.map(metric=>({metric,dimensions:salesCommandCatalog[metric].dimensions}))]};
 validateSourceMapping(extended);return extended;
}
function commandRule(measure:FactMeasureId,mapping:SourceMapping):SourceMapping['measures'][number] {
 const metrics=salesCommandMetricIds.filter(metric=>requiredMeasures(metric).includes(measure));
 const dimensions=metrics.map(metric=>salesCommandCatalog[metric].dimensions).reduce((shared,next)=>shared.filter(dimension=>next.includes(dimension)));
 return {measureId:measure,sourceObject:salesCommandSourceObject(measure)!,grain:'Independent source transaction header, partial allocation or open receivable journal item',eligibleStates:['Source states retained; posted invoices; sale/done confirmed orders; paid/in_process signed cash'],recognitionRule:'Tenant-local order timestamp; invoice/payment DATE; explicit receivable cutoff; status/residual observed at extraction',timeZone:mapping.measures[0]!.timeZone,amountBasis:'Exact company-currency source header numerics; cash allocations use existing approved allocation precision',taxTreatment:'Invoice and order headers include tax; cash/balances retain settlement tax',signConvention:'Outbound cash and invoice credits subtract; receivable credits remain signed; refund metric positive',identityRule:'Source object and stable header/partial/journal-item ID, once per measure',correctionRule:'Complete immutable Business partition replacement; prepare, reconcile and activate through existing governed lifecycle',currencyPolicy:`native-${mapping.reportingCurrency}`,dimensionMappings:Object.fromEntries(dimensions.filter(dimension=>!timeDimensions.includes(dimension)).map(dimension=>[dimension,dimensionRule(dimension,measure)]))};
}
function dimensionRule(dimension:string,measure:FactMeasureId):string {
 if(dimension==='salesperson')return salesCommandSourceObject(measure)==='command_receipt'?'Payment salesperson_id FK to res_users':salesCommandSourceObject(measure)==='command_receivable'?'Current customer user_id, then receivable-line salesperson_id; not historical assignment':'Unique receivable-line salesperson_id per invoice header; ambiguous assignments rejected; allocation uses invoice attribution; orders use user_id';
 if(dimension.endsWith('_state'))return 'Exact source state string at extraction; unknown states retained, null unassigned';
 if(dimension==='state')return 'Current partner governorate at extraction, stable res_country_state identity';
 return 'Stable source customer identity; null unassigned';
}
export function salesCommandDefinitionVersion():string {
 return createHash('sha256').update(JSON.stringify({catalog:salesCommandCatalog,recipes:[commandInvoiceRecipe,commandReceiptRecipe,commandOrderRecipe,commandDebtRecipe,commandSameDayRecipe]})).digest('hex');
}
