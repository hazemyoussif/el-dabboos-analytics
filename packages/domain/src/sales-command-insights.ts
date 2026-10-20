import {compareAnalyticsKeys} from './analytics-order.ts';
import type {AnalyticsResult} from './contracts.ts';
export type SalesCommandInsight='top_customer_share'|'leading_state';
/** Reduces published contribution outputs, whose denominator was computed over the full policy-filtered population. */
export function salesCommandContributionInsight(kind:SalesCommandInsight,result:AnalyticsResult):{percentage:number|null;key?:string;label?:string} {
 if(!result.metadata.analysis?.percentageContribution||result.metadata.availability||result.metadata.coverage?.status==='partial'||result.metadata.window?.nextCursor)return {percentage:null};
 const rows=result.rows.filter((row):row is typeof row&{value:number}=>row.value!==null);
 if(kind==='top_customer_share')return {percentage:rows.length?rows.reduce((sum,row)=>sum+row.value,0):null};
 const winner=rows.filter(row=>row.key!==null&&row.key!=='unassigned'&&row.key!=='unknown').sort((left,right)=>right.value-left.value||compareAnalyticsKeys(left.key,right.key))[0];
 if(!winner)return {percentage:null};
 const key=winner.key!,label=result.metadata.dimensionLabels?.[key];
 return {percentage:winner.value,key,...(label?{label}:{})};
}
