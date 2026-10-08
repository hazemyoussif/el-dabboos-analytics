import type { AnalyticsPlanningOutcome } from './analytics-intent.ts';
import type { AnalyticsIntent, MetricId } from '@el-dabboos/domain';
interface EvaluationStep {question:{en:string;ar:string};output:AnalyticsPlanningOutcome;pageContext?:AnalyticsIntent['context'];choice?:MetricId}
interface ConversationEvaluation {
 id:string;category:string;language:'en'|'ar';steps:Array<Omit<EvaluationStep,'question'>&{question:string}>;
 expected:{status:string;metric?:MetricId;rank?:number;entities?:string[];period?:{from:string;to:string};conversion?:string;drill?:boolean};
}
const september={dateRange:{from:'2026-09-01',to:'2026-09-30'}},august={dateRange:{from:'2026-08-01',to:'2026-08-31'}};
const highest:AnalyticsPlanningOutcome={status:'SUPPORTED',intent:{context:{},analyses:[{dimension:'salesperson',series:[{metric:'order_revenue',topNDirection:'top',topNLimit:1}]}]}};
const first:EvaluationStep={question:{en:'Who had the highest order revenue?',ar:'من حقق أعلى إيرادات طلبات؟'},output:highest,pageContext:september};
const second:EvaluationStep={question:{en:'What about second place?',ar:'وماذا عن المركز الثاني؟'},output:{status:'FOLLOW_UP',operation:'rank',rank:2}};
const clarification:EvaluationStep={question:{en:'Who is the best salesperson?',ar:'من أفضل مندوب؟'},output:{status:'AMBIGUOUS',choices:['net_invoiced_revenue','order_revenue','order_count']},pageContext:september};
const cases:Array<{id:string;steps:EvaluationStep[];expected:ConversationEvaluation['expected']}>= [
 {id:'clarification',steps:[clarification],expected:{status:'AMBIGUOUS'}},
 {id:'clarification-resolution',steps:[clarification,{...first,choice:'order_revenue'}],expected:{status:'SUPPORTED',metric:'order_revenue'}},
 {id:'ordinal-reference',steps:[first,second],expected:{status:'SUPPORTED',rank:2,conversion:'semantic_limit'}},
 {id:'entity-reference',steps:[first,second,{question:{en:'Compare those two over the last six months.',ar:'قارن هذين المندوبين لآخر ستة أشهر.'},output:{status:'FOLLOW_UP',operation:'compare_entities',count:2,datePreset:'last_6_months'}}],expected:{status:'SUPPORTED',entities:['rep:b','rep:a'],period:{from:'2026-05-01',to:'2026-10-08'}}},
 {id:'period-override',steps:[{question:{en:'What was order revenue in August?',ar:'كم إيرادات الطلبات في أغسطس؟'},pageContext:september,output:{status:'SUPPORTED',intent:{context:august,analyses:[{series:[{metric:'order_revenue'}]}]}}}],expected:{status:'SUPPORTED',period:august.dateRange}},
 {id:'page-inheritance',steps:[{question:{en:'What was order revenue?',ar:'كم إيرادات الطلبات؟'},pageContext:september,output:{status:'SUPPORTED',intent:{context:{},analyses:[{series:[{metric:'order_revenue'}]}]}}}],expected:{status:'SUPPORTED',period:september.dateRange}},
 {id:'dashboard-action',steps:[first],expected:{status:'SUPPORTED',conversion:'available'}},
 {id:'drill-action',steps:[first],expected:{status:'SUPPORTED',drill:true}},
];
/** Ground truth for deterministic conversational integration; never a runtime prompt matcher. */
export const analystConversationEvaluationCases:readonly ConversationEvaluation[]=cases.flatMap(item=>(['en','ar'] as const).map(language=>({id:`${item.id}-${language}`,category:item.id,language,steps:item.steps.map(step=>({...structuredClone(step),question:step.question[language]})),expected:structuredClone(item.expected)})));
