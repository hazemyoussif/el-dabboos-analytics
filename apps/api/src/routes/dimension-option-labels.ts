import {governedDimensionLabel} from '@el-dabboos/domain';
import type {DimensionId,Locale,TenantProfile} from '@el-dabboos/domain';
/** Discovery pages, selected hydration and bounded lists share one presentation contract. */
export function dimensionOptionLabels(options:Array<{id:string;label?:string}>,dimension:DimensionId,locale:Locale,profile:TenantProfile) {
 return options.map(({id,label})=>({id,label:governedDimensionLabel(id,dimension==='branch'?profile.branchLabels[id]?.[locale]??label:label,locale,dimension)}));
}
