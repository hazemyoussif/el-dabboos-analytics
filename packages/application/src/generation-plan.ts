import Ajv2020 from 'ajv/dist/2020.js';
import { defaultDashboardLayout, dimensions, semanticCatalog, validateDashboardSpec, validDateRange, widgetTypes, governedPalettes, visualizationIssues } from '@el-dabboos/domain';
import type { AnalysisSpec, DashboardSchemaIssue, DashboardSpec, DashboardWidget, DimensionId, Locale, MetricId, TenantProfile, WidgetPresentation, WidgetType } from '@el-dabboos/domain';
import { resolveGenerationWidget } from './visualization-intent.ts';
import { resolveDatePreset } from './templates.ts';
import type { DatePreset } from './templates.ts';

/** Transient business intent only. Never persisted or used as an execution contract. */
export interface DashboardGenerationPlan {
  titleEn: string; titleAr: string;
  datePreset?: DatePreset; dateFrom?: string; dateTo?: string;
  filters?: { dimension: DimensionId; values: string[] }[];
  widgets: GenerationWidget[];
}
export interface RequestedPresentation {
  type?: WidgetType; palette?: NonNullable<WidgetPresentation['palette']>;
  orientation?: NonNullable<WidgetPresentation['orientation']>; pieVariant?: NonNullable<WidgetPresentation['pieVariant']>;
  legend?: 'show' | 'hide'; dataLabels?: 'show' | 'hide'; curve?: NonNullable<WidgetPresentation['curve']>;
}
export interface GenerationWidget {
  titleEn?: string; titleAr?: string; dimension?: DimensionId;
  series: GenerationSeries[]; requestedPresentation?: RequestedPresentation;
}
export interface GenerationSeries {
  metric: MetricId; comparison?: AnalysisSpec['comparison']; movingAverageWindow?: number;
  runningTotal?: boolean; percentageContribution?: boolean; ranking?: boolean;
  topNDirection?: 'top' | 'bottom'; topNLimit?: number;
}
const text = { type: 'string', minLength: 1, maxLength: 160 };
const choice = (values: readonly string[]) => ({ type: 'string', enum: values });
const object = <T extends object>(properties: T, required: string[]) => ({ type: 'object', additionalProperties: false, properties, required });
const seriesSchema = object({
  metric: choice(Object.keys(semanticCatalog)), comparison: choice(['previous_period', 'month_over_month', 'year_over_year']),
  movingAverageWindow: { type: 'integer', minimum: 2, maximum: 24 },
  runningTotal: { type: 'boolean' }, percentageContribution: { type: 'boolean' }, ranking: { type: 'boolean' },
  topNDirection: choice(['top', 'bottom']), topNLimit: { type: 'integer', minimum: 1, maximum: 100 },
}, ['metric']);
const widgetSchema = object({ titleEn: text, titleAr: text, dimension: choice(dimensions),
  series: { type: 'array', minItems: 1, maxItems: 8, items: seriesSchema },
  requestedPresentation: object({ type: choice(widgetTypes), palette: choice(governedPalettes),
    orientation: choice(['vertical', 'horizontal']), pieVariant: choice(['pie', 'donut']),
    legend: choice(['show', 'hide']), dataLabels: choice(['show', 'hide']), curve: choice(['straight', 'smooth']),
  }, []),
}, ['series']);
export const dashboardGenerationPlanSchema = object({ titleEn: text, titleAr: text,
  datePreset: choice(['current_year', 'last_12_months', 'last_6_months']),
  dateFrom: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, dateTo: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  filters: { type: 'array', maxItems: 14, items: object({ dimension: choice(dimensions),
    values: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 160 } },
  }, ['dimension', 'values']) },
  widgets: { type: 'array', minItems: 1, maxItems: 24, items: widgetSchema },
}, ['titleEn', 'titleAr', 'widgets']);
type Validator = ((value: unknown) => boolean) & { errors?: readonly DashboardSchemaIssue[] | null };
type Constructor = new (options: { allErrors: boolean }) => { compile(schema: object): Validator };
const Ajv = ((Ajv2020 as unknown as { default?: Constructor }).default ?? Ajv2020) as Constructor;
const check = new Ajv({ allErrors: true }).compile(dashboardGenerationPlanSchema);
export function generationPlanSchemaIssues(value: unknown): DashboardSchemaIssue[] {
  if (check(value)) return [];
  return (check.errors ?? []).slice(0, 8).map(({ instancePath, keyword, message }) => ({ instancePath, keyword, message }));
}
export function validateDashboardGenerationPlan(value: unknown): asserts value is DashboardGenerationPlan {
  if (!check(value)) throw new Error('Invalid DashboardGenerationPlan schema.');
  const plan = value as DashboardGenerationPlan;
  const explicit = plan.dateFrom !== undefined || plan.dateTo !== undefined;
  if (explicit && (plan.datePreset !== undefined || !validDateRange({ from: plan.dateFrom, to: plan.dateTo })))
    throw new Error('Invalid DashboardGenerationPlan date selection.');
  if (plan.filters && new Set(plan.filters.map(filter => filter.dimension)).size !== plan.filters.length)
    throw new Error('Invalid DashboardGenerationPlan duplicate filters.');
  for (const widget of plan.widgets) {
    if ((widget.titleEn === undefined) !== (widget.titleAr === undefined)) throw new Error('Invalid DashboardGenerationPlan bilingual widget title.');
    for (const series of widget.series) if ((series.topNDirection === undefined) !== (series.topNLimit === undefined))
      throw new Error('Invalid DashboardGenerationPlan topN pair.');
  }
}
/** Safe fixed vocabulary from the existing domain rules; never model/customer text. */
export class GenerationVisualizationError extends Error {
  constructor(readonly issues: readonly string[]) { super('Invalid dashboard widget or incompatible series'); }
}
/** Pure compilation; caller supplies the clock value. Canonical validation remains authoritative. */
export function compileDashboardGenerationPlan(plan: DashboardGenerationPlan, profile: TenantProfile, locale: Locale, now: Date): DashboardSpec {
  validateDashboardGenerationPlan(plan);
  const widgets: DashboardWidget[] = plan.widgets.map((widget, index) => {
    const id = `widget-${index + 1}`;
    return { id, ...resolveGenerationWidget({ ...(widget.dimension ? { dimension: widget.dimension } : {}),
      ...(widget.requestedPresentation ? { requestedPresentation: widget.requestedPresentation } : {}),
      series: widget.series.map((series, seriesIndex) => {
        const analysis: AnalysisSpec = {};
        if (series.comparison) analysis.comparison = series.comparison;
        if (series.movingAverageWindow !== undefined) analysis.movingAverage = { window: series.movingAverageWindow };
        for (const key of ['runningTotal', 'percentageContribution', 'ranking'] as const) if (series[key]) analysis[key] = true;
        if (series.topNDirection && series.topNLimit !== undefined) analysis.topN = { direction: series.topNDirection, limit: series.topNLimit };
        return { id: `${id}-series-${seriesIndex + 1}`, metric: series.metric,
          ...(Object.keys(analysis).length ? { analysis } : {}) };
      }) }),
      ...(widget.titleEn !== undefined && widget.titleAr !== undefined ? { title: { en: widget.titleEn, ar: widget.titleAr } } : {}) };
  });
  const spec: DashboardSpec = { schemaVersion: 2, id: 'generated-dashboard', title: { en: plan.titleEn, ar: plan.titleAr }, locale,
    filters: { dateRange: plan.dateFrom !== undefined && plan.dateTo !== undefined ? { from: plan.dateFrom, to: plan.dateTo }
      : resolveDatePreset(plan.datePreset ?? 'current_year', profile, now),
    ...(plan.filters?.length ? { dimensions: structuredClone(plan.filters) } : {}) }, widgets, layout: defaultDashboardLayout(widgets) };
  try { validateDashboardSpec(spec); }
  catch (error) {
    // Canonical validation runs first and remains authoritative. Only enrich this
    // existing generic semantic failure for terminal diagnostics and bounded repair.
    if (error instanceof Error && error.message === 'Invalid dashboard widget or incompatible series') {
      const issues = [...new Set(widgets.flatMap(widget => visualizationIssues(widget)))].slice(0, 4);
      if (issues.length) throw new GenerationVisualizationError(issues);
    }
    throw error;
  }
  return spec;
}
