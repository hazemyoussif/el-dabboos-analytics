import {inventoryAvailabilityCatalog,inventoryAvailabilityMetricIds,validateSourceMapping,timeDimensions} from '@el-dabboos/domain';
import type {SourceMapping,FactMeasureId} from '@el-dabboos/domain';
export const inventoryAvailabilityObject='business_stock_availability_v1';
export function inventoryAvailabilitySourceObject(measure:FactMeasureId):string|undefined {
 return inventoryAvailabilityMetricIds.some(metric=>metric===measure)?inventoryAvailabilityObject:undefined;
}
/** Registered additive recipe extension; never rewrites accepted source rules. */
export function withInventoryAvailabilityMapping(mapping:SourceMapping):SourceMapping {
 validateSourceMapping(mapping);
 if(mapping.mappingId!=='business-purpose-v1-sales-command')throw new Error('Accepted extended Business mapping required');
 const existing=new Set(mapping.measures.map(rule=>rule.measureId));
 if(inventoryAvailabilityMetricIds.some(metric=>existing.has(metric)))throw new Error('Inventory availability recipe already present');
 const measures:SourceMapping['measures'][number][]=inventoryAvailabilityMetricIds.map(metric=>({measureId:metric,sourceObject:inventoryAvailabilityObject,
  grain:'One complete current product/warehouse position after quant reduction',eligibleStates:['Company-owned internal stock; negative quant positions retained'],
  recognitionRule:'Current source business day only; company-scoped unique warehouse ancestor; free quantity clamped after product/warehouse reduction',
  timeZone:mapping.measures[0]!.timeZone,amountBasis:'Product base UOM; free quantity times current company-specific standard cost with Odoo company/global field default and Float zero default; ambiguous user-specific fallback rejected',
  taxTreatment:'Standard-cost valuation in company currency, no sales tax',signConvention:'Reserved quantity nonnegative; free quantity nonnegative after reduction; standard-cost value retains source cost sign',
  identityRule:'Product identity and unique warehouse identity; unknown warehouse remains unassigned',correctionRule:'Complete recipe observation with exact controls, shared prepared serving and immutable publication',currencyPolicy:`native-${mapping.reportingCurrency}`,
  dimensionMappings:Object.fromEntries(inventoryAvailabilityCatalog[metric].dimensions.filter(dimension=>!timeDimensions.includes(dimension)).map(dimension=>[dimension,dimension==='warehouse'?'Unique company-scoped warehouse ancestor; unknown remains unassigned':'Stable source identity at observation; product base UOM retained']))}));
 const next:SourceMapping={...mapping,measures:[...mapping.measures,...measures],capabilities:[...mapping.capabilities,...inventoryAvailabilityMetricIds.map(metric=>({metric,dimensions:inventoryAvailabilityCatalog[metric].dimensions}))]};
 validateSourceMapping(next);return next;
}
