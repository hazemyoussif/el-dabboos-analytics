import {seriesDisplayLabel} from './rendering/shared.ts';
import { ExcelExportButton } from './export/ExcelExportButton.tsx';
import { dashboardWorkbook } from './export/excel-data.ts';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DrillDetails,drillActionLabel } from './DrillDetails.tsx';
import { drillRequestFor } from './drill-context.ts';
import type { ApiSession } from './api/client.ts';
import type { DrillRequest } from '@el-dabboos/domain';
import {DataAvailability} from './rendering/DataAvailability.tsx';
import { SnapshotAsOf } from './rendering/SnapshotAsOf.tsx';
import { successfulMetricMetadata } from './metrics/definition-copy.ts';
import { MetricInfo } from './metrics/MetricDefinition.tsx';
import { TrendingUp, ChartLine, ChartArea, ChartBar, ChartPie, PanelsTopLeft, ChartNoAxesCombined, Table2, AlertCircle } from 'lucide-react';
import { resolveGovernedPalette, withGovernedPalette } from './rendering/chart-theme.ts';
import { useChartTheme } from './presentation/ThemeProvider.tsx';
import { EmptyState, Notice } from './presentation/Feedback.tsx';
import type { DashboardExecutionResult, WidgetExecution } from '@el-dabboos/application';
import { resolveDashboardLayout } from '@el-dabboos/domain';
import type { DashboardSpec, DashboardWidget, GovernedPalette, Locale, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import { copy, formatKey,formatDimensionLabel } from './i18n.ts';
import { AreaContent } from './rendering/AreaContent.tsx';
import { PieContent } from './rendering/PieContent.tsx';
import { TreemapContent } from './rendering/TreemapContent.tsx';
import { ComboContent } from './rendering/ComboContent.tsx';
import { BarContent } from './rendering/BarContent.tsx';
import { KpiContent } from './rendering/KpiContent.tsx';
import { LineContent } from './rendering/LineContent.tsx';
import { TableContent } from './rendering/TableContent.tsx';
import { comparisonKey, formatSeriesValue, valueKey } from './rendering/shared.ts';
import type { ChartRow } from './rendering/shared.ts';

const icons = { kpi: TrendingUp, line: ChartLine, area: ChartArea, bar: ChartBar, pie: ChartPie, treemap: PanelsTopLeft, combo: ChartNoAxesCombined, table: Table2 };
const renderers = { kpi: KpiContent, line: LineContent, area: AreaContent, bar: BarContent, pie: PieContent, treemap: TreemapContent, combo: ComboContent, table: TableContent };

interface Props { execution: DashboardExecutionResult; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }
export function WidgetCard({ widget, dashboardPalette, entry, catalog, locale, profile, boundGuidanceShown=false, exportMetadata, onDrill, canDrill }: { widget: DashboardWidget; dashboardPalette?: GovernedPalette; entry: WidgetExecution | undefined; boundGuidanceShown?:boolean; exportMetadata?: DashboardExecutionResult['metadata']; onDrill?: (seriesId:string,key:string|null,opener?:Element)=>void; canDrill?: (seriesId:string,key:string|null)=>boolean; catalog: Record<string, SemanticMetric>; locale: Locale; profile: TenantProfile }) {
  const t = copy[locale];
  const theme = withGovernedPalette(useChartTheme(), resolveGovernedPalette(widget.presentation?.palette, dashboardPalette));
  const Icon = icons[widget.type];
  const labels = widget.series.map(series => seriesDisplayLabel(series,catalog,locale));
  const title = widget.title?.[locale] ?? (labels.length === 1 ? labels[0]! : labels.join(' · '));
  const subtitle = widget.dimension ? t.dimensions[widget.dimension] : catalog[widget.series[0]!.metric]?.descriptions[locale] ?? '';
  const {messages:failures,showPartial} = widgetFailurePresentation(widget,entry,locale,boundGuidanceShown);
  if (!entry || entry.status === 'error') return <article className="widget widget-error"><WidgetHeading title={title} subtitle={subtitle} widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} error /><Notice tone="danger">{failures.join(' · ') || t.failed}</Notice></article>;
  const dimensionLabels=Object.assign({},...Object.values(entry.seriesResults).map(series=>series.status==='success'?series.result.metadata.dimensionLabels??{}:{})) as Record<string,string>;
  const keyLabel=(key:string|null)=>key!==null&&dimensionLabels[key]?formatDimensionLabel(dimensionLabels[key]!,widget.dimension,locale):formatKey(key,widget.dimension,locale,profile);
  const data: ChartRow[] = entry.alignedRows.map((row,index) => {
    const item: ChartRow = { label: keyLabel(row.key), _row: index };
    for (const series of widget.series) {
      item[valueKey(series.id)] = row.series[series.id]?.value ?? null;
      if (row.series[series.id]?.comparisonValue !== undefined) item[comparisonKey(series.id)] = row.series[series.id]?.comparisonValue ?? null;
    }
    return item;
  });
  const formatSeries = (seriesId: string, value: number | null) => formatSeriesValue(widget, catalog, locale, profile, seriesId, value);
  const hasData = entry.alignedRows.some(row => Object.values(row.series).some(value => value !== null && value.value !== null));
  const props = { exportMetadata, theme, widget, entry, catalog, locale, profile, labels, formatSeries, data, keyLabel, ...(onDrill?{onDrill,canDrill}:{}) };
  const Content = renderers[widget.type];
  const content = !hasData && widget.type!=='kpi' ? <EmptyState>{t.empty}</EmptyState> : <Content {...props} />;
  const summary = widget.type !== 'kpi' && widget.type !== 'table' && <details className="chart-summary"><summary>{locale === 'ar' ? 'عرض قيم الرسم' : 'View chart values'}</summary><TableContent {...props} /></details>;
  const reading = <><WidgetHeading title={title} subtitle={subtitle} widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} Icon={Icon} showDefinitions={widget.type !== 'table'} />{showPartial && <Notice>{t.partial}: {failures.join(' · ')}</Notice>}{content}<DataAvailability entry={entry} locale={locale} profile={profile} /></>;
  return <article className={`widget widget-${widget.type}`}><WidgetReadingLayout widget={widget} locale={locale} onDrill={onDrill} canDrill={canDrill}>{reading}</WidgetReadingLayout>{summary}</article>;
}
export function DashboardRenderer({ execution, catalog, locale, profile, dashboardOverride, session }: Props & { dashboardOverride?: DashboardSpec; session?:ApiSession }) {
  const [selection,setSelection]=useState<DrillRequest|null>(null);
  const drillOpener=useRef<Element|null>(null);
  const spec = dashboardOverride ?? execution.dashboard;
  const layout = resolveDashboardLayout(spec);
  const bounded=Object.values(execution.widgetResults).some(entry=>Object.values(entry.seriesResults).some(series=>series.status==='error'&&series.error.code==='RESULT_LIMIT_EXCEEDED'));
  const filterLabels=Object.assign({},...Object.values(execution.widgetResults).flatMap(entry=>Object.values(entry.seriesResults).flatMap(series=>series.status==='success'?[series.result.metadata.dimensionLabels??{}]:[]))) as Record<string,string>;
  return <><ExcelExportButton locale={locale} kind="dashboard" disabled={!spec.widgets.length} createWorkbook={() => dashboardWorkbook(execution, spec, { catalog, locale, profile })} />{selection&&session&&<DrillDetails opener={drillOpener.current} selection={selection} session={session} profile={profile} filterLabels={filterLabels} onClose={()=>setSelection(null)}/ >}{bounded&&<Notice>{boundGuidance(locale)}</Notice>}<div className="viewer-canvas">{spec.widgets.map(widget => {
    const entry=execution.widgetResults[widget.id];
    if(entry?.status==='error'&&Object.values(entry.seriesResults).every(series=>series.status==='error'&&series.error.code==='RESULT_LIMIT_EXCEEDED'))return null;
    const item = layout.items?.find(candidate => candidate.widgetId === widget.id);
    return <div key={widget.id} className="viewer-item" style={item ? { gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}` } : undefined}>
      <WidgetCard widget={widget} exportMetadata={execution.metadata} dashboardPalette={spec.presentation?.palette} entry={entry} boundGuidanceShown={bounded} {...(session&&entry?{canDrill:(seriesId:string,key:string|null)=>drillRequestFor(execution,widget,entry,seriesId,key)!==null,onDrill:(seriesId:string,key:string|null,opener?:Element)=>{const request=drillRequestFor(execution,widget,entry,seriesId,key);if(request){drillOpener.current=opener??document.activeElement;setSelection(request);}}}:{})} catalog={catalog} locale={locale} profile={profile} />
    </div>;
  })}</div></>;
}

function widgetFailurePresentation(widget:DashboardWidget,entry:WidgetExecution|undefined,locale:Locale,boundGuidanceShown:boolean){
  const messages = widget.series.flatMap(series => {
    const result = entry?.seriesResults[series.id];
    if(result?.status!=='error')return [];
    if(result.error.code==='RESULT_LIMIT_EXCEEDED')return boundGuidanceShown?[]:[boundGuidance(locale)];
    return [/SQL|Unsafe.*result|NaN|Infinity/.test(result.error.message)||result.error.message==='This metric is temporarily unavailable.'?copy[locale].failed:result.error.message];
  });
  return {messages:[...new Set(messages)],showPartial:entry?.status==='partial'&&(!boundGuidanceShown||messages.length>0)};
}

function boundGuidance(locale:Locale){return locale==='ar'?'اختر عملاء أو قلّص الفترة لعرض هذا التقرير.':'Choose customers or narrow the dates to view this report.';}

function WidgetMetricDefinitions({widget,catalog,locale,profile,entry}: {widget: DashboardWidget; catalog: Record<string,SemanticMetric>; locale: Locale; profile: TenantProfile; entry: WidgetExecution | undefined}) {
 return <div>{widget.series.map(series => {
  const metric = catalog[series.metric];
  return metric && <span key={series.id}>{widget.series.length > 1 && metric.labels[locale]}<MetricInfo metric={metric} locale={locale} currency={profile.reportingCurrency} metadata={successfulMetricMetadata(entry?.seriesResults[series.id])} /></span>;
 })}</div>;
}

function WidgetMetricInfo({series,catalog,locale,profile,entry}: {series: DashboardWidget['series'][number]; catalog: Record<string,SemanticMetric>; locale: Locale; profile: TenantProfile; entry: WidgetExecution | undefined}) {
  const metric = catalog[series.metric];
  return metric ? <MetricInfo metric={metric} locale={locale} currency={profile.reportingCurrency} metadata={successfulMetricMetadata(entry?.seriesResults[series.id])} /> : null;
}

function WidgetTitle({title,widget,catalog,locale,profile,entry}: {title: string; widget: DashboardWidget; catalog: Record<string,SemanticMetric>; locale: Locale; profile: TenantProfile; entry: WidgetExecution | undefined}) {
  const series = widget.series.length === 1 ? widget.series[0] : undefined;
  return <h3>{title}{series && <WidgetMetricInfo series={series} catalog={catalog} locale={locale} profile={profile} entry={entry} />}</h3>;
}

function hasMultipleMetrics(widget: DashboardWidget) { return widget.series.length > 1; }

function WidgetHeading({title,subtitle,widget,catalog,locale,profile,entry,Icon,error = false,showDefinitions = true}: {title: string; subtitle: string; widget: DashboardWidget; catalog: Record<string,SemanticMetric>; locale: Locale; profile: TenantProfile; entry: WidgetExecution | undefined; Icon?: typeof AlertCircle; error?: boolean; showDefinitions?: boolean}) {
  const definitions = showDefinitions && hasMultipleMetrics(widget) && <WidgetMetricDefinitions widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} />;
  if (error) return <div className="widget-heading"><WidgetTitle title={title} widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} />{definitions}<AlertCircle aria-hidden="true" /></div>;
  return <div className="widget-heading"><div><WidgetTitle title={title} widget={widget} catalog={catalog} locale={locale} profile={profile} entry={entry} /><p>{subtitle}</p><SnapshotAsOf entry={entry} locale={locale} profile={profile} />{definitions}</div>{Icon && <span className="widget-icon"><Icon aria-hidden="true" /></span>}</div>;
}

function WidgetReadingLayout({widget,locale,onDrill,canDrill,children}:{widget:DashboardWidget;locale:Locale;onDrill:((seriesId:string,key:string|null,opener?:Element)=>void)|undefined;canDrill:((seriesId:string,key:string|null)=>boolean)|undefined;children:ReactNode}) {
  if(widget.type!=='kpi')return children;
  const series=widget.series[0]!;
  return <><div className="kpi-reading">{children}</div>{onDrill&&canDrill?.(series.id,null)&&<footer className="kpi-actions"><button type="button" className="drill-action" onClick={()=>onDrill(series.id,null)}>{drillActionLabel(locale)}</button></footer>}</>;
}
