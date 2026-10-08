import type { AnalyticsPlanningRequest, StructuredAnalyticsPlanner } from './analytics-planner.ts';
import { analyticsEvaluationCases } from './analytics-evaluations.ts';
import type { AnalyticsEvaluationCase } from './analytics-evaluations.ts';
function stable(value:unknown):unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([left],[right])=>left.localeCompare(right)).map(([key,item])=>[key,stable(item)]));
  return value;
}
/** Inject any portable provider planner. CI uses fixtures; live conformance is explicitly optional. */
export async function evaluateAnalyticsPlanner(planner:StructuredAnalyticsPlanner, request:Omit<AnalyticsPlanningRequest,'prompt'>, cases:readonly AnalyticsEvaluationCase[]=analyticsEvaluationCases) {
  const evaluations = [];
  for (const item of cases) {
    const output = await planner.plan({...request,prompt:item.question,identity:{...request.identity,locale:item.language}});
    evaluations.push({id:item.id,category:item.category,language:item.language,
      passed:JSON.stringify(stable(output.outcome)) === JSON.stringify(stable(item.expected)),timing:output.timing});
  }
  return {cases:evaluations,passed:evaluations.filter(item=>item.passed).length,total:evaluations.length};
}
