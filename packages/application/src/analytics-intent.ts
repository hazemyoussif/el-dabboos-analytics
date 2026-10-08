import Ajv2020 from 'ajv/dist/2020.js';
import { dimensions, relativeDatePresets, validDateRange } from '@el-dabboos/domain';
import type { AnalyticsQuery, DashboardSpec, DateRange, MetricId } from '@el-dabboos/domain';
import { analyticsSeriesSchema, compileAnalyticsSeries } from './analytics-series.ts';
import type { DashboardGenerationPlan } from './generation-plan.ts';
import { resolveDashboardFilters } from './dashboard-filters.ts';

/** Transient semantic intent. Presentation, tenant/policy, SQL and model-owned IDs are excluded. */
export type { AnalyticsIntent, AnalyticsAnalysisIntent } from '@el-dabboos/domain';
import type { AnalyticsIntent } from '@el-dabboos/domain';
export type AnalyticsPlanningOutcome = { status: 'SUPPORTED'; intent: AnalyticsIntent }
  | {status:'FOLLOW_UP';operation:'rank';rank:number}
  | {status:'FOLLOW_UP';operation:'compare_entities';count:number;datePreset:'last_6_months'}
  | { status: 'AMBIGUOUS'; choices: MetricId[] }
  | { status: 'UNSUPPORTED_CAPABILITY' | 'DATA_NOT_READY' };
const object = (properties: object, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required });
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const contextSchema = object({
  datePreset: { enum: relativeDatePresets }, dateRange: object({ from: date, to: date }, ['from','to']),
  dimensions: { type: 'array', maxItems: 14, items: object({ dimension: { enum: dimensions },
    values: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 160 } } }, ['dimension','values']) },
});
export const analyticsIntentSchema = { $defs: { series: analyticsSeriesSchema }, ...object({
  context: contextSchema,
  analyses: { type: 'array', minItems: 1, maxItems: 24, items: object({ dimension: { enum: dimensions },
    series: { type: 'array', minItems: 1, maxItems: 8, items: { $ref: '#/$defs/series' } }, context: contextSchema,
    rank: { type: 'integer', minimum: 1, maximum: 100 } }, ['series']) },
}, ['context','analyses']) };
export const analyticsPlanningSchema = { $defs: analyticsIntentSchema.$defs, oneOf: [
  object({ status: { enum: ['SUPPORTED'] }, intent: analyticsIntentSchema }, ['status','intent']),
  object({status:{enum:['FOLLOW_UP']},operation:{enum:['rank']},rank:{type:'integer',minimum:1,maximum:100}},['status','operation','rank']),
  object({status:{enum:['FOLLOW_UP']},operation:{enum:['compare_entities']},count:{type:'integer',minimum:2,maximum:100},datePreset:{enum:['last_6_months']}},['status','operation','count','datePreset']),
  object({ status: { enum: ['AMBIGUOUS'] }, choices: { type: 'array', minItems: 2, maxItems: 8, uniqueItems: true,
    items: analyticsSeriesSchema.properties.metric } }, ['status','choices']),
  object({ status: { enum: ['UNSUPPORTED_CAPABILITY','DATA_NOT_READY'] } }, ['status']),
] };
type Validator = (value: unknown) => boolean;
type Constructor = new (options: { allErrors: boolean }) => { compile(schema: object): Validator };
const Ajv = ((Ajv2020 as unknown as { default?: Constructor }).default ?? Ajv2020) as Constructor;
const validator = new Ajv({ allErrors: true });
const checkIntent = validator.compile(analyticsIntentSchema);
const checkOutcome = validator.compile(analyticsPlanningSchema);
function validateSelection(selection: DashboardSpec['filters']) {
  if (selection.dateRange && (!validDateRange(selection.dateRange) || selection.datePreset)) throw new Error('Invalid analytics date selection');
  if (new Set(selection.dimensions?.map(filter => filter.dimension)).size !== (selection.dimensions?.length ?? 0)) throw new Error('Duplicate analytics filters');
}
export function validateAnalyticsIntent(value: unknown): asserts value is AnalyticsIntent {
  if (!checkIntent(value)) throw new Error('Invalid AnalyticsIntent schema');
  const intent = value as AnalyticsIntent;
  validateSelection(intent.context);
  for (const analysis of intent.analyses) {
    if (analysis.context) validateSelection(analysis.context);
    analysis.series.forEach((series,index) => {
      if ((series.topNDirection === undefined) !== (series.topNLimit === undefined) || index > 0 && series.topNLimit !== undefined) throw new Error('Invalid analytics Top-N anchor');
    });
    if (analysis.rank && (!analysis.dimension || !analysis.series[0]?.ranking || analysis.series[0]?.topNLimit !== undefined)) throw new Error('Ordinal requires unrestricted ranked grouping');
  }
}
export function validateAnalyticsPlanningOutcome(value: unknown): asserts value is AnalyticsPlanningOutcome {
  if (!checkOutcome(value)) throw new Error('Invalid analytics planning outcome');
  const outcome = value as AnalyticsPlanningOutcome;
  if (outcome.status === 'SUPPORTED') validateAnalyticsIntent(outcome.intent);
}
export function analyticsIntentFromGenerationPlan(plan: DashboardGenerationPlan): AnalyticsIntent {
  return { context: { ...(plan.datePreset ? { datePreset: plan.datePreset } : {}),
    ...(plan.dateFrom && plan.dateTo ? { dateRange: { from: plan.dateFrom, to: plan.dateTo } } : {}),
    ...(plan.filters ? { dimensions: structuredClone(plan.filters) } : {}) },
    analyses: plan.widgets.map(widget => ({ ...(widget.dimension ? { dimension: widget.dimension } : {}), series: structuredClone(widget.series) })) };
}
/** Resolver-owned defaults and symbolic dates are identical for both consumers. */
export function resolveAnalyticsIntent(intent: AnalyticsIntent, scope: { timeZone: string; now: Date; defaultPeriod?: DateRange }): AnalyticsQuery[][] {
  validateAnalyticsIntent(intent);
  return intent.analyses.map(analysis => {
    const selection = analysis.context ?? intent.context;
    const defaults = selection.datePreset || selection.dateRange ? selection : { ...selection,
      ...(scope.defaultPeriod ? { dateRange: scope.defaultPeriod } : { datePreset: 'current_year' as const }) };
    const filters = resolveDashboardFilters(defaults, { timeZone: scope.timeZone }, scope.now);
    return analysis.series.map(series => ({ ...compileAnalyticsSeries(series), ...(analysis.dimension ? { groupBy: analysis.dimension } : {}),
      ...(filters.dateRange ? { dateRange: filters.dateRange } : {}), ...(filters.dimensions ? { filters: filters.dimensions } : {}) }));
  });
}
