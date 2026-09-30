import type { AnalyticsContext, AnalyticsQuery, DashboardSpec, DashboardWidget, DateRange } from './contracts.ts';
import { isDimensionId, isMetricId, semanticCatalog } from './catalog.ts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import dashboardSchema from './dashboard-spec.schema.json' with { type: 'json' };

const ajv = new Ajv2020.default({ allErrors: true });
addFormats.default(ajv);
const checkDashboardSchema = ajv.compile(dashboardSchema);

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[], required: string[] = []): boolean =>
  Object.keys(v).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(v, k));
const text = (v: unknown): boolean => record(v) && keys(v, ['en', 'ar'], ['en', 'ar']) &&
  typeof v.en === 'string' && v.en.length > 0 && typeof v.ar === 'string' && v.ar.length > 0;
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]*$/.test(v) && v.length <= 80;
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
export const validDateRange = (v: unknown): v is DateRange => record(v) && keys(v, ['from', 'to'], ['from', 'to']) && date(v.from) && date(v.to) && v.from <= v.to;
const validFilter = (v: unknown): boolean => record(v) && keys(v, ['dimension', 'values'], ['dimension', 'values']) &&
  typeof v.dimension === 'string' && isDimensionId(v.dimension) && Array.isArray(v.values) && v.values.length > 0 && v.values.every(x => typeof x === 'string' && x.length > 0);
const validFilters = (v: unknown): boolean => record(v) && keys(v, ['dateRange', 'dimensions']) &&
  (v.dateRange === undefined || validDateRange(v.dateRange)) &&
  (v.dimensions === undefined || (Array.isArray(v.dimensions) && v.dimensions.every(validFilter)));
const kinds = ['top_n', 'bottom_n', 'previous_period', 'month_over_month', 'year_over_year', 'absolute_change', 'percentage_change', 'running_total', 'percentage_contribution', 'moving_average', 'ranking'];
export const validOperation = (v: unknown): boolean => record(v) && keys(v, ['kind', 'n', 'window'], ['kind']) &&
  typeof v.kind === 'string' && kinds.includes(v.kind) &&
  (v.n === undefined || (Number.isInteger(v.n) && (v.n as number) >= 1 && (v.n as number) <= 100)) &&
  (v.window === undefined || (Number.isInteger(v.window) && (v.window as number) >= 2 && (v.window as number) <= 24)) &&
  (v.kind !== 'top_n' && v.kind !== 'bottom_n' || v.n !== undefined) &&
  (v.kind !== 'moving_average' || v.window !== undefined);
export const validWidget = (v: unknown): v is DashboardWidget => record(v) &&
  keys(v, ['id', 'type', 'title', 'metric', 'dimension', 'operation'], ['id', 'type', 'metric']) &&
  id(v.id) && ['kpi', 'line', 'bar', 'table'].includes(String(v.type)) &&
  (v.title === undefined || text(v.title)) && typeof v.metric === 'string' && isMetricId(v.metric) &&
  (v.dimension === undefined || (typeof v.dimension === 'string' && isDimensionId(v.dimension) && semanticCatalog[v.metric].dimensions.includes(v.dimension))) &&
  (v.operation === undefined || (validOperation(v.operation) && record(v.operation) && typeof v.operation.kind === "string" && semanticCatalog[v.metric].operations.includes(v.operation.kind as typeof semanticCatalog[typeof v.metric]["operations"][number]))) &&
  (v.type !== 'line' || v.dimension !== undefined);
export function validateDashboardSpec(v: unknown): asserts v is DashboardSpec {
  if (!checkDashboardSchema(v) || !record(v) || !Array.isArray(v.widgets) ||
    !v.widgets.every(validWidget) || new Set(v.widgets.map(w => w.id)).size !== v.widgets.length ||
    !validFilters(v.filters)) throw new Error('Invalid DashboardSpec v1');
}
export function validateQuery(query: AnalyticsQuery, context: AnalyticsContext): void {
  if (!context?.tenantId?.trim() || !['en', 'ar'].includes(context.locale)) throw new Error('Tenant context and locale are required');
  if (!isMetricId(query.metric)) throw new Error('Unknown metric');
  if (query.groupBy && (!isDimensionId(query.groupBy) || !semanticCatalog[query.metric].dimensions.includes(query.groupBy))) throw new Error('Unsupported dimension');
  if (query.dateRange && !validDateRange(query.dateRange)) throw new Error('Invalid date range');
  if (query.filters?.some(f => !validFilter(f) || !semanticCatalog[query.metric].dimensions.includes(f.dimension))) throw new Error('Unsupported filter');
  if (query.operation && (!validOperation(query.operation) || !semanticCatalog[query.metric].operations.includes(query.operation.kind))) throw new Error('Unsupported operation');
  if (query.aggregation && !['sum', 'count', 'average', 'min', 'max'].includes(query.aggregation)) throw new Error('Unsupported aggregation');
}
