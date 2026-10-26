import type {SourceMapping} from '@el-dabboos/domain';
import {inventoryAvailabilityMetricIds} from '@el-dabboos/domain';
import {withInventoryAvailabilityMapping} from './inventory-availability-mapping.ts';
import {customerCoverageBasis,customerCoverageObject,withCustomerCoverageMapping} from './customer-coverage-mapping.ts';
import {stableContent} from '../operational/facts.ts';
import {withSalesCommandMapping,withSalesCommandRecipe} from './sales-command-mapping.ts';

/** Only registered additive recipes may extend an accepted mapping. */
export function compatibleBusinessDeltaMapping(previous:SourceMapping,next:SourceMapping):boolean {
 if(stableContent(previous)===stableContent(next))return true;
 if(previous.mappingId!=='business-purpose-v1'&&previous.mappingId!=='business-purpose-v1-sales-command')return false;
 if(coverageExtension(previous,next))return true;
 if(previous.mappingId==='business-purpose-v1-sales-command'&&!previous.measures.some(rule=>inventoryAvailabilityMetricIds.some(metric=>metric===rule.measureId))&&stableContent(withInventoryAvailabilityMapping(previous))===stableContent(next))return true;
 const current=next.capabilities.some(capability=>capability.metric==='command_invoice_residual');
 if(previous.mappingId==='business-purpose-v1'&&previous.mappingVersion==='1'&&stableContent(withSalesCommandMapping(previous,current))===stableContent(next))return true;
 for(const object of ['command_invoice','command_receipt','command_order','command_receivable','command_allocation']){
  if(stableContent(withSalesCommandRecipe(previous,object,current))===stableContent(next))return true;
 }
 return false;
}
function coverageExtension(previous:SourceMapping,next:SourceMapping){
 if(previous.mappingId!=='business-purpose-v1-sales-command'||previous.measures.some(rule=>rule.sourceObject===customerCoverageObject)||!next.measures.some(rule=>rule.sourceObject===customerCoverageObject))return false;
 try{return stableContent(withCustomerCoverageMapping(previous,customerCoverageBasis(next)))===stableContent(next);}
 catch{return false;}
}
