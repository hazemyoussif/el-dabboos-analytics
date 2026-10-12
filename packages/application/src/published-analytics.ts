import { publishedQueryIssues,semanticCatalog } from '@el-dabboos/domain';
import type { AnalyticsQuery,DashboardSpec,PublishedAnalyticsCapabilities,RequestContext,SemanticMetric } from '@el-dabboos/domain';
import { authorizedCatalog,AuthorizationError } from './security.ts';
import type { DashboardTemplate } from './templates.ts';
import { supportedTemplatePeriod } from './management-templates.ts';
import { resolveDashboardFilters,validateDashboardOverrideDimensions } from './dashboard-filters.ts';

export function publishedCatalog(context: RequestContext,published: PublishedAnalyticsCapabilities) {
  if (context.tenant.tenantId!==published.tenantId) throw new AuthorizationError('TENANT_FORBIDDEN','Published capabilities belong to another workspace.');
  const catalog = authorizedCatalog(context);
  const metrics: SemanticMetric[] = catalog.metrics.flatMap(metric => {
    const capabilities = published.releases.flatMap(release => release.capabilities.filter(capability => capability.metric===metric.id));
    if (!capabilities.length) return [];
    if (!(context.authorization.enforcedFilters ?? []).every(filter => capabilities.some(capability => capability.dimensions.includes(filter.dimension)))) return [];
    return [{ ...metric,dimensions: [...new Set(capabilities.flatMap(capability => capability.dimensions))] }];
  });
  const metricIds = metrics.map(metric => metric.id);
  return { metrics,metricIds,registry: catalog.registry.filter(metric => metric.availability==='planned' || metricIds.includes(metric.id)),published: { ...published,releases: published.releases.map(release => ({ ...release,capabilities: release.capabilities.filter(capability => metricIds.includes(capability.metric)) })) } };
}
/** Requirements derive from canonical series, so they cannot drift from the template or contain source fields. */
export function templateRequirements(template: DashboardTemplate) {
  return template.widgets.flatMap(widget => widget.series.map(series => ({ metric: series.metric,...(widget.dimension ? { groupBy: widget.dimension } : {}),...(series.analysis ? { analysis: series.analysis } : {}),semantics: semanticCatalog[series.metric].semantics.kind })));
}
export function templateCompatibility(template: DashboardTemplate,published: PublishedAnalyticsCapabilities) {
  const requirements = templateRequirements(template);
  const checks = requirements.map(requirement => {
    const attempts = published.releases.map(release => publishedQueryIssues({ ...requirement,...(release.period ? { dateRange: release.period } : {}) },{ ...published,releases: [release] }));
    return attempts.find(issues => !issues.length) ?? attempts[0] ?? [`metric:${requirement.metric}`];
  });
  const supported = checks.filter(issues => !issues.length).length;
  if(published.mode==='certified' && template.periodStrategy==='certified' && supported===checks.length && !supportedTemplatePeriod(template,published))return {status:'unsupported' as const,missing:['period:shared-coverage'],requirements};
  return { status: supported===checks.length ? 'supported' as const : supported ? 'partially_supported' as const : 'unsupported' as const,
    missing: [...new Set(checks.flat())],requirements };
}
export function assertPublishedQuery(query: AnalyticsQuery,published: PublishedAnalyticsCapabilities): void {
  const issues = publishedQueryIssues(query,published);
  if (issues.length) throw new AuthorizationError('CAPABILITY_UNAVAILABLE',`This workspace does not publish the requested analytics capabilities: ${issues.join(', ')}.`);
}
export function assertPublishedDashboard(spec: DashboardSpec,published: PublishedAnalyticsCapabilities,timeZone: string,now: Date,overrides?: import('./dashboard-filters.ts').DashboardFilterOverrides): void {
  validateDashboardOverrideDimensions(spec,overrides);
  const filters = resolveDashboardFilters(spec.filters,{ timeZone,...(overrides ? { overrides } : {}) },now);
  for (const widget of spec.widgets) for (const series of widget.series) assertPublishedQuery({ metric: series.metric,...(widget.dimension ? { groupBy: widget.dimension } : {}),...(series.analysis ? { analysis: series.analysis } : {}),...(filters.dateRange ? { dateRange: filters.dateRange } : {}),...(filters.dimensions ? { filters: filters.dimensions } : {}) },published);
}
