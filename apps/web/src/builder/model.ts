import { applyDashboardPatch, governedPalettes, resolveDashboardLayout, semanticCatalog, validateAnalysis, validateDashboardSpec, visualizationIssues } from '@el-dabboos/domain';
import type { AnalysisSpec, DateRange, DashboardLayout, DashboardPatch, DashboardSpec, DashboardWidget, DimensionId, GovernedPalette, Locale, MetricId, ProductMetric, SemanticMetric, TenantProfile } from '@el-dabboos/domain';

export interface EmptyBuilderDraft {
  kind: 'empty';
  base: Omit<DashboardSpec, 'widgets'>;
}
export type BuilderDocument = { kind: 'dashboard'; spec: DashboardSpec } | EmptyBuilderDraft;
export interface BuilderHistory { past: BuilderDocument[]; present: BuilderDocument; future: BuilderDocument[] }
export type BuilderCommand =
  | { type: 'patch'; patch: DashboardPatch }
  | { type: 'layout'; layout: DashboardLayout }
  | { type: 'add-first'; widget: DashboardWidget; layout?: DashboardLayout }
  | { type: 'remove-last' };
export interface BuilderTransition { history: BuilderHistory; execute: boolean }
const MAX_HISTORY = 40;

export function blankDashboardDraft(_profile: TenantProfile, locale: Locale, _now?: Date, defaultPeriod?: DateRange): EmptyBuilderDraft {
  void _now; // Retain existing callers; authoring no longer resolves the clock.
  return { kind: 'empty', base: { schemaVersion: 2, id: 'manual-dashboard', title: { en: 'Untitled Dashboard', ar: 'لوحة بدون اسم' },
    locale, filters: defaultPeriod ? { dateRange: { ...defaultPeriod } } : { datePreset: 'current_year' }, layout: { columns: 12, items: [] } } };
}
export function startBuilder(document: BuilderDocument): BuilderHistory {
  return { past: [], present: structuredClone(document), future: [] };
}
export function withLocale(document: BuilderDocument, locale: Locale): BuilderDocument {
  if (document.kind === 'empty') return { kind: 'empty', base: { ...document.base, locale } };
  return { kind: 'dashboard', spec: { ...document.spec, locale } };
}
function semanticKey(document: BuilderDocument): string {
  return document.kind === 'empty' ? 'empty' : JSON.stringify({ filters: document.spec.filters, widgets: document.spec.widgets.map(widget => ({ id: widget.id, dimension: widget.dimension, series: widget.series.map(series => ({ id: series.id, metric: series.metric, analysis: series.analysis })) })) });
}
export function commitBuilderCommand(history: BuilderHistory, command: BuilderCommand): BuilderTransition {
  const current = history.present;
  let next: BuilderDocument;
  if (command.type === 'add-first') {
    if (current.kind !== 'empty') throw new Error('First widget requires an empty dashboard');
    const spec: DashboardSpec = { ...structuredClone(current.base), widgets: [command.widget] };
    spec.layout = command.layout ?? { columns: 12, items: resolveDashboardLayout({ ...spec, layout: { columns: 12 } }).items };
    validateDashboardSpec(spec);
    next = { kind: 'dashboard', spec };
  } else if (command.type === 'remove-last') {
    if (current.kind !== 'dashboard' || current.spec.widgets.length !== 1) throw new Error('Not the last widget');
    const { schemaVersion, id, title, locale, filters, presentation } = current.spec;
    next = { kind: 'empty', base: { schemaVersion, id, title, locale, filters, ...(presentation ? { presentation } : {}), layout: { columns: 12, items: [] } } };
  } else {
    if (current.kind !== 'dashboard') throw new Error('Add a widget before editing the dashboard');
    const patch: DashboardPatch = command.type === 'layout' ? { schemaVersion: 2, operations: [{ op: 'set_layout', layout: command.layout }] } : command.patch;
    next = { kind: 'dashboard', spec: applyDashboardPatch(current.spec, patch) };
  }
  if (JSON.stringify(current) === JSON.stringify(next)) return { history, execute: false };
  return { history: { past: [...history.past, structuredClone(current)].slice(-MAX_HISTORY), present: next, future: [] },
    execute: semanticKey(current) !== semanticKey(next) };
}
export function undoBuilder(history: BuilderHistory): BuilderTransition {
  if (!history.past.length) return { history, execute: false };
  const previous = history.past.at(-1)!;
  return { history: { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] },
    execute: semanticKey(history.present) !== semanticKey(previous) };
}
export function redoBuilder(history: BuilderHistory): BuilderTransition {
  if (!history.future.length) return { history, execute: false };
  const next = history.future[0]!;
  return { history: { past: [...history.past, history.present].slice(-MAX_HISTORY), present: next, future: history.future.slice(1) },
    execute: semanticKey(history.present) !== semanticKey(next) };
}
export function selectableMetric(metric: ProductMetric): metric is Extract<ProductMetric, { availability: 'available' }> {
  return metric.availability === 'available';
}
export function commonDimensions(metrics: readonly MetricId[], catalog: Record<string, SemanticMetric> = semanticCatalog): DimensionId[] {
  if (!metrics.length) return [];
  return catalog[metrics[0]!]!.dimensions.filter(dimension => metrics.every(metric => catalog[metric]?.dimensions.includes(dimension)));
}
export function canAddSeries(widget: DashboardWidget, metricId: MetricId, catalog: Record<string, SemanticMetric> = semanticCatalog): { allowed: boolean; reason?: string } {
  if (['kpi', 'pie', 'treemap'].includes(widget.type)) return { allowed: false, reason: 'This visualization requires exactly one series' };
  if (widget.series.length >= (widget.type === 'combo' ? 4 : 8)) return { allowed: false, reason: widget.type === 'combo' ? 'Four series maximum' : 'Eight series maximum' };
  if (!catalog[metricId]) return { allowed: false, reason: 'Metric is unavailable' };
  const candidate = { ...widget, series: [...widget.series, { id: 'new-series', metric: metricId }] };
  const issue = visualizationIssues(candidate, catalog)[0];
  if (issue) return { allowed: false, reason: issue };
  if (widget.dimension && !commonDimensions([...widget.series.map(s => s.metric), metricId], catalog).includes(widget.dimension))
    return { allowed: false, reason: 'Metrics need a shared grouping dimension' };
  return { allowed: true };
}
export function withWidgetMetric(widget: DashboardWidget, seriesId: string, metric: MetricId): DashboardWidget {
  const series = widget.series.map(entry => entry.id === seriesId ? { id: entry.id, metric } : entry);
  const dimensions = commonDimensions(series.map(entry => entry.metric));
  return { ...widget, series, ...(widget.dimension && dimensions.includes(widget.dimension) ? { dimension: widget.dimension } : { dimension: undefined }) };
}
export function analysisAllowed(metric: MetricId, dimension: DimensionId | undefined, dateRange: DashboardSpec['filters']['dateRange'] | DashboardSpec['filters']['datePreset'], analysis: AnalysisSpec): boolean {
  try { validateAnalysis(analysis, metric, dimension, dateRange); return true; } catch { return false; }
}
export function validWidgetDraft(widget: DashboardWidget, base: Omit<DashboardSpec, 'widgets'>): boolean {
  try { validateDashboardSpec({ ...base, layout: { columns: 12 }, widgets: [widget] }); return true; } catch { return false; }
}

export type WidgetPaletteSelection = 'inherit' | GovernedPalette;
/** Inheritance is editor-only; removing the override preserves other presentation. */
export function withWidgetPalette(widget: DashboardWidget, value: WidgetPaletteSelection): DashboardWidget {
  if (value !== 'inherit' && !governedPalettes.includes(value)) throw new Error('Invalid governed palette.');
  const next = { ...widget, presentation: { ...widget.presentation } };
  if (value === 'inherit') delete next.presentation.palette;
  else next.presentation.palette = value;
  if (!Object.keys(next.presentation).length) delete (next as DashboardWidget).presentation;
  return next;
}
/** Palette edits use the canonical replacement/history path. */
export function widgetPaletteCommand(widget: DashboardWidget, value: string): BuilderCommand {
  if (value !== 'inherit' && !governedPalettes.includes(value as GovernedPalette)) throw new Error('Invalid governed palette.');
  return { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'replace', widgetId: widget.id,
    widget: withWidgetPalette(widget, value as WidgetPaletteSelection),
  }] } };
}
export function dashboardPaletteCommand(palette: GovernedPalette): BuilderCommand {
  return { type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'set_presentation', presentation: { palette } }] } };
}
