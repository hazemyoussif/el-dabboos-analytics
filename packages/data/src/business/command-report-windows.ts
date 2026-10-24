import {salesCommandComparisonPeriods,salesCommandSixWeeks} from '@el-dabboos/domain';
import type {DateRange} from '@el-dabboos/domain';
import {commandObjects} from './command-changes.ts';

type CommandObject=typeof commandObjects[number];
/** Use the report's domain-owned calendar rules, never a fixed lookback month.
 * Complete recipe months remain the accepted source/preparation boundary.
 */
export function commandReportObjects(today:string,month:string):CommandObject[]{
 if(month===today.slice(0,7))return [...commandObjects];
 const windows:Array<{object:CommandObject;ranges:DateRange[]}>=[
  {object:'command_invoice',ranges:salesCommandComparisonPeriods('previous_month_elapsed',today)},
  {object:'command_receipt',ranges:salesCommandComparisonPeriods('four_weekdays',today)},
  {object:'command_order',ranges:[salesCommandSixWeeks(today)]},
 ];
 return windows.filter(window=>window.ranges.some(range=>range.from.slice(0,7)<=month&&range.to.slice(0,7)>=month))
  .map(window=>window.object);
}
