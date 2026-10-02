import { ArrowUp, ArrowDown, X, Undo2, Redo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { governedPalettes, resolveDashboardLayout, widgetTypes } from '@el-dabboos/domain';
import type { AnalysisSpec, DashboardPatch, DashboardSeries, DashboardSpec, DashboardWidget, DimensionId, GovernedPalette, Locale, MetricId, ProductMetric, SemanticMetric, TenantProfile, WidgetType } from '@el-dabboos/domain';
import type { DashboardExecutionResult } from '@el-dabboos/application';
import { WidgetCard } from '../Renderer.tsx';
import { DashboardGrid } from './DashboardGrid.tsx';
import { WidgetLayoutInspector } from './WidgetLayoutInspector.tsx';
import { arrangeLayout, duplicateWidget, insertWidget, nextWidgetId, resetLayout, updateWidgetLayout, widgetSizes } from './layout-tools.ts';
import { recommendedVisualization, visualizationCandidate, visualizationOptions, visualizationNames, visualizationLabel } from './visualizations.ts';
import { MetricChooser } from './MetricChooser.ts';
import { readBuilderDragItem, writeBuilderDragItem } from './drag-item.ts';
import type { BuilderDragItem } from './drag-item.ts';
import { applyMetricDrop, createMetricCommand, metricAvailable, metricDropActions, metricDropCopy, metricVisualizationOptions, nextSeriesId } from './metric-drop.ts';
import type { MetricDropAction } from './metric-drop.ts';
import { copy } from '../i18n.ts';
import { analysisAllowed, canAddSeries, commonDimensions, selectableMetric, validWidgetDraft, widgetPaletteCommand, withWidgetMetric } from './model.ts';
import type { BuilderCommand, BuilderDocument, BuilderHistory } from './model.ts';

export type FilterOptions = Partial<Record<DimensionId, Array<{ id: string; label: string }>>>;
interface Props {
  history: BuilderHistory;
  execution: DashboardExecutionResult | null;
  catalog: Record<string, SemanticMetric>;
  registry: ProductMetric[];
  profile: TenantProfile;
  locale: Locale;
  filterOptions: FilterOptions;
  busy: boolean;
  onCommand: (command: BuilderCommand) => void;
  onUndo: () => void;
  onRedo: () => void;
}
const filterDimensions: DimensionId[] = ['branch', 'region', 'salesperson', 'product_category', 'warehouse'];
const types: readonly WidgetType[] = widgetTypes;
const domainNames = {
  en: { sales: 'Sales', crm: 'CRM', finance: 'Finance', inventory: 'Inventory', maintenance: 'Maintenance', customers: 'Customers', purchasing: 'Purchasing' },
  ar: { sales: 'المبيعات', crm: 'فرص المبيعات', finance: 'المالية', inventory: 'المخزون', maintenance: 'الصيانة', customers: 'العملاء', purchasing: 'المشتريات' },
};
const labels = {
  en: { view: 'View', edit: 'Edit', unsaved: 'Press Save to keep your changes', widgets: 'Widgets', properties: 'Widget properties', filters: 'Dashboard filters',
    newWidget: 'Add widget', apply: 'Apply widget', addSeries: 'Add series', metric: 'Metric', primary: 'Primary / selection metric', dimension: 'Dimension', type: 'Visualization', remove: 'Remove widget',
    comparison: 'Comparison', moving: 'Moving average', running: 'Running total', contribution: 'Percentage contribution', ranking: 'Ranking', top: 'Top / bottom N',
    dateFrom: 'From', dateTo: 'To', applyDates: 'Apply dates', all: 'All', planned: 'Planned', none: 'None', selectWidget: 'Select a widget or add one',
    moveUp: 'Move series up', moveDown: 'Move series down', removeSeries: 'Remove series', topName: 'Top', bottomName: 'Bottom',
    preview: 'Live preview', drag: 'Drag the handle to reorder. Resize from the edges or corners. Focus the handle: arrows move, Shift + arrows resize.', chooseDimension: 'Choose a dimension', validation: 'Complete a valid widget before applying.',
  },
  ar: { view: 'عرض', edit: 'تحرير', unsaved: 'اضغط حفظ للاحتفاظ بتغييراتك', widgets: 'البطاقات', properties: 'خصائص البطاقة', filters: 'مرشحات اللوحة',
    newWidget: 'إضافة بطاقة', apply: 'تطبيق البطاقة', addSeries: 'إضافة سلسلة', metric: 'المؤشر', primary: 'المؤشر الأساسي / اختيار النتائج', dimension: 'البعد', type: 'نوع العرض', remove: 'إزالة البطاقة',
    comparison: 'المقارنة', moving: 'المتوسط المتحرك', running: 'المجموع التراكمي', contribution: 'نسبة المساهمة', ranking: 'الترتيب', top: 'أعلى / أدنى عدد',
    dateFrom: 'من', dateTo: 'إلى', applyDates: 'تطبيق التواريخ', all: 'الكل', planned: 'قيد التخطيط', none: 'بلا', selectWidget: 'اختر بطاقة أو أضف واحدة',
    moveUp: 'رفع السلسلة', moveDown: 'خفض السلسلة', removeSeries: 'إزالة السلسلة', topName: 'الأعلى', bottomName: 'الأدنى',
    preview: 'معاينة مباشرة', drag: 'اسحب المقبض للنقل وغيّر الحجم من الحواف. عند تركيز المقبض: الأسهم للنقل وShift مع الأسهم لتغيير الحجم.', chooseDimension: 'اختر بعدًا', validation: 'أكمل إعداد بطاقة صالحة قبل التطبيق.',
  },
};
const typeName = visualizationNames;
const makeWidget = (id: string, type: WidgetType, metric: MetricId = 'revenue', usedSeriesIds: readonly string[] = []): DashboardWidget => {
  const series: DashboardSeries[] = [{ id: nextSeriesId(metric, usedSeriesIds), metric }];
  if (type === 'combo') series.push({ id: nextSeriesId(metric, [...usedSeriesIds, series[0]!.id]), metric });
  return { id, type, series, ...(type === 'bar' ? { presentation: { orientation: 'vertical' } as const } : {}), ...(type === 'kpi' ? {} : { dimension: ['pie', 'treemap', 'bar', 'table'].includes(type) ? 'branch' : 'month' }) };
};
const patch = (operation: DashboardPatch['operations'][number]): BuilderCommand => ({ type: 'patch', patch: { schemaVersion: 2, operations: [operation] } });

function WidgetEditor({ initial, adding, base, registry, catalog, locale, onApply, onPalette, onRemove }: {
  initial: DashboardWidget; adding: boolean; base: Omit<DashboardSpec, 'widgets'>; registry: ProductMetric[];
  catalog: Record<string, SemanticMetric>; locale: Locale; onApply: (widget: DashboardWidget) => void; onPalette: (value: string) => void; onRemove: () => void;
}) {
  const t = labels[locale];
  const available = registry.filter(selectableMetric);
  const [draft, setDraft] = useState<DashboardWidget>(() => structuredClone(initial));
  const [newMetric, setNewMetric] = useState<MetricId>('revenue');
  const [message, setMessage] = useState('');
  // A palette-only preview must not discard other pending editor controls.
  const initialSignature = JSON.stringify({ ...initial, presentation: { ...initial.presentation, palette: undefined } });
  useEffect(() => { setDraft(structuredClone(initial)); setMessage(''); }, [initialSignature]);
  const initialPalette = initial.presentation?.palette;
  const initialHasPresentation = initial.presentation !== undefined;
  useEffect(() => {
    setDraft(current => {
      if (initialPalette === undefined && current.presentation === undefined) return current;
      const presentation = { ...current.presentation };
      if (initialPalette === undefined) delete presentation.palette;
      else presentation.palette = initialPalette;
      const next: DashboardWidget = { ...current, presentation };
      if (!initialHasPresentation && !Object.keys(presentation).length) delete next.presentation;
      return next;
    });
  }, [initialPalette, initialHasPresentation]);
  const dimensions = commonDimensions(draft.series.map(series => series.metric), catalog);
  const updateSeries = (id: string, update: (series: DashboardSeries) => DashboardSeries) => setDraft(current => ({ ...current, series: current.series.map(series => series.id === id ? update(series) : series) }));
  const changeAnalysis = (series: DashboardSeries, change: Partial<AnalysisSpec>, remove?: keyof AnalysisSpec) => {
    const analysis = { ...series.analysis, ...change };
    if (remove) delete analysis[remove];
    if (!analysisAllowed(series.metric, draft.dimension, base.filters.dateRange, analysis) || !validWidgetDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, analysis } : item) }, base)) return;
    updateSeries(series.id, old => ({ ...old, ...(Object.keys(analysis).length ? { analysis } : { analysis: undefined }) }));
  };
  const valid = validWidgetDraft(draft, base);
  const choices = visualizationOptions(draft, base);
  const recommendation = recommendedVisualization(draft, base, catalog);
  const choiceId = draft.type === 'pie' && draft.presentation?.pieVariant === 'donut' ? 'donut' : draft.type === 'bar' && draft.presentation?.orientation !== 'vertical' ? 'horizontal' : draft.type;
  const typeChanged = (id: string) => {
    const option = choices.find(option => option.id === id);
    if (option) setDraft(current => visualizationCandidate(current, option));
  };
  const dimensionChanged = (dimension?: DimensionId) => {
    const candidate = { ...draft, dimension };
    const options = visualizationOptions(candidate, base);
    const option = options.find(option => option.id === choiceId) ?? options.find(option => option.id === (dimension ? ['month', 'date', 'quarter', 'year'].includes(dimension) ? 'line' : 'bar' : 'kpi')) ?? options[0];
    if (option) setDraft(visualizationCandidate(candidate, option));
  };
  const setPresentation = (key: 'legend' | 'curve' | 'dataLabels', value: string) => setDraft(current => ({ ...current, presentation: { ...current.presentation, [key]: value } }));
  const addSeries = () => {
    const check = canAddSeries(draft, newMetric, catalog);
    if (!check.allowed) { setMessage(check.reason ?? 'Incompatible metric'); return; }
    const id = nextSeriesId(newMetric, draft.series.map(series => series.id));
    setDraft(current => ({ ...current, series: [...current.series, { id, metric: newMetric }] })); setMessage('');
  };
  const moveSeries = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.series.length || (index === 0 || next === 0) && draft.series[0]?.analysis?.topN) return;
    const series = [...draft.series]; [series[index], series[next]] = [series[next]!, series[index]!];
    setDraft(current => ({ ...current, series }));
  };
  return <div className="builder-editor">
    <h3>{adding ? t.newWidget : t.properties}</h3>
    <label>{t.type}<select value={choiceId} onChange={event => typeChanged(event.target.value)}>{(['summary', 'trend', 'comparison', 'composition', 'detail'] as const).map(group => <optgroup key={group} label={visualizationNames[locale][group]}>{choices.filter(option => option.group === group).map(option => <option key={option.id} value={option.id}>{visualizationLabel(option, locale)}</option>)}</optgroup>)}</select></label>
    {recommendation && <p className="builder-hint">{locale === 'ar' ? 'العرض المقترح: ' : 'Suggested visualization: '}{visualizationLabel(recommendation, locale)}</p>}
    <PaletteSelect locale={locale} value={draft.presentation?.palette ?? 'default'} onChange={value => {
      setDraft(current => ({ ...current, presentation: { ...current.presentation, palette: value } }));
      if (!adding) onPalette(value);
    }} />
    <label>{t.dimension}<select value={draft.dimension ?? ''} onChange={event => dimensionChanged(event.target.value as DimensionId || undefined)}>
      <option value="">{t.none}</option>{dimensions.map(dimension => <option key={dimension} value={dimension}>{copy[locale].dimensions[dimension]}</option>)}</select></label>
    {!['kpi', 'table'].includes(draft.type) && <label>{locale === 'ar' ? 'مفتاح الرسم' : 'Legend'}<select value={draft.presentation?.legend ?? 'auto'} onChange={event => setPresentation('legend', event.target.value)}>{(['auto', 'show', 'hide'] as const).map(value => <option key={value} value={value}>{locale === 'ar' ? { auto: 'تلقائي', show: 'إظهار', hide: 'إخفاء' }[value] : value}</option>)}</select></label>}
    {['line', 'area', 'combo'].includes(draft.type) && <label>{locale === 'ar' ? 'مسار الخط' : 'Curve'}<select value={draft.presentation?.curve ?? 'straight'} onChange={event => setPresentation('curve', event.target.value)}><option value="straight">{locale === 'ar' ? 'مستقيم' : 'Straight'}</option><option value="smooth">{locale === 'ar' ? 'ناعم' : 'Smooth'}</option></select></label>}
    {['pie', 'treemap'].includes(draft.type) && <label>{locale === 'ar' ? 'تسميات البيانات' : 'Data labels'}<select value={draft.presentation?.dataLabels ?? 'auto'} onChange={event => setPresentation('dataLabels', event.target.value)}>{(['auto', 'show', 'hide'] as const).map(value => <option key={value} value={value}>{locale === 'ar' ? { auto: 'تلقائي', show: 'إظهار', hide: 'إخفاء' }[value] : value}</option>)}</select></label>}
    <div className="builder-series-heading">{t.metric}</div>
    {draft.series.map((series, index) => {
      const analysis = series.analysis ?? {};
      const allowed = (next: AnalysisSpec) => analysisAllowed(series.metric, draft.dimension, base.filters.dateRange, next) && validWidgetDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, analysis: next } : item) }, base);
      return <div className="builder-series" key={series.id}>
        <div className="builder-series-title"><strong>{index === 0 ? t.primary : `${t.metric} ${index + 1}`}</strong><span>
          <button type="button" disabled={index === 0 || (index === 1 && !!draft.series[0]?.analysis?.topN)} onClick={() => moveSeries(index, -1)} aria-label={t.moveUp}><ArrowUp aria-hidden="true" /></button>
          <button type="button" disabled={index === draft.series.length - 1 || (index === 0 && !!draft.series[0]?.analysis?.topN)} onClick={() => moveSeries(index, 1)} aria-label={t.moveDown}><ArrowDown aria-hidden="true" /></button>
          <button type="button" disabled={draft.series.length === 1} onClick={() => setDraft(current => ({ ...current, series: current.series.filter(item => item.id !== series.id) }))} aria-label={t.removeSeries}><X aria-hidden="true" /></button>
        </span></div>
        <select aria-label={`${t.metric} ${index + 1}`} value={series.metric} onChange={event => setDraft(current => withWidgetMetric(current, series.id, event.target.value as MetricId))}>
          {available.map(metric => <option key={metric.id} value={metric.id} disabled={metric.id !== series.metric && (['line', 'area', 'bar', 'combo'].includes(draft.type)) && draft.series.length > 1 && !canAddSeries({ ...draft, series: draft.series.filter(item => item.id !== series.id) }, metric.id, catalog).allowed}>{metric.labels[locale]}</option>)}
        </select>
        {draft.type === 'combo' && <label>{locale === 'ar' ? 'علامة السلسلة' : 'Series mark'}<select value={series.presentation?.mark ?? (index === 0 ? 'bar' : 'line')} onChange={event => updateSeries(series.id, old => ({ ...old, presentation: { mark: event.target.value as 'bar' | 'line' } }))}><option value="bar">{locale === 'ar' ? 'أعمدة' : 'Bar'}</option><option value="line">{locale === 'ar' ? 'خطي' : 'Line'}</option></select></label>}
        <div className="builder-analysis">
          <label>{t.comparison}<select value={analysis.comparison ?? ''} onChange={event => changeAnalysis(series, { comparison: event.target.value as AnalysisSpec['comparison'] }, event.target.value ? undefined : 'comparison')}>
            <option value="">{t.none}</option>{(['previous_period', 'month_over_month', 'year_over_year'] as const).map(value => <option key={value} value={value} disabled={!allowed({ ...analysis, comparison: value })}>{locale === 'ar' ? ({ previous_period: 'الفترة السابقة', month_over_month: 'مقارنة بالشهر السابق', year_over_year: 'مقارنة بالسنة السابقة' }[value]) : value.replaceAll('_', ' ')}</option>)}</select></label>
          <label>{t.moving}<select value={analysis.movingAverage?.window ?? 0} onChange={event => changeAnalysis(series, event.target.value === '0' ? {} : { movingAverage: { window: Number(event.target.value) } }, event.target.value === '0' ? 'movingAverage' : undefined)}>
            <option value={0}>{t.none}</option>{[3, 6, 12].map(window => <option key={window} value={window} disabled={!allowed({ ...analysis, movingAverage: { window } })}>{window}</option>)}</select></label>
          <label className="builder-checkbox"><input type="checkbox" checked={!!analysis.runningTotal} disabled={!analysis.runningTotal && !allowed({ ...analysis, runningTotal: true })} onChange={event => changeAnalysis(series, event.target.checked ? { runningTotal: true } : {}, event.target.checked ? undefined : 'runningTotal')} />{t.running}</label>
          <label className="builder-checkbox"><input type="checkbox" checked={!!analysis.percentageContribution} disabled={!analysis.percentageContribution && !allowed({ ...analysis, percentageContribution: true })} onChange={event => changeAnalysis(series, event.target.checked ? { percentageContribution: true } : {}, event.target.checked ? undefined : 'percentageContribution')} />{t.contribution}</label>
          <label className="builder-checkbox"><input type="checkbox" checked={!!analysis.ranking} disabled={!analysis.ranking && !allowed({ ...analysis, ranking: true })} onChange={event => changeAnalysis(series, event.target.checked ? { ranking: true } : {}, event.target.checked ? undefined : 'ranking')} />{t.ranking}</label>
          {index === 0 && <label>{t.top}<select value={analysis.topN?.direction ?? ''} onChange={event => changeAnalysis(series, event.target.value ? { topN: { direction: event.target.value as 'top' | 'bottom', limit: analysis.topN?.limit ?? 10 } } : {}, event.target.value ? undefined : 'topN')}>
            <option value="">{t.none}</option><option value="top" disabled={!allowed({ ...analysis, topN: { direction: 'top', limit: 10 } })}>{t.topName}</option><option value="bottom" disabled={!allowed({ ...analysis, topN: { direction: 'bottom', limit: 10 } })}>{t.bottomName}</option></select></label>}
          {index === 0 && analysis.topN && <label>N<input type="number" min="1" max="100" value={analysis.topN.limit} onChange={event => changeAnalysis(series, { topN: { ...analysis.topN!, limit: Number(event.target.value) } })} /></label>}
        </div>
      </div>;
    })}
    {!['kpi', 'pie', 'treemap'].includes(draft.type) && draft.series.length < (draft.type === 'combo' ? 4 : 8) && <div className="builder-add-series"><select aria-label={t.addSeries} value={newMetric} onChange={event => { setNewMetric(event.target.value as MetricId); setMessage(''); }}>
      {available.map(metric => <option key={metric.id} value={metric.id}>{metric.labels[locale]}</option>)}</select><button type="button" onClick={addSeries}>{t.addSeries}</button></div>}
    {message && <p className="builder-hint" role="alert">{message}</p>}
    {!valid && <p className="builder-hint">{t.validation}</p>}
    <div className="builder-editor-actions"><button className="primary-button" disabled={!valid} onClick={() => onApply(draft)}>{t.apply}</button>{!adding && <button className="builder-danger" onClick={onRemove}>{t.remove}</button>}</div>
  </div>;
}

export function BuilderWorkspace({ history, execution, catalog, registry, profile, locale, filterOptions, busy, onCommand, onUndo, onRedo }: Props) {
  const t = labels[locale];
  const document: BuilderDocument = history.present;
  const spec = document.kind === 'dashboard' ? document.spec : null;
  const base = spec ? { schemaVersion: spec.schemaVersion, id: spec.id, title: spec.title, locale: spec.locale, filters: spec.filters, layout: spec.layout } : document.kind === 'empty' ? document.base : null;
  const [selectedId, setSelectedId] = useState<string | null>(spec?.widgets[0]?.id ?? null);
  const [dragItem, setDragItem] = useState<BuilderDragItem | null>(null);
  const [metricChoice, setMetricChoice] = useState<{ metric: MetricId; position: { x: number; y: number }; widgetId?: string; dimension?: DimensionId } | null>(null);
  const finishDrag = () => setDragItem(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setDragItem(null); setMetricChoice(null); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => { if (busy) setDragItem(null); }, [busy]);
  const [layoutError, setLayoutError] = useState('');
  const [addingType, setAddingType] = useState<WidgetType | null>(null);
  const [dateFrom, setDateFrom] = useState(base?.filters.dateRange?.from ?? '');
  const [dateTo, setDateTo] = useState(base?.filters.dateRange?.to ?? '');
  useEffect(() => { setDateFrom(base?.filters.dateRange?.from ?? ''); setDateTo(base?.filters.dateRange?.to ?? ''); }, [base?.filters.dateRange?.from, base?.filters.dateRange?.to]);
  const selected = spec?.widgets.find(widget => widget.id === selectedId);
  const dashboardTitle = document.kind === 'dashboard' ? document.spec.title[locale] : document.base.title[locale];
  const newWidget = useMemo(() => addingType ? makeWidget(nextWidgetId(spec?.widgets ?? []), addingType, 'revenue', spec?.widgets.flatMap(widget => widget.series.map(series => series.id)) ?? []) : null, [addingType, spec?.widgets]);
  const requestedFilters = base?.filters.dimensions ?? [];
  const setRequestedFilter = (dimension: DimensionId, value: string) => {
    if (!base || !spec) return;
    const dimensions = requestedFilters.filter(filter => filter.dimension !== dimension);
    if (value) dimensions.push({ dimension, values: [value] });
    onCommand(patch({ op: 'set_filters', filters: { ...base.filters, ...(dimensions.length ? { dimensions } : { dimensions: undefined }) } }));
  };
  const applyDates = () => {
    if (!base || !spec) return;
    onCommand(patch({ op: 'set_filters', filters: { ...base.filters, dateRange: { from: dateFrom, to: dateTo } } }));
  };
  const applyWidget = (widget: DashboardWidget) => {
    if (addingType) { onCommand(spec ? patch({ op: 'add', widget }) : { type: 'add-first', widget }); setAddingType(null); setSelectedId(widget.id); }
    else if (selected) onCommand(patch({ op: 'replace', widgetId: selected.id, widget }));
  };
  const removeWidget = (id = selected?.id) => {
    if (!id || !spec) return;
    onCommand(spec.widgets.length === 1 ? { type: 'remove-last' } : patch({ op: 'remove', widgetId: id }));
    setSelectedId(spec.widgets.find(widget => widget.id !== id)?.id ?? null);
  };
  const guarded = (action: () => void) => {
    try { action(); setLayoutError(''); } catch { setDragItem(null); setMetricChoice(null); setLayoutError(locale === 'ar' ? 'تعذر تطبيق التغيير ضمن حدود الشبكة.' : 'Change could not fit within grid limits.'); }
  };
  const dropWidget = (type: WidgetType, position: { x: number; y: number }) => guarded(() => {
    const metric = registry.filter(selectableMetric).find(metric => metric.id === 'revenue') ?? registry.filter(selectableMetric)[0];
    if (!metric) return;
    const widget = makeWidget(nextWidgetId(spec?.widgets ?? []), type, metric.id, spec?.widgets.flatMap(widget => widget.series.map(series => series.id)) ?? []);
    if (!validWidgetDraft(widget, base!)) throw new Error('Invalid widget');
    onCommand(spec ? insertWidget(spec, widget, position) : { type: 'add-first', widget,
      layout: { columns: 12, items: [{ widgetId: widget.id, ...widgetSizes[type], ...position }] } });
    setSelectedId(widget.id); setAddingType(null); setDragItem(null);
  });
  const readDrag = (data: Pick<DataTransfer, 'getData'> | null) => readBuilderDragItem(data, catalog, registry);
  const actionsFor = (widget: DashboardWidget, metric: MetricId) => base ? metricDropActions(widget, metric, catalog, registry, base) : [];
  const performMetricAction = (id: string, metric: MetricId, action: MetricDropAction) => {
    if (busy || !spec) return;
    guarded(() => { onCommand(applyMetricDrop(spec, id, metric, action, catalog, registry)); setSelectedId(id); setAddingType(null); setMetricChoice(null); finishDrag(); });
  };
  const chooseMetric = (metric: MetricId, position: { x: number; y: number }, widgetId?: string) => {
    if (busy || !metricAvailable(metric, catalog, registry)) { finishDrag(); return; }
    setMetricChoice({ metric, position, ...(widgetId ? { widgetId } : {}) }); setAddingType(null);
  };
  const choiceWidget = spec?.widgets.find(widget => widget.id === metricChoice?.widgetId);
  const chooser = metricChoice && base && <div className="metric-chooser-anchor" style={{ top: metricChoice.position.y * 88 + 14,
    left: `clamp(0px, ${metricChoice.position.x / 12 * 100}%, max(0px, 100% - 290px))` }}>
    <MetricChooser locale={locale} label={catalog[metricChoice.metric]?.labels[locale] ?? metricChoice.metric}
      options={metricVisualizationOptions(metricChoice.metric, catalog, base, metricChoice.dimension)} actions={choiceWidget ? actionsFor(choiceWidget, metricChoice.metric) : []}
      dimensions={catalog[metricChoice.metric]?.dimensions} dimension={metricChoice.dimension} onDimension={dimension => setMetricChoice({ ...metricChoice, dimension })}
      kpi={choiceWidget?.type === 'kpi'} busy={busy} onClose={() => setMetricChoice(null)}
      onAction={action => choiceWidget && performMetricAction(choiceWidget.id, metricChoice.metric, action)}
      onCreate={type => { if (!busy) guarded(() => { const next = createMetricCommand(document, metricChoice.metric, type, metricChoice.position, catalog, registry, metricChoice.dimension);
        onCommand(next.command); setSelectedId(next.widget.id); setAddingType(null); setMetricChoice(null); finishDrag(); }); }} />
  </div>;
  return <div className="builder-workspace">
    <aside className="builder-palette"><h3>{t.widgets}</h3><p>{t.unsaved}</p><div className="builder-add-buttons">{types.map(type => <button key={type} draggable={!busy} onDragStart={event => { const item: BuilderDragItem = { kind: 'widget', widgetType: type }; writeBuilderDragItem(event.dataTransfer, item); setMetricChoice(null); setDragItem(item); }} onDragEnd={finishDrag} onClick={() => { setAddingType(type); setSelectedId(null); }}>{t.newWidget}: {typeName[locale][type]}</button>)}</div>
      <h3>{t.metric}</h3>{Object.entries(domainNames[locale]).map(([domain, name]) => {
        const metrics = registry.filter(metric => metric.domain === domain);
        if (!metrics.length) return null;
        return <details key={domain} open={domain === 'sales'}><summary>{name}</summary><div className="builder-metric-list">{metrics.map(metric => {
          const id = metric.id;
          if (!metricAvailable(id, catalog, registry)) return <div key={id} className="builder-planned">{metric.labels[locale]} <small>{t.planned}</small></div>;
          return <button key={id} className={`metric-palette-item ${dragItem?.kind === 'metric' && dragItem.metricId === id ? 'metric-dragging' : ''}`}
            disabled={busy} draggable={!busy} onDragStart={event => { const item: BuilderDragItem = { kind: 'metric', metricId: id };
              writeBuilderDragItem(event.dataTransfer, item); setMetricChoice(null); setDragItem(item); }} onDragEnd={finishDrag}
            onClick={() => chooseMetric(id, { x: 0, y: 0 }, selected?.id)}>{metric.labels[locale]}</button>;
        })}</div></details>;
      })}</aside>
    <div className="builder-center"><div className="builder-canvas-head"><strong>{dashboardTitle}</strong><span>{t.preview} · {t.unsaved}</span><div><button disabled={!history.past.length} onClick={onUndo}><Undo2 aria-hidden="true" />{locale === 'ar' ? 'تراجع' : 'Undo'}</button><button disabled={!history.future.length} onClick={onRedo}><Redo2 aria-hidden="true" />{locale === 'ar' ? 'إعادة' : 'Redo'}</button><button disabled={!spec} onClick={() => spec && guarded(() => onCommand({ type: 'layout', layout: arrangeLayout(spec) }))}>{locale === 'ar' ? 'ترتيب تلقائي' : 'Auto arrange'}</button><button disabled={!spec} onClick={() => spec && guarded(() => onCommand({ type: 'layout', layout: resetLayout(spec) }))}>{locale === 'ar' ? 'إعادة ضبط التخطيط' : 'Reset layout'}</button></div></div>
      <p className="builder-hint">{t.drag}</p>{busy && <p className="builder-preview-loading">{copy[locale].loading}</p>}
      {layoutError && <p role="status" className="builder-hint">{layoutError}</p>}
      {base && <DashboardGrid spec={spec ?? { ...base, widgets: [] }} locale={locale} editable={!busy} selectedId={selectedId} dragItem={dragItem} readDrag={readDrag} onDragFinish={finishDrag} metricActions={actionsFor} chooser={chooser}
        onSelect={id => { setSelectedId(id); setAddingType(null); }} onLayoutCommit={layout => onCommand({ type: 'layout', layout })}
        onPaletteDrop={(item, position) => { if (busy) return; if (item.kind === 'widget') dropWidget(item.widgetType, position); else chooseMetric(item.metricId, position); }}
        onMetricWidgetDrop={(id, metric, action) => {
          if (busy || !spec) return;
          const widget = spec.widgets.find(widget => widget.id === id)!;
          const actions = actionsFor(widget, metric);
          if (!actions.length) { finishDrag(); setLayoutError(metricDropCopy[locale].invalid); return; }
          if (action || widget.type === 'kpi') performMetricAction(id, metric, action ?? 'replace-primary');
          else { const item = resolveDashboardLayout(spec).items!.find(item => item.widgetId === id)!; chooseMetric(metric, { x: item.x, y: item.y }, id); }
        }} onAction={(id, action) => guarded(() => {
          if (!spec) return;
          if (action === 'delete') removeWidget(id);
          else if (action === 'duplicate') { const copy = duplicateWidget(spec, id); onCommand(copy.command); setSelectedId(copy.widget.id); setAddingType(null); }
          else onCommand({ type: 'layout', layout: updateWidgetLayout(spec, id, widgetSizes[spec.widgets.find(widget => widget.id === id)!.type], true) });
        })}
        renderWidget={widget => busy || !execution?.widgetResults[widget.id] ? <article className="widget"><p role="status">{copy[locale].loading}</p></article> : <WidgetCard widget={widget} entry={execution?.widgetResults[widget.id]} catalog={catalog} locale={locale} profile={profile} />} />}
      {!spec && <p className="builder-hint">{t.selectWidget}</p>}
    </div>
    <aside className="builder-properties">{spec && selected && <WidgetLayoutInspector key={`layout-${selected.id}`} spec={spec} id={selected.id} locale={locale} onChange={layout => onCommand({ type: 'layout', layout })} />}{base && (selected || newWidget) ? <WidgetEditor key={selected?.id ?? `${newWidget?.id}-${addingType}`} initial={(selected ?? newWidget)!} adding={!!newWidget} base={base} registry={registry} catalog={catalog} locale={locale} onApply={applyWidget} onPalette={value => { if (selected) onCommand(widgetPaletteCommand(selected, value)); }} onRemove={() => removeWidget()} /> : <p>{t.selectWidget}</p>}
      <div className="builder-filters"><h3>{t.filters}</h3><div className="builder-dates"><label>{t.dateFrom}<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label><label>{t.dateTo}<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} /></label><button disabled={!spec || !dateFrom || !dateTo || dateFrom > dateTo} onClick={applyDates}>{t.applyDates}</button></div>
      {filterDimensions.map(dimension => <label key={dimension}>{copy[locale].dimensions[dimension]}<select value={requestedFilters.find(filter => filter.dimension === dimension)?.values[0] ?? ''} disabled={!spec || !spec.widgets.every(widget => widget.series.every(series => catalog[series.metric]?.dimensions.includes(dimension)))} onChange={event => setRequestedFilter(dimension, event.target.value)}><option value="">{t.all}</option>{(filterOptions[dimension] ?? []).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}
      </div></aside>
  </div>;
}

/** Labels are localized here; the selectable vocabulary belongs to domain. */
export function PaletteSelect({ locale, value, onChange }: {
  locale: Locale; value: GovernedPalette;
  onChange: (palette: GovernedPalette) => void;
}) {
  const names = locale === 'ar'
    ? { default: 'افتراضية', blue: 'أزرق', green: 'أخضر', orange: 'برتقالي', purple: 'بنفسجي', red: 'أحمر', neutral: 'محايدة' }
    : { default: 'Default', blue: 'Blue', green: 'Green', orange: 'Orange', purple: 'Purple', red: 'Red', neutral: 'Neutral' };
  return <label>{locale === 'ar' ? 'لوحة الألوان' : 'Palette'}<select value={value} onChange={event => {
    const palette = governedPalettes.find(palette => palette === event.target.value);
    if (palette) onChange(palette);
  }}>{governedPalettes.map(palette => <option key={palette} value={palette}>{names[palette]}</option>)}</select></label>;
}
