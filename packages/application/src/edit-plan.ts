import { Ajv2020 } from 'ajv/dist/2020.js';
import { applyDashboardPatch, governedPalettes, relativeDatePresets, placeDashboardWidget, resolveDashboardLayout, validateDashboardPatch, validateDashboardSpec, widgetTypes } from '@el-dabboos/domain';
import type { AnalysisSpec, DashboardPatch, DashboardSchemaIssue, DashboardSpec, DashboardWidget, DimensionId, LocalizedText, MetricId, WidgetPresentation, WidgetType } from '@el-dabboos/domain';
import { validateDashboardGenerationPlan } from './generation-plan.ts';
import type { GenerationWidget } from './generation-plan.ts';
import { resolveGenerationWidget } from './visualization-intent.ts';

/** Transient sparse intent. Omission preserves; null clears an optional value. */
export type PresentationChanges = { [K in keyof WidgetPresentation]?: WidgetPresentation[K] | null };
export interface WidgetIntentChanges {
  type?: WidgetType; dimension?: DimensionId | null; title?: LocalizedText | null; presentation?: PresentationChanges | null;
}
export interface AnalysisChanges {
  comparison?: AnalysisSpec['comparison'] | null; movingAverageWindow?: number | null;
  runningTotal?: boolean; percentageContribution?: boolean; ranking?: boolean;
  topNDirection?: 'top' | 'bottom' | null; topNLimit?: number | null;
}
export interface SeriesIntentChanges { metric?: MetricId; analysis?: AnalysisChanges | null; presentation?: null }
export interface FilterIntentChanges { datePreset?: DashboardSpec['filters']['datePreset'] | null; dateRange?: DashboardSpec['filters']['dateRange'] | null; dimensions?: NonNullable<DashboardSpec['filters']['dimensions']> }
// Additions share generation business intent and resolver defaults, with sparse
// edit options rather than a second copy of the generation presentation union.
export type AddedWidgetIntent = Pick<GenerationWidget, 'dimension' | 'titleEn' | 'titleAr'> & Pick<WidgetIntentChanges, 'type' | 'presentation'> & {
  series: { metric: MetricId; analysis?: AnalysisChanges | null }[];
};
export type DashboardEditOperation =
  | { op: 'update_widget'; widgetId: string; changes: WidgetIntentChanges }
  | { op: 'update_series'; widgetId: string; seriesId: string; changes: SeriesIntentChanges }
  | { op: 'add_widget'; widget: AddedWidgetIntent }
  | { op: 'remove_widget'; widgetId: string }
  | { op: 'set_title'; titleEn: string; titleAr: string }
  | { op: 'set_filters'; changes: FilterIntentChanges }
  | { op: 'update_layout'; widgetId: string; changes: { x?: number; y?: number; w?: number; h?: number } };
export interface DashboardEditPlan { operations: DashboardEditOperation[] }
const text = { type: 'string', minLength: 1, maxLength: 160 };
const ref = (name: string) => ({ $ref: `#/$defs/${name}` });
const choice = (values: readonly (string | null)[]) => ({ enum: values });
const object = <T extends object>(properties: T, required: string[] = []) => ({ type: 'object', additionalProperties: false, properties, required });
const nullableObject = <T extends object>(properties: T, required: string[] = []) => ({ ...object(properties, required), type: ['object', 'null'] });
const addWidget = object({ titleEn: text, titleAr: text, dimension: { type: 'string' }, type: choice(widgetTypes), presentation: ref('presentation'),
  series: { type: 'array', minItems: 1, maxItems: 8, items: object({ metric: { type: 'string' }, analysis: ref('analysis') }, ['metric']) },
}, ['series']);
export const dashboardEditPlanSchema = { ...object({ operations: { type: 'array', minItems: 1, maxItems: 30, items: { oneOf: [
  object({ op: choice(['update_widget']), widgetId: { type: 'string', minLength: 1, maxLength: 80 }, changes: ref('widgetChanges') }, ['op', 'widgetId', 'changes']),
  object({ op: choice(['update_series']), widgetId: { type: 'string', minLength: 1, maxLength: 80 }, seriesId: { type: 'string', minLength: 1, maxLength: 80 }, changes: object({ metric: { type: 'string' }, analysis: ref('analysis'), presentation: { type: 'null' } }) }, ['op', 'widgetId', 'seriesId', 'changes']),
  object({ op: choice(['add_widget']), widget: addWidget }, ['op', 'widget']),
  object({ op: choice(['remove_widget']), widgetId: { type: 'string', minLength: 1, maxLength: 80 } }, ['op', 'widgetId']),
  object({ op: choice(['set_title']), titleEn: text, titleAr: text }, ['op', 'titleEn', 'titleAr']),
  object({ op: choice(['set_filters']), changes: object({ datePreset: choice([...relativeDatePresets, null]), dateRange: ref('dateRange'), dimensions: { type: 'array', maxItems: 14, items: ref('filter') } }) }, ['op', 'changes']),
  object({ op: choice(['update_layout']), widgetId: { type: 'string', minLength: 1, maxLength: 80 }, changes: object({ x: { type: 'integer', minimum: 0, maximum: 11 }, y: { type: 'integer', minimum: 0, maximum: 200 }, w: { type: 'integer', minimum: 1, maximum: 12 }, h: { type: 'integer', minimum: 1, maximum: 20 } }) }, ['op', 'widgetId', 'changes']),
] } } }, ['operations']), $defs: {
  widgetChanges: object({ type: choice(widgetTypes), dimension: { type: ['string', 'null'] }, title: nullableObject({ en: text, ar: text }, ['en', 'ar']), presentation: ref('presentation') }),
  presentation: nullableObject({ palette: choice([...governedPalettes, null]), orientation: choice(['vertical', 'horizontal', null]), pieVariant: choice(['pie', 'donut', null]),
    legend: choice(['auto', 'show', 'hide', null]), dataLabels: choice(['auto', 'show', 'hide', null]), curve: choice(['straight', 'smooth', null]) }),
  analysis: nullableObject({ comparison: choice(['previous_period', 'month_over_month', 'year_over_year', null]),
    movingAverageWindow: { type: ['integer', 'null'], minimum: 2, maximum: 24 },
    runningTotal: { type: 'boolean' }, percentageContribution: { type: 'boolean' }, ranking: { type: 'boolean' },
    topNDirection: choice(['top', 'bottom', null]), topNLimit: { type: ['integer', 'null'], minimum: 1, maximum: 100 } }),
  dateRange: nullableObject({ from: { type: 'string' }, to: { type: 'string' } }, ['from', 'to']),
  filter: object({ dimension: { type: 'string' }, values: { type: 'array', minItems: 1, maxItems: 100, items: text } }, ['dimension', 'values']),
} };
const check = new Ajv2020({ allErrors: true }).compile(dashboardEditPlanSchema);
export function editPlanSchemaIssues(value: unknown): DashboardSchemaIssue[] {
  if (check(value)) return [];
  return [...(check.errors ?? [])].sort((a, b) => b.instancePath.length - a.instancePath.length).slice(0, 8)
    .map(({ instancePath, keyword, message }) => ({ instancePath, keyword, message: message ?? 'invalid value' }));
}
export function validateDashboardEditPlan(value: unknown): asserts value is DashboardEditPlan {
  if (!check(value)) throw new Error('Invalid DashboardEditPlan schema.');
  for (const operation of (value as unknown as DashboardEditPlan).operations) {
    if (operation.op === 'set_filters' && operation.changes.datePreset != null && operation.changes.dateRange != null) throw new Error('Invalid DashboardEditPlan ambiguous date selection.');
    if (operation.op === 'add_widget') {
      const { series, ...business } = operation.widget;
      delete business.type; delete business.presentation;
      validateDashboardGenerationPlan({ titleEn: 'Added widget', titleAr: 'عنصر إضافي', widgets: [{ ...business, series: series.map(({ metric }) => ({ metric })) }] });
    }
  }
}
function mergeOptional<T extends object>(current: T | undefined, changes: object): T | undefined {
  if (!Object.keys(changes).length) return current;
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete merged[key];
    else merged[key] = structuredClone(value);
  }
  return Object.keys(merged).length ? merged as T : undefined;
}
function mergeAnalysis(current: AnalysisSpec | undefined, changes: AnalysisChanges | null): AnalysisSpec | undefined {
  if (changes === null) return undefined;
  if (!Object.keys(changes).length) return current;
  const analysis = { ...current };
  if (changes.comparison === null) delete analysis.comparison;
  else if (changes.comparison !== undefined) analysis.comparison = changes.comparison;
  if (changes.movingAverageWindow === null) delete analysis.movingAverage;
  else if (changes.movingAverageWindow !== undefined) analysis.movingAverage = { window: changes.movingAverageWindow };
  for (const key of ['runningTotal', 'percentageContribution', 'ranking'] as const) {
    if (changes[key] === false) delete analysis[key]; else if (changes[key] === true) analysis[key] = true;
  }
  if (changes.topNDirection === null || changes.topNLimit === null) {
    if (typeof changes.topNDirection === 'string' || typeof changes.topNLimit === 'number')
      throw new Error('Invalid DashboardEditPlan topN clearing.');
    delete analysis.topN;
  } else if (changes.topNDirection !== undefined || changes.topNLimit !== undefined) {
    const direction = changes.topNDirection ?? analysis.topN?.direction;
    const limit = changes.topNLimit ?? analysis.topN?.limit;
    if (direction === undefined || limit === undefined) throw new Error('Invalid DashboardEditPlan topN pair.');
    analysis.topN = { direction, limit };
  }
  return Object.keys(analysis).length ? analysis : undefined;
}
function addedWidget(intent: AddedWidgetIntent, id: string): DashboardWidget {
  const widget: DashboardWidget = { id, ...resolveGenerationWidget({ ...(intent.dimension ? { dimension: intent.dimension } : {}),
    ...(intent.type ? { requestedPresentation: { type: intent.type } } : {}),
    series: intent.series.map((series, index) => {
      const analysis = series.analysis === undefined ? undefined : mergeAnalysis(undefined, series.analysis);
      return { id: `${id}-series-${index + 1}`, metric: series.metric, ...(analysis ? { analysis } : {}) };
    }) }), ...(intent.titleEn !== undefined && intent.titleAr !== undefined ? { title: { en: intent.titleEn, ar: intent.titleAr } } : {}) };
  if (intent.presentation !== undefined) {
    const presentation = intent.presentation === null ? undefined : mergeOptional<WidgetPresentation>(widget.presentation, intent.presentation);
    if (presentation === undefined) delete widget.presentation; else widget.presentation = presentation;
  }
  return widget;
}
/** Pure, sequential compilation; validation applies the complete patch atomically. */
export function compileDashboardEditPlan(current: DashboardSpec, plan: DashboardEditPlan): DashboardPatch {
  validateDashboardSpec(current); validateDashboardEditPlan(plan);
  const draft = structuredClone(current);
  const reservedIds = new Set(current.widgets.map(widget => widget.id));
  let nextId = 1;
  const patch: DashboardPatch = { schemaVersion: 2, operations: [] };
  const findWidget = (id: string) => {
    const widget = draft.widgets.find(widget => widget.id === id);
    if (!widget) throw new Error('Invalid DashboardEditPlan widget reference.');
    return widget;
  };
  for (const operation of plan.operations) {
    switch (operation.op) {
      case 'update_widget': {
        const widget = findWidget(operation.widgetId); const changes = operation.changes;
        if (changes.type !== undefined) widget.type = changes.type;
        for (const key of ['dimension', 'title'] as const) {
          if (changes[key] === null) delete widget[key];
          else if (changes[key] !== undefined) Object.assign(widget, { [key]: structuredClone(changes[key]) });
        }
        if (changes.presentation !== undefined) {
          const presentation = changes.presentation === null ? undefined : mergeOptional<WidgetPresentation>(widget.presentation, changes.presentation);
          if (presentation === undefined) delete widget.presentation; else widget.presentation = presentation;
        }
        patch.operations.push({ op: 'replace', widgetId: widget.id, widget: structuredClone(widget) }); break;
      }
      case 'update_series': {
        const widget = findWidget(operation.widgetId);
        const series = widget.series.find(series => series.id === operation.seriesId);
        if (!series) throw new Error('Invalid DashboardEditPlan series reference.');
        if (operation.changes.metric !== undefined) series.metric = operation.changes.metric;
        if (operation.changes.presentation === null) delete series.presentation;
        if (operation.changes.analysis !== undefined) {
          const analysis = mergeAnalysis(series.analysis, operation.changes.analysis);
          if (analysis === undefined) delete series.analysis; else series.analysis = analysis;
        }
        patch.operations.push({ op: 'replace', widgetId: widget.id, widget: structuredClone(widget) }); break;
      }
      case 'add_widget': {
        while (reservedIds.has(`widget-${nextId}`)) nextId++;
        const id = `widget-${nextId++}`; reservedIds.add(id);
        const widget = addedWidget(operation.widget, id);
        if (!draft.layout.items) draft.layout = resolveDashboardLayout(draft);
        draft.layout.items!.push(placeDashboardWidget(draft.layout.items!, widget));
        draft.widgets.push(widget);
        patch.operations.push({ op: 'add', widget: structuredClone(widget) }); break;
      }
      case 'remove_widget':
        findWidget(operation.widgetId); draft.widgets = draft.widgets.filter(widget => widget.id !== operation.widgetId);
        if (draft.layout.items) draft.layout.items = draft.layout.items.filter(item => item.widgetId !== operation.widgetId);
        patch.operations.push({ op: 'remove', widgetId: operation.widgetId }); break;
      case 'set_title': patch.operations.push({ op: 'set_title', title: { en: operation.titleEn, ar: operation.titleAr } }); break;
      case 'set_filters':
        if (operation.changes.datePreset === null) delete draft.filters.datePreset;
        else if (operation.changes.datePreset !== undefined) { draft.filters.datePreset = operation.changes.datePreset; delete draft.filters.dateRange; }
        if (operation.changes.dateRange === null) delete draft.filters.dateRange;
        else if (operation.changes.dateRange !== undefined) { draft.filters.dateRange = structuredClone(operation.changes.dateRange); delete draft.filters.datePreset; }
        if (operation.changes.dimensions !== undefined) draft.filters.dimensions = structuredClone(operation.changes.dimensions);
        patch.operations.push({ op: 'set_filters', filters: structuredClone(draft.filters) }); break;
      case 'update_layout': {
        findWidget(operation.widgetId);
        const layout = resolveDashboardLayout(draft);
        const item = layout.items!.find(item => item.widgetId === operation.widgetId)!;
        Object.assign(item, operation.changes); draft.layout = structuredClone(layout);
        patch.operations.push({ op: 'set_layout', layout }); break;
      }
    }
  }
  validateDashboardPatch(patch);
  applyDashboardPatch(current, patch); // Full final canonical/semantic/layout validation.
  return patch;
}
