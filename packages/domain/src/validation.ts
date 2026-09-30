import type { AnalyticsContext, AnalyticsQuery, DashboardPatch, DashboardSpec, DashboardWidget, DateRange, DimensionId, MetricId } from './contracts.ts';
import { isDimensionId, isMetricId, semanticCatalog, timeDimensions } from './catalog.ts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import dashboardSchema from './dashboard-spec.schema.json' with { type: 'json' };
import patchSchema from './dashboard-patch.schema.json' with { type: 'json' };

const ajv = new Ajv2020.default({ allErrors: true });
addFormats.default(ajv);
const checkDashboardSchema = ajv.compile(dashboardSchema);
const checkPatchSchema = ajv.compile(patchSchema);
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = []): boolean =>
  Object.keys(v).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(v, k));
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
export const validDateRange = (v: unknown): v is DateRange => record(v) && exactKeys(v, ['from', 'to'], ['from', 'to']) &&
  validDate(v.from) && validDate(v.to) && v.from <= v.to;
const validFilter = (v: unknown): boolean => record(v) && exactKeys(v, ['dimension', 'values'], ['dimension', 'values']) &&
  typeof v.dimension === 'string' && isDimensionId(v.dimension) && Array.isArray(v.values) && v.values.length > 0 &&
  v.values.every(x => typeof x === 'string' && x.length > 0);
const comparisons = ['previous_period', 'month_over_month', 'year_over_year'];
export function validateAnalysis(analysis: unknown, metricId: MetricId, groupBy?: DimensionId, dateRange?: DateRange): void {
  const semantics = semanticCatalog[metricId].semantics;
  if (analysis === undefined) {
    if (semantics.kind === 'comparison_derived' && !dateRange) throw new Error('Comparison-derived metric requires a date range');
    return;
  }
  if (!record(analysis) || !exactKeys(analysis, ['comparison', 'movingAverage', 'runningTotal', 'percentageContribution', 'ranking', 'topN'])) throw new Error('Invalid analysis');
  if (analysis.comparison !== undefined && (!comparisons.includes(String(analysis.comparison)) || !dateRange)) throw new Error('Comparison requires a date range');
  if (semantics.kind === 'comparison_derived' && !dateRange) throw new Error('Comparison-derived metric requires a date range');
  if (analysis.comparison === 'month_over_month' && (groupBy === 'quarter' || groupBy === 'year')) throw new Error('Month-over-month requires date or month grouping');
  if (analysis.movingAverage !== undefined) {
    if (!record(analysis.movingAverage) || !exactKeys(analysis.movingAverage, ['window'], ['window']) ||
      !Number.isInteger(analysis.movingAverage.window) || Number(analysis.movingAverage.window) < 2 || Number(analysis.movingAverage.window) > 24 ||
      !groupBy || !timeDimensions.includes(groupBy) || semantics.kind === 'comparison_derived') throw new Error('Moving average requires an ordered time dimension and window 2–24');
  }
  if (analysis.runningTotal !== undefined && (analysis.runningTotal !== true || !groupBy || !timeDimensions.includes(groupBy) || semantics.kind !== 'additive')) throw new Error('Running total requires an additive metric and ordered time dimension');
  if (analysis.percentageContribution !== undefined && (analysis.percentageContribution !== true || !groupBy || semantics.kind !== 'additive')) throw new Error('Percentage contribution requires grouped additive metric');
  if (analysis.ranking !== undefined && (analysis.ranking !== true || !groupBy)) throw new Error('Ranking requires grouping');
  if (analysis.topN !== undefined && (!record(analysis.topN) || !exactKeys(analysis.topN, ['direction', 'limit'], ['direction', 'limit']) ||
    !['top', 'bottom'].includes(String(analysis.topN.direction)) || !Number.isInteger(analysis.topN.limit) ||
    Number(analysis.topN.limit) < 1 || Number(analysis.topN.limit) > 100 || !groupBy)) throw new Error('Top/bottom N requires grouping and limit 1–100');
  if (analysis.movingAverage && (analysis.runningTotal || analysis.topN || analysis.percentageContribution)) throw new Error('Incompatible analysis combination');
  if (analysis.runningTotal && (analysis.topN || analysis.percentageContribution)) throw new Error('Incompatible analysis combination');
  if (analysis.percentageContribution && analysis.comparison) throw new Error('Incompatible analysis combination');
}
function validateMetricUse(metric: unknown, groupBy: unknown, analysis: unknown, dateRange: DateRange | undefined, filters: unknown): asserts metric is MetricId {
  if (typeof metric !== 'string' || !isMetricId(metric)) throw new Error('Unknown metric');
  if (groupBy !== undefined && (typeof groupBy !== 'string' || !isDimensionId(groupBy) || !semanticCatalog[metric].dimensions.includes(groupBy))) throw new Error('Unsupported dimension');
  if (filters !== undefined && (!Array.isArray(filters) || filters.some(f => !validFilter(f) || !semanticCatalog[metric].dimensions.includes(f.dimension)))) throw new Error('Unsupported filter');
  if (semanticCatalog[metric].semantics.kind === 'snapshot' && Array.isArray(filters) && filters.some(f => timeDimensions.includes(f.dimension))) throw new Error('Snapshot time scope must use dateRange');
  validateAnalysis(analysis, metric, groupBy as DimensionId | undefined, dateRange);
}
export function validWidget(v: unknown, dateRange?: DateRange): v is DashboardWidget {
  if (!record(v) || !['kpi', 'line', 'bar', 'table'].includes(String(v.type)) || typeof v.id !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]*$/.test(v.id) || v.id.length > 80 || (v.type === 'line' && v.dimension === undefined)) return false;
  try { validateMetricUse(v.metric, v.dimension, v.analysis, dateRange, undefined); return true; } catch { return false; }
}
export function validateDashboardSpec(v: unknown): asserts v is DashboardSpec {
  if (!checkDashboardSchema(v) || !record(v) || !record(v.filters) || !Array.isArray(v.widgets)) throw new Error('Invalid DashboardSpec v1');
  const range = v.filters.dateRange;
  if (range !== undefined && !validDateRange(range)) throw new Error('Invalid dashboard date range');
  if (new Set(v.widgets.map(w => record(w) ? w.id : undefined)).size !== v.widgets.length) throw new Error('Duplicate widget ID');
  for (const widget of v.widgets) {
    if (!validWidget(widget, range as DateRange | undefined)) throw new Error('Invalid dashboard widget');
    validateMetricUse(widget.metric, widget.dimension, widget.analysis, range as DateRange | undefined, v.filters.dimensions);
  }
}
export function validateQuery(query: AnalyticsQuery, context: AnalyticsContext): void {
  if (!context?.tenantId?.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Tenant context and locale are required');
  if (!record(query) || !exactKeys(query, ['metric', 'aggregation', 'groupBy', 'dateRange', 'filters', 'analysis'], ['metric'])) throw new Error('Invalid analytics query');
  if (query.dateRange !== undefined && !validDateRange(query.dateRange)) throw new Error('Invalid date range');
  validateMetricUse(query.metric, query.groupBy, query.analysis, query.dateRange, query.filters);
  if (query.aggregation !== undefined && (!['sum', 'count', 'average', 'min', 'max'].includes(query.aggregation) || semanticCatalog[query.metric].semantics.kind !== 'additive')) throw new Error('Aggregation override requires an additive metric');
}

export function validateDashboardPatch(v: unknown): asserts v is DashboardPatch {
  if (!checkPatchSchema(v)) throw new Error('Invalid DashboardPatch v1');
}
