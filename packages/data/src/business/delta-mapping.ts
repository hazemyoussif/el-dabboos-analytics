import type {SourceMapping} from '@el-dabboos/domain';
import {stableContent} from '../operational/facts.ts';
import {withSalesCommandMapping,withSalesCommandRecipe} from './sales-command-mapping.ts';

/** Only the registered additive Command extension may change an accepted mapping. */
export function compatibleBusinessDeltaMapping(previous:SourceMapping,next:SourceMapping):boolean {
 if(stableContent(previous)===stableContent(next))return true;
 if(previous.mappingId!=='business-purpose-v1'&&previous.mappingId!=='business-purpose-v1-sales-command')return false;
 const current=next.capabilities.some(capability=>capability.metric==='command_invoice_residual');
 if(previous.mappingId==='business-purpose-v1'&&previous.mappingVersion==='1'&&stableContent(withSalesCommandMapping(previous,current))===stableContent(next))return true;
 for(const object of ['command_invoice','command_receipt','command_order','command_receivable','command_allocation']){
  if(stableContent(withSalesCommandRecipe(previous,object,current))===stableContent(next))return true;
 }
 return false;
}
