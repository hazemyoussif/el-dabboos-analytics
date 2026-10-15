import { categoricalDimensions, dimensions, relativeDatePresets, semanticCatalog, timeDimensions, validDateRange } from '@el-dabboos/domain';
import type { AnalyticsFilter, DashboardSpec, DateRange, DimensionId, RelativeDatePreset, SemanticMetric } from '@el-dabboos/domain';
import { resolveRelativeDatePreset } from './relative-date.ts';

export type DashboardDateSelection = { mode: 'relative'; preset: RelativeDatePreset } | { mode: 'absolute'; range: DateRange };
/** Execution-only. Undefined inherits; null date / empty dimensions explicitly remove business defaults. */
export interface DashboardFilterOverrides { date?: DashboardDateSelection | null; dimensions?: AnalyticsFilter[] }
export interface EffectiveDashboardFilters { dateRange?: DateRange; dimensions?: AnalyticsFilter[] }
export interface DashboardExecutionScope { timeZone: string; overrides?: DashboardFilterOverrides; windows?: Record<string,import('./grouped-widget-execution.ts').WidgetWindowRequest> }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(key => keys.includes(key));
export function validateDashboardFilterOverrides(value: unknown): asserts value is DashboardFilterOverrides {
  if (!object(value) || !exact(value, ['date','dimensions'])) throw new Error('Invalid dashboard filter overrides');
  const date = value.date;
  if (date !== undefined && date !== null && (!object(date) || !(date.mode === 'relative' && exact(date, ['mode','preset']) && relativeDatePresets.includes(date.preset as RelativeDatePreset)
    || date.mode === 'absolute' && exact(date, ['mode','range']) && validDateRange(date.range)))) throw new Error('Invalid override date');
  if (value.dimensions !== undefined && (!Array.isArray(value.dimensions) || value.dimensions.length > dimensions.length || value.dimensions.some(filter => !object(filter) || !exact(filter, ['dimension','values']) || !dimensions.includes(filter.dimension as DimensionId) || timeDimensions.includes(filter.dimension as DimensionId) || !Array.isArray(filter.values) || filter.values.length < 1 || filter.values.length > 100 || filter.values.some(v => typeof v !== 'string' || !v.length || v.length > 160)) || new Set(value.dimensions.map(filter => filter.dimension)).size !== value.dimensions.length)) throw new Error('Invalid override dimensions');
}
export function dashboardFilterDimensions(spec: Pick<DashboardSpec, 'widgets'>, catalog: Record<string, SemanticMetric> = semanticCatalog): DimensionId[] {
  const metrics = spec.widgets.flatMap(widget => widget.series.map(series => series.metric));
  return metrics.length ? categoricalDimensions.filter(dimension => metrics.every(metric => catalog[metric]?.dimensions.includes(dimension))) : [];
}
/** Shared symbolic precedence for controls and execution; never includes policy filters. */
export function dashboardFilterSelection(defaults: DashboardSpec['filters'], overrides: DashboardFilterOverrides = {}): DashboardSpec['filters'] {
  validateDashboardFilterOverrides(overrides);
  const selection = structuredClone(defaults);
  if (overrides.date !== undefined) {
    delete selection.dateRange; delete selection.datePreset;
    if (overrides.date?.mode === 'relative') selection.datePreset = overrides.date.preset;
    if (overrides.date?.mode === 'absolute') selection.dateRange = { ...overrides.date.range };
  }
  if (overrides.dimensions !== undefined) selection.dimensions = structuredClone(overrides.dimensions);
  return selection;
}
export function resolveDashboardFilters(defaults: DashboardSpec['filters'], scope: DashboardExecutionScope | undefined, now: Date): EffectiveDashboardFilters {
  const selection = dashboardFilterSelection(defaults, scope?.overrides);
  if (selection.datePreset && !scope?.timeZone) throw new Error('Relative dashboard date requires tenant timezone');
  const dateRange = selection.datePreset ? resolveRelativeDatePreset(selection.datePreset, scope!.timeZone, now) : selection.dateRange;
  return { ...(dateRange ? { dateRange: { ...dateRange } } : {}), ...(selection.dimensions ? { dimensions: structuredClone(selection.dimensions) } : {}) };
}

export function validateDashboardOverrideDimensions(spec: Pick<DashboardSpec,'widgets'>,overrides?: DashboardFilterOverrides): void {
  if (overrides?.dimensions?.some(filter => !dashboardFilterDimensions(spec).includes(filter.dimension))) throw new Error('Unsupported dashboard filter dimension');
}
