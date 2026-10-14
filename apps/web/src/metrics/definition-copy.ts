import type { SeriesExecution } from '@el-dabboos/application';
import type { AnalyticsResult, Locale, SemanticMetric,AnalysisSpec } from '@el-dabboos/domain';
import { analysisHelp } from './analysis-help.ts';
export const definitionCopy = {
 en: { info: 'Metric definition', close: 'Close', formula: 'Formula', includes: 'Included', excludes: 'Excluded', date: 'Reporting date basis', unit: 'Currency / unit', type: 'Metric type', aggregation: 'Aggregation', credits: 'Refunds / credits', dimensions: 'Supported dimensions', version: 'Definition version', period: 'Reporting period / cutoff', asOf: 'Source as of', technical: 'Technical details', certified: 'Certified',reconciled:'Exactly reconciled snapshot · approved Finance definition', review: 'Finance review pending', demo: 'Demo data', copy: 'Copy definition', copied: 'Definition copied', failed: 'Could not copy definition', event: 'Event', snapshot: 'Snapshot', derived: 'Derived' },
 ar: { info: 'تعريف المؤشر', close: 'إغلاق', formula: 'طريقة الحساب', includes: 'ما يشمله', excludes: 'ما يستبعده', date: 'أساس تاريخ التقرير', unit: 'العملة / الوحدة', type: 'نوع المؤشر', aggregation: 'سلوك التجميع', credits: 'الإشعارات الدائنة / الأرصدة الدائنة', dimensions: 'الأبعاد المدعومة', version: 'نسخة التعريف', period: 'فترة التقرير / تاريخ القطع', asOf: 'تاريخ المصدر', technical: 'تفاصيل فنية', certified: 'معتمد',reconciled:'رصيد مطابق بدقة · تعريف مالي معتمد', review: 'بانتظار مراجعة المالية', demo: 'بيانات تجريبية', copy: 'نسخ التعريف', copied: 'تم نسخ التعريف', failed: 'تعذر نسخ التعريف', event: 'حدث', snapshot: 'رصيد عند القطع', derived: 'مشتق' },
};
export function metricDefinitionText(metric: SemanticMetric, locale: Locale, status: string,analysis?:AnalysisSpec) {
 const text = definitionCopy[locale];
 return [metric.labels[locale], metric.help.definition[locale], `${text.formula}: ${metric.help.formula[locale]}`, `${text.date}: ${metric.help.dateBasis[locale]}`, `${text.aggregation}: ${metric.help.aggregationBehavior[locale]}`, `${text.version}: ${metric.help.definitionVersion}`, ...analysisHelp(analysis,locale).map(([label,value])=>`${label}: ${value}`),status].join('\n');
}
export function definitionStatus(metadata: AnalyticsResult['metadata'] | undefined, locale: Locale) {
 const text = definitionCopy[locale];
 if(metadata?.release?.financeReview==='pending')return text.review;
 if(metadata?.reconciliation?.status==='exact')return text.reconciled;
 return metadata?.release ? text.certified : metadata?.sourceId.startsWith('mock') || metadata?.sourceId === 'sqlite' ? text.demo : text.review;
}
/** Native modal containment/Escape; explicit focus restoration also covers React unmount. */
export function openDefinitionDialog(dialog: HTMLDialogElement, trigger: HTMLElement | null) {
 dialog.showModal();
 dialog.querySelector<HTMLButtonElement>('button')?.focus();
 return () => { dialog.close(); trigger?.focus(); };
}

export function successfulMetricMetadata(result: SeriesExecution | undefined) { return result?.status === 'success' ? result.result.metadata : undefined; }
