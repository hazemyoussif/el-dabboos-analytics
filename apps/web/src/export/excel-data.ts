import {seriesDisplayLabel} from '../rendering/shared.ts';
import type { DashboardExecutionResult, WidgetExecution } from '@el-dabboos/application';
import type { DashboardSpec, DashboardWidget, Locale, SemanticMetric, TenantProfile } from '@el-dabboos/domain';
import type { SheetData } from 'write-excel-file/universal';
import { copy, formatDimensionLabel, formatKey } from '../i18n.ts';

export interface ExportContext {
  catalog: Record<string, SemanticMetric>;
  locale: Locale;
  profile: TenantProfile;
  exportMetadata?: DashboardExecutionResult['metadata'];
}
export interface ExcelWorkbook { sheets: string[]; data: SheetData[]; fileName: string; rightToLeft: boolean }
export const exportCopy = {
  en: { table: 'Export table to Excel', dashboard: 'Export dashboard to Excel', busy: 'Exporting…', failed: 'Excel export failed. Please try again.', status: 'Data status', success: 'Available', partial: 'Partial', error: 'Unavailable', empty: 'No rows', allTime: 'All time', asOf: 'As of', comparison: 'Comparison', percentChange: 'Change (%)', filters: 'Filters', executed: 'Executed at', currency: 'Currency' },
  ar: { table: 'تصدير الجدول إلى Excel', dashboard: 'تصدير اللوحة إلى Excel', busy: 'جارٍ التصدير…', failed: 'تعذر التصدير إلى Excel. حاول مرة أخرى.', status: 'حالة البيانات', success: 'متاح', partial: 'جزئي', error: 'غير متاح', empty: 'لا توجد صفوف', allTime: 'كل الفترات', asOf: 'كما في', comparison: 'المقارنة', percentChange: 'التغير (%)', filters: 'الفلاتر', executed: 'وقت التنفيذ', currency: 'العملة' },
} as const;

export function widgetExportTitle(widget: DashboardWidget, context: ExportContext): string {
  return widget.title?.[context.locale] ?? widget.series.map(series => context.catalog[series.metric]?.labels[context.locale] ?? series.metric).join(' · ');
}
function exportKey(key: string | null, widget: DashboardWidget, entry: WidgetExecution | undefined, context: ExportContext): string {
  const label = Object.values(entry?.seriesResults ?? {}).flatMap(series => series.status === 'success' && key !== null && series.result.metadata.dimensionLabels?.[key] ? [series.result.metadata.dimensionLabels[key]!] : [])[0];
  return label ? formatDimensionLabel(label, widget.dimension, context.locale) : formatKey(key, widget.dimension, context.locale, context.profile);
}
function contextRows(context: ExportContext): SheetData {
  const text = exportCopy[context.locale];
  const filters = context.exportMetadata?.effectiveFilters;
  return [
    [copy[context.locale].workspace, context.profile.labels[context.locale]],
    [text.currency, context.profile.reportingCurrency],
    [text.executed, context.exportMetadata?.executedAt ?? ''],
    [copy[context.locale].period, filters?.dateRange ? `${filters.dateRange.from} — ${filters.dateRange.to}` : text.allTime],
    ...(filters?.dimensions ?? []).map(filter => [copy[context.locale].dimensions[filter.dimension], filter.values.join(' · ')]),
  ];
}
function seriesColumns(widget: DashboardWidget, entry: WidgetExecution | undefined, context: ExportContext) {
  const text = exportCopy[context.locale];
  return widget.series.flatMap(series => {
    const metric = context.catalog[series.metric];
    const label = seriesDisplayLabel(series,context.catalog,context.locale);
    const result = entry?.seriesResults[series.id];
    const metricType = result?.status === 'success' ? result.result.metadata.metricType : series.analysis?.percentageContribution ? 'percentage' : metric?.type;
    const unit = metricType === 'currency' ? context.profile.reportingCurrency : metricType === 'percentage' ? '%' : metricType==='date'?undefined:metric?.presentation.unit;
    const fields = [{ key: 'value' as const, label: unit ? `${label} (${unit})` : label }];
    const extras = [{ key: 'comparisonValue' as const, label: text.comparison }, { key: 'absoluteChange' as const, label: copy[context.locale].change }, { key: 'percentageChange' as const, label: text.percentChange }, { key: 'rank' as const, label: copy[context.locale].rank }];
    return [...fields, ...extras.filter(field => entry?.alignedRows.some(row => row.series[series.id]?.[field.key] !== undefined))].map(field => ({ seriesId: series.id, ...field, label: field.key === 'value' ? field.label : `${label} · ${field.label}` }));
  });
}
export function widgetExportData(widget: DashboardWidget, entry: WidgetExecution | undefined, context: ExportContext): SheetData {
  const text = exportCopy[context.locale];
  const columns = seriesColumns(widget, entry, context);
  const evidence = widget.series.flatMap(series => {
    const result = entry?.seriesResults[series.id];
    const label = context.catalog[series.metric]?.labels[context.locale] ?? series.metric;
    if (result?.status !== 'success') return [[label, text.error]];
    const metadata = result.result.metadata;
    return [[label, metadata.availability?.state === 'DATA_NOT_READY' ? text.error : metadata.availability ? text.partial : text.success], ...(metadata.snapshotAsOf ? [[`${label} · ${text.asOf}`, metadata.snapshotAsOf]] : []), ...(metadata.sourceConsistency==='api_observed'?[[label,context.locale==='ar'?'استيراد عبر واجهة أودو؛ قد تتغير السجلات بين الطلبات.':'Odoo API import; records may change between requests.']]:[])];
  });
  return [
    [widgetExportTitle(widget, context)], ...contextRows(context),
    [text.status, text[entry?.status ?? 'error']], ...evidence, [],
    [widget.dimension ? copy[context.locale].dimensions[widget.dimension] : copy[context.locale].results, ...columns.map(column => column.label)],
    ...(entry?.alignedRows ?? []).map(row => [exportKey(row.key, widget, entry, context), ...columns.map(column => exportCell(row.series[column.seriesId]?.[column.key] ?? null,column,widget,context))]),
    ...(!entry?.alignedRows.length ? [[text.empty]] : []),
  ];
}
function workbook(widgets: DashboardWidget[], results: Record<string, WidgetExecution>, context: ExportContext, title: string): ExcelWorkbook {
  return {
    sheets: widgets.map((widget, index) => `${index + 1} ${widgetExportTitle(widget, context)}`.replace(/[\\/:?*[\]']/g, ' ').replace(/\p{Cc}/gu, ' ').slice(0, 31).trim()),
    data: widgets.map(widget => widgetExportData(widget, results[widget.id], context)),
    fileName: `${title.replace(/[\\/:?*<>|"]/g, ' ').replace(/\p{Cc}/gu, ' ').trim().slice(0, 100) || 'dashboard'}.xlsx`,
    rightToLeft: context.locale === 'ar',
  };
}
export function tableWorkbook(widget: DashboardWidget, entry: WidgetExecution, context: ExportContext): ExcelWorkbook {
  return workbook([widget], { [widget.id]: entry }, context, widgetExportTitle(widget, context));
}
export function dashboardWorkbook(execution: DashboardExecutionResult, dashboard: DashboardSpec, context: ExportContext): ExcelWorkbook {
  const exportContext = { ...context, exportMetadata: execution.metadata };
  const title = dashboard.title[context.locale];
  const result = workbook(dashboard.widgets, execution.widgetResults, exportContext, title);
  return {
    ...result,
    sheets: [title.replace(/[\\/:?*[\]']/g, ' ').replace(/\p{Cc}/gu, ' ').slice(0, 31).trim() || 'Dashboard'],
    data: [[[title], ...result.data.flatMap(section => [...section, [], []])]],
  };
}

function exportCell(value:number|null,column:{seriesId:string;key:string},widget:DashboardWidget,context:ExportContext){
 const metric=widget.series.find(series=>series.id===column.seriesId)?.metric;
 return value!==null&&column.key==='value'&&metric&&context.catalog[metric]?.type==='date'?new Date(value*86400000).toISOString().slice(0,10):value;
}
