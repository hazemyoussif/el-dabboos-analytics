import type {DateRange} from './contracts.ts';

export type SalesCommandComparison='four_weekdays'|'previous_month_elapsed';
const iso=(value:Date)=>value.toISOString().slice(0,10);
function day(value:string,offset:number):string{return iso(new Date(Date.parse(value+'T00:00:00Z')+offset*86400000));}
/** Six consecutive Saturday-start weeks, ending today; current week is explicitly partial. */
export function salesCommandSixWeeks(today:string):DateRange {
 const weekday=new Date(today+'T00:00:00Z').getUTCDay();
 return {from:day(today,-((weekday+1)%7)-35),to:today};
}
export function salesCommandComparisonPeriods(comparison:SalesCommandComparison,today:string):DateRange[] {
 if(comparison==='four_weekdays')return [7,14,21,28].map(offset=>({from:day(today,-offset),to:day(today,-offset)}));
 const current=new Date(today+'T00:00:00Z'),previousEnd=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),0));
 return [{from:iso(new Date(Date.UTC(previousEnd.getUTCFullYear(),previousEnd.getUTCMonth(),1))),to:iso(new Date(Date.UTC(previousEnd.getUTCFullYear(),previousEnd.getUTCMonth(),Math.min(current.getUTCDate(),previousEnd.getUTCDate()))))}];
}
/** No partial baseline, zero-denominator substitution or averaging of percentages. */
export function salesCommandComparisonValue(current:number|null,operands:readonly (number|null)[],comparison:SalesCommandComparison){
 const expected=comparison==='four_weekdays'?4:1;
 const baseline=operands.length===expected&&operands.every((value):value is number=>value!==null&&Number.isFinite(value))?operands.reduce((sum,value)=>sum+value,0)/expected:null;
 return {baseline,absoluteChange:current!==null&&baseline!==null?current-baseline:null,percentageChange:current!==null&&baseline!==null&&baseline!==0?(current-baseline)/Math.abs(baseline)*100:null};
}
