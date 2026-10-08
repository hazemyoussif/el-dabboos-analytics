import { analyticsCapabilityContext } from './analytics-capability-context.ts';
import { semanticCatalog, widgetTypes, governedPalettes } from '@el-dabboos/domain';
import type { PlannerCapabilities, TenantProfile } from '@el-dabboos/domain';
import { dashboardTemplates } from './templates.ts';

function marketContext(profile: TenantProfile, clock: () => Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: profile.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(clock());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return { tenantId: profile.id, countryCode: profile.countryCode, defaultLocale: profile.defaultLocale,
    arabicDialect: profile.arabicDialect, reportingCurrency: profile.reportingCurrency, timeZone: profile.timeZone, today };
}
export function dashboardPlannerContext(capabilities: PlannerCapabilities, profile: TenantProfile, clock: () => Date) {
  const allowed = new Set(capabilities.metricIds);
  const metrics = Object.values(semanticCatalog).filter(metric => allowed.has(metric.id)).map(metric => ({
    id: metric.id, labels: metric.labels, descriptions: metric.descriptions, type: metric.type,
    semantics: metric.semantics, dimensions: capabilities.published ? [...new Set(capabilities.published.releases.flatMap(release => release.capabilities.filter(capability => capability.metric===metric.id).flatMap(capability => capability.dimensions)))] : metric.dimensions, unit: metric.presentation.unit, synonyms: metric.synonyms, dateBasis: metric.help.dateBasis,
  }));
  const templates = dashboardTemplates.filter(template => capabilities.templateIds.includes(template.id) &&
    template.widgets.every(widget => widget.series.every(series => allowed.has(series.metric)))).map(template => ({
    id: template.id, name: template.name, description: template.description, domain: template.domain,
    tags: template.tags, datePreset: template.datePreset,
  }));
  return { market: marketContext(profile, clock), preferredMetrics: profile.preferredMetrics ?? {}, metrics, templates,publishedCapabilities: capabilities.published ? analyticsCapabilityContext(capabilities.published,capabilities.metricIds) : undefined, actions: capabilities.actions,
    visualizations: { types: widgetTypes, governedPalettes, rules: [
      'KPI: one series, no dimension. Line: shared dimension, matching type/unit. Area: ordered date/month/quarter/year, compatible series, no stacking.',
      'Bar: grouped compatible series. orientation vertical or horizontal. No stacking.',
      'Pie and Treemap: exactly one additive or appropriate snapshot series, non-time categorical grouping; no ratio, duration, comparison, moving average, running total or percentage contribution. Pie variant pie or donut.',
      'Combo: two to four same-unit/type series with a common dimension and one axis; code determines how each series is drawn during generation.',
      'Table: shared grouping, mixed units allowed.',
      'Visualization edits preserve metrics, filters, analysis and layout unless explicitly requested. Reject semantically incompatible conversions. Never generate chart-library properties.'
    ] } };
}

/** Direct questions consume only semantics; presentation metadata remains a dashboard concern. */
export function analyticsPlannerContext(capabilities:PlannerCapabilities,profile:TenantProfile,clock:()=>Date) {
  const {templates,visualizations,...context} = dashboardPlannerContext(capabilities,profile,clock);
  void templates;void visualizations;
  return context;
}
