import type { AnalyticsPlanningOutcome, AnalyticsIntent } from './analytics-intent.ts';
import type { AnalyticsSeriesIntent } from './analytics-series.ts';
import type { DimensionId } from '@el-dabboos/domain';

export interface AnalyticsEvaluationCase {id:string;category:string;language:'en'|'ar';question:string;expected:AnalyticsPlanningOutcome}
const september = {dateRange:{from:'2026-09-01',to:'2026-09-30'}};
const supported = (series:AnalyticsSeriesIntent[],dimension?:DimensionId,context:AnalyticsIntent['context']={}):AnalyticsPlanningOutcome => ({status:'SUPPORTED',intent:{context,analyses:[{series,...(dimension ? {dimension} : {})}]}});
const cases: {id:string;category:string;en:string;ar:string;expected:AnalyticsPlanningOutcome}[] = [
  {id:'invoice-september',category:'aggregate',en:'What was net invoiced revenue in September?',ar:'كم صافي إيرادات الفواتير في سبتمبر؟',expected:supported([{metric:'net_invoiced_revenue'}],undefined,september)},
  {id:'orders-month',category:'aggregate',en:'What was order revenue last month?',ar:'كم إيرادات الطلبات الشهر الماضي؟',expected:supported([{metric:'order_revenue'}],undefined,{datePreset:'previous_month'})},
  {id:'highest',category:'ranking',en:'Who had the highest order revenue?',ar:'من حقق أعلى إيرادات طلبات؟',expected:supported([{metric:'order_revenue',topNDirection:'top',topNLimit:1}],'salesperson')},
  {id:'top-five',category:'ranking',en:'Top five salespeople by net invoiced revenue.',ar:'أعلى خمسة مندوبين بصافي إيرادات الفواتير.',expected:supported([{metric:'net_invoiced_revenue',topNDirection:'top',topNLimit:5}],'salesperson')},
  {id:'lines',category:'comparison',en:'Compare General and No Sugar net invoiced revenue.',ar:'قارن صافي إيرادات الفواتير بين عام وبدون سكر.',expected:supported([{metric:'net_invoiced_revenue'}],'business_line',{dimensions:[{dimension:'business_line',values:['general','no_sugar']}]})},
  {id:'invoice-refund',category:'comparison',en:'Compare invoice value and refund value by salesperson.',ar:'قارن قيمة الفواتير والمردودات حسب المندوب.',expected:supported([{metric:'invoiced_revenue'},{metric:'refund_value'}],'salesperson')},
  {id:'six-months',category:'trend',en:'Show net invoiced revenue for the last six months.',ar:'اعرض صافي إيرادات الفواتير لآخر ستة أشهر.',expected:supported([{metric:'net_invoiced_revenue'}],'month',{datePreset:'last_6_months'})},
  {id:'august-change',category:'trend',en:'What changed in net invoiced revenue from August to September?',ar:'ما التغير في صافي إيرادات الفواتير من أغسطس إلى سبتمبر؟',expected:supported([{metric:'net_invoiced_revenue',comparison:'previous_period'}],undefined,september)},
  {id:'contribution',category:'derived',en:'Contribution to order revenue by salesperson.',ar:'مساهمة كل مندوب في إيرادات الطلبات.',expected:supported([{metric:'order_revenue',percentageContribution:true}],'salesperson')},
  {id:'moving-average',category:'derived',en:'Six-month moving average of order revenue over the last twelve months.',ar:'متوسط متحرك لإيرادات الطلبات لستة أشهر خلال آخر اثني عشر شهرًا.',expected:supported([{metric:'order_revenue',movingAverageWindow:6}],'month',{datePreset:'last_12_months'})},
  {id:'running-total',category:'derived',en:'Running total of order revenue by month.',ar:'الإجمالي التراكمي لإيرادات الطلبات حسب الشهر.',expected:supported([{metric:'order_revenue',runningTotal:true}],'month')},
  {id:'receivable',category:'finance',en:'What were receivables on Oct 8?',ar:'كم كانت الذمم المدينة في ٨ أكتوبر؟',expected:supported([{metric:'net_aged_receivable'}],undefined,{dateRange:{from:'2026-10-08',to:'2026-10-08'}})},
  {id:'overdue',category:'finance',en:'Which customers have the largest overdue balances on Oct 8?',ar:'من العملاء أصحاب أكبر أرصدة متأخرة في ٨ أكتوبر؟',expected:supported([{metric:'total_overdue_receivable',topNDirection:'top',topNLimit:5}],'customer',{dateRange:{from:'2026-10-08',to:'2026-10-08'}})},
  {id:'ambiguous',category:'ambiguity',en:'Who is the best salesperson?',ar:'من أفضل مندوب؟',expected:{status:'AMBIGUOUS',choices:['net_invoiced_revenue','order_revenue','order_count']}},
  {id:'products',category:'unsupported',en:'What products are trending?',ar:'ما المنتجات الرائجة؟',expected:{status:'UNSUPPORTED_CAPABILITY'}},
  {id:'multi-analysis',category:'multi-analysis',en:'Compare net invoiced revenue by month and refunds by salesperson over six months.',ar:'قارن صافي إيرادات الفواتير حسب الشهر والمردودات حسب المندوب لستة أشهر.',expected:{status:'SUPPORTED',intent:{context:{datePreset:'last_6_months'},analyses:[{dimension:'month',series:[{metric:'net_invoiced_revenue'}]},{dimension:'salesperson',series:[{metric:'refund_value'}]}]}}},
];
/** Ground truth only: never imported by runtime planners or used to match user prompts. */
export const analyticsEvaluationCases:readonly AnalyticsEvaluationCase[]=cases.flatMap(item=>(['en','ar'] as const).map(language=>({id:`${item.id}-${language}`,category:item.category,language,question:item[language],expected:structuredClone(item.expected)})));
