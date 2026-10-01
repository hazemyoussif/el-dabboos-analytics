import type { DashboardWidget, SemanticMetric } from './contracts.ts';
import { semanticCatalog, timeDimensions } from './catalog.ts';

/** Visualization intent only; no browser or renderer configuration. */
export function visualizationIssues(widget: DashboardWidget, catalog: Record<string, SemanticMetric> = semanticCatalog): string[] {
  const issues: string[] = [];
  const { type, dimension, series, presentation = {} } = widget;
  const time = dimension !== undefined && timeDimensions.includes(dimension);
  if (type === 'kpi' && (series.length !== 1 || dimension !== undefined)) issues.push('KPI requires one series and no dimension');
  if (type !== 'kpi' && !dimension) issues.push('Visualization requires grouping');
  if (type === 'area' && !time) issues.push('Area requires an ordered time dimension');
  if (type === 'combo' && (series.length < 2 || series.length > 4)) issues.push('Combo requires two to four series');
  if (type === 'pie' || type === 'treemap') {
    if (series.length !== 1 || !dimension || time) issues.push('Composition requires one series and a categorical dimension');
    for (const item of series) {
      const metric = catalog[item.metric];
      const analysis = item.analysis;
      if (!metric || !['additive', 'snapshot'].includes(metric.semantics.kind) || metric.type === 'duration' || metric.type === 'percentage' ||
        analysis?.comparison || analysis?.movingAverage || analysis?.runningTotal || analysis?.percentageContribution)
        issues.push('Composition requires additive or snapshot values without derived analysis');
    }
  }
  if (['line', 'area', 'bar', 'combo'].includes(type)) {
    const units = series.map(item => item.analysis?.percentageContribution ? 'percentage:%' : `${catalog[item.metric]?.type}:${catalog[item.metric]?.presentation.unit ?? ''}`);
    if (new Set(units).size > 1) issues.push('Single axis requires matching metric type and unit');
  }
  if (presentation.orientation !== undefined && type !== 'bar') issues.push('Orientation is only supported for Bar');
  if (presentation.pieVariant !== undefined && type !== 'pie') issues.push('Pie variant is only supported for Pie');
  if (presentation.curve !== undefined && !['line', 'area', 'combo'].includes(type)) issues.push('Curve is only supported for trends');
  if (presentation.dataLabels !== undefined && !['pie', 'treemap'].includes(type)) issues.push('Data labels are only supported for composition');
  if (presentation.legend !== undefined && ['kpi', 'table'].includes(type)) issues.push('Legend is only supported for charts');
  if (series.some(item => item.presentation !== undefined && type !== 'combo')) issues.push('Series marks are only supported for Combo');
  return issues;
}
