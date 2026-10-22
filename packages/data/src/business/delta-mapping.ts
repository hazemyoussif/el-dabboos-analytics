import type {SourceMapping} from '@el-dabboos/domain';
import {stableContent} from '../operational/facts.ts';
import {withSalesCommandMapping} from './sales-command-mapping.ts';

/** Only the registered additive Command extension may change an accepted mapping. */
export function compatibleBusinessDeltaMapping(previous:SourceMapping,next:SourceMapping):boolean {
 if(stableContent(previous)===stableContent(next))return true;
 if(previous.mappingId!=='business-purpose-v1'||previous.mappingVersion!=='1')return false;
 const current=next.capabilities.some(capability=>capability.metric==='command_invoice_residual');
 return stableContent(withSalesCommandMapping(previous,current))===stableContent(next);
}
