import { publishedQueryIssues, validateQuery } from '@el-dabboos/domain';
import type { AnalyticsQuery, AuthorizationPolicy, PublishedAnalyticsCapabilities, RequestContext } from '@el-dabboos/domain';
import { analyticsContext, AuthorizationError } from './security.ts';
import { resolveAnalyticsIntent } from './analytics-intent.ts';
import type { AnalyticsIntent } from './analytics-intent.ts';

export type AnalyticsCapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED_CAPABILITY' | 'DATA_NOT_READY' | 'UNAUTHORIZED' | 'INVALID_PLAN';
export type AnalyticsCapabilityResolution = { status: 'SUPPORTED'; queries: AnalyticsQuery[][] }
  | { status: Exclude<AnalyticsCapabilityStatus,'SUPPORTED'>; issues: string[] };
export interface AnalyticsResolutionScope { timeZone: string; now: Date; published: PublishedAnalyticsCapabilities }
/** Every query and enforced scope passes preflight before any execution starts. */
export function resolveAnalyticsCapabilities(intent: AnalyticsIntent, context: RequestContext, policy: AuthorizationPolicy, scope: AnalyticsResolutionScope): AnalyticsCapabilityResolution {
  let queries: AnalyticsQuery[][];
  try { const defaultPeriod = scope.published.mode === 'certified' ? scope.published.releases[0]?.period : undefined; queries = resolveAnalyticsIntent(intent, { ...scope, ...(defaultPeriod ? {defaultPeriod} : {}) }); }
  catch { return { status: 'INVALID_PLAN', issues: ['schema_or_selection'] }; }
  try {
    if (scope.published.tenantId !== context.tenant.tenantId || !context.principal.membershipId || !context.principal.userId) throw new AuthorizationError('TENANT_FORBIDDEN','Invalid analytics workspace');
    policy.authorize('analytics:query',context);
    for (const query of queries.flat()) policy.authorizeMetric(query.metric,context);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    return { status: 'UNAUTHORIZED', issues: ['authorization'] };
  }
  for (const query of queries.flat()) {
    const scoped = { ...query, filters: [...(query.filters ?? []), ...context.authorization.enforcedFilters] };
    try { validateQuery(scoped,analyticsContext(context)); }
    catch { return { status: 'UNSUPPORTED_CAPABILITY', issues: ['semantic_query'] }; }
    const issues = publishedQueryIssues(scoped,scope.published);
    if (issues.length) return { status: issues.some(issue => issue.startsWith('metric:') || issue.startsWith('period:')) ? 'DATA_NOT_READY' : 'UNSUPPORTED_CAPABILITY', issues };
  }
  return { status: 'SUPPORTED', queries };
}
