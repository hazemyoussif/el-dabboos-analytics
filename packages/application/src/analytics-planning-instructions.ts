import type { PlannerCapabilities } from '@el-dabboos/domain';
import type { AnalyticsPlanningOutcome } from './analytics-intent.ts';
import { analyticsSemanticInstructions } from './analytics-semantic-context.ts';

interface PlanningExample { question: string; outcome: Extract<AnalyticsPlanningOutcome, { status: 'SUPPORTED' }> }
const examples: PlanningExample[] = [
  { question: 'Show me the salesperson with the highest order revenue last month.', outcome: { status: 'SUPPORTED', intent: {
    context: { datePreset: 'previous_month' }, analyses: [{ dimension: 'salesperson', series: [{ metric: 'order_revenue', topNDirection: 'top', topNLimit: 1 }] }],
  } } },
  { question: 'September 2026 net invoiced revenue', outcome: { status: 'SUPPORTED', intent: {
    context: { dateRange: { from: '2026-09-01', to: '2026-09-30' } }, analyses: [{ series: [{ metric: 'net_invoiced_revenue' }] }],
  } } },
  { question: 'Receivables balance as of October 8, 2026', outcome: { status: 'SUPPORTED', intent: {
    context: { dateRange: { from: '2026-10-08', to: '2026-10-08' } }, analyses: [{ series: [{ metric: 'net_aged_receivable' }] }],
  } } },
  { question: 'Order revenue across business lines last month', outcome: { status: 'SUPPORTED', intent: {
    context: { datePreset: 'previous_month' }, analyses: [{ dimension: 'business_line', series: [{ metric: 'order_revenue' }] }],
  } } },
];

/** Small contract examples, filtered by authorization and published selection capabilities. */
export function analyticsPlanningExamples(capabilities: PlannerCapabilities): PlanningExample[] {
  return examples.filter(example => example.outcome.intent.analyses.every(analysis => analysis.series.every(series =>
    capabilities.metricIds.includes(series.metric) && (!capabilities.published || capabilities.published.releases.some(release =>
      release.capabilities.some(capability => capability.metric === series.metric &&
        (!analysis.dimension || capability.dimensions.includes(analysis.dimension)) &&
        (series.topNLimit === undefined || capability.analyses.includes('topN')))))))).map(example => structuredClone(example));
}

export function analyticsPlanningInstructions(capabilities: PlannerCapabilities, hasState: boolean): string {
  const references = hasState
    ? 'For references to prior entities return FOLLOW_UP: operation rank with rank for an ordinal, or operation compare_entities with count and datePreset last_6_months. The application resolves supplied stable references; never invent names or IDs.'
    : 'No prior semantic state is supplied. Never invent prior entities or references.';
  return `Return only a bounded analytics planning outcome JSON. SUPPORTED is {"status":"SUPPORTED","intent":{"context":{},"analyses":[]}} with nonempty analyses. Each analysis has series and an optional dimension. Highest or lowest means categorical grouping and both topNDirection (top/bottom) and topNLimit=1 on the first series. Do not use rank for highest/lowest. rank is only an explicitly numbered ordinal and requires dimension plus ranking=true and no Top-N. Default salesperson for sales performance when no other entity is named. Comparing named groups means a grouped analysis, never top/bottom selection or ordinal rank. clarification is the already selected canonical metric and resolves measure ambiguity; never re-clarify it. Best salesperson with clarification=order_revenue uses the same salesperson/Top-N structure as the highest-order-revenue example. AMBIGUOUS contains at least two authorized published metric choices only if the measure remains unspecified. Bare revenue with distinct published order/invoice measures needs canonical clarification unless trusted preferences resolve it; a grouped comparison does not resolve the measure. Unsupported analytics return UNSUPPORTED_CAPABILITY; known unpublished analytics return DATA_NOT_READY. Root context owns the effective period and business filters. Dimension names, labels and synonyms are vocabulary, never entity IDs or filter values. For a fresh highest/lowest question, context contains dates only; the entity dimension belongs on the analysis. Generic entity nouns identify the dimension when grouping or selection is requested; they never supply a filter value. Do not add entity filters unless grounded stable values are supplied in pageContext or semantic state; never copy dimension vocabulary into filter values. Inherit pageContext by leaving context empty unless the question supplies dates or filters. Named historical periods always use root dateRange against tenant-local today, even when equal to the page period. Use per-analysis context only for explicitly different periods or filters. ${references} ${analyticsSemanticInstructions} Compact verified examples: ${JSON.stringify(analyticsPlanningExamples(capabilities))}`;
}
