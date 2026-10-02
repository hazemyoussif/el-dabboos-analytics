import { DashboardLibraryService, AuthorizedAnalyticsService, AuthorizationError, DefaultAuthorizationPolicy, DemoIdentityProvider, DashboardExecutor, InMemoryAuditSink, MockDashboardPlanner, SavedDashboardService, analyticsContext, dashboardTemplates } from '@el-dabboos/application';
import { getTenantProfile, validateDashboardSpec } from '@el-dabboos/domain';
import type { AnalyticsRepository, AuditAction, AuditSink, AuthorizationPolicy, DashboardPlanner, DashboardLibraryRepository, DashboardRepository, DashboardSpec, DemoIdentityDirectory, DimensionValueRepository, IdentityProvider, Locale, Permission, RequestContext, TenantProfile } from '@el-dabboos/domain';
import { ApiError } from './errors.ts';

export interface ApiDependencies {
  analyticsRepository: AnalyticsRepository;
  dimensionValues: DimensionValueRepository;
  libraryRepository?: DashboardLibraryRepository;
  dashboardRepository?: DashboardRepository;
  planner?: DashboardPlanner | null;
  identityProvider?: IdentityProvider;
  demoDirectory?: DemoIdentityDirectory;
  authorizationPolicy?: AuthorizationPolicy;
  auditSink?: AuditSink;
  clock?: () => Date;
  executionConcurrency?: number;
  readiness?: { persistence: () => Promise<boolean>; analytics?: () => Promise<boolean> };
}
export interface RouteContext {
  deps: ApiDependencies;
  clock: () => Date;
  planner: DashboardPlanner | null;
  library: DashboardLibraryService | null;
  savedDashboards: SavedDashboardService | null;
  executor: DashboardExecutor;
  analytics: AuthorizedAnalyticsService;
  directory: DemoIdentityDirectory;
  userId(headers: Record<string, unknown>): string;
  session(headers: Record<string, unknown>): { context: RequestContext; profile: TenantProfile };
  authorize(context: RequestContext, ...permissions: Permission[]): void;
  ensureDashboard(spec: unknown, context: RequestContext): DashboardSpec;
  checked<T>(context: RequestContext, action: AuditAction, operation: () => Promise<T>, dashboardId?: string): Promise<T>;
  templateAllowed(template: (typeof dashboardTemplates)[number], context: RequestContext): boolean;
}
export function createRouteContext(deps: ApiDependencies): RouteContext {
  const clock = deps.clock ?? (() => new Date());
  const planner = deps.planner === undefined ? new MockDashboardPlanner(clock) : deps.planner;
  const demoIdentity = new DemoIdentityProvider();
  const identity = deps.identityProvider ?? demoIdentity;
  const directory = deps.demoDirectory ?? demoIdentity;
  const policy = deps.authorizationPolicy ?? new DefaultAuthorizationPolicy();
  const audit = deps.auditSink ?? new InMemoryAuditSink();
  const executor = new DashboardExecutor(deps.analyticsRepository, clock, deps.executionConcurrency === undefined ? {} : { maxConcurrency: deps.executionConcurrency });
  const analytics = new AuthorizedAnalyticsService(deps.analyticsRepository, policy);
  const savedDashboards = deps.dashboardRepository ? new SavedDashboardService(deps.dashboardRepository, policy, clock) : null;
  const library = deps.libraryRepository && savedDashboards ? new DashboardLibraryService(deps.libraryRepository, savedDashboards, clock) : null;
  const userId = (headers: Record<string, unknown>) => {
    const value = headers['x-demo-user-id'];
    if (typeof value !== 'string' || !value) throw new ApiError(401, 'DEMO_USER_REQUIRED', 'A controlled demo user header is required.');
    if (!directory.listUsers().some(user => user.id === value)) throw new ApiError(401, 'UNKNOWN_USER', 'Unknown demo user.');
    return value;
  };
  const session = (headers: Record<string, unknown>): { context: RequestContext; profile: TenantProfile } => {
    const user = userId(headers);
    const tenant = headers['x-tenant-id'];
    if (typeof tenant !== 'string' || !tenant) throw new ApiError(401, 'TENANT_REQUIRED', 'A controlled demo tenant header is required.');
    const profile = getTenantProfile(tenant);
    if (!profile) throw new ApiError(403, 'TENANT_FORBIDDEN', 'Unknown demo tenant.');
    const locale = headers['x-locale'] ?? profile.defaultLocale;
    if (locale !== 'en' && locale !== 'ar') throw new ApiError(400, 'INVALID_LOCALE', 'Locale must be en or ar.');
    return { context: identity.resolve(user, tenant, locale as Locale), profile };
  };
  const authorize = (context: RequestContext, ...permissions: Permission[]) => permissions.forEach(permission => policy.authorize(permission, context));
  const ensureDashboard = (spec: unknown, context: RequestContext): DashboardSpec => {
    validateDashboardSpec(spec);
    policy.authorizeDashboard(spec, context);
    return spec;
  };
  const record = (context: RequestContext, action: AuditAction, result: 'allowed' | 'denied' | 'error', dashboardId?: string) =>
    audit.record({ tenantId: context.tenant.tenantId, userId: context.principal.userId, membershipId: context.principal.membershipId,
      action, timestamp: clock().toISOString(), result, ...(dashboardId ? { dashboardId } : {}) });
  const checked = async <T>(context: RequestContext, action: AuditAction, operation: () => Promise<T>, dashboardId?: string): Promise<T> => {
    try { const output = await operation(); record(context, action, 'allowed', dashboardId); return output; }
    catch (error) { record(context, action, error instanceof AuthorizationError ? 'denied' : 'error', dashboardId); throw error; }
  };
  const templateAllowed = (template: (typeof dashboardTemplates)[number], context: RequestContext): boolean => {
    try { policy.authorizeDashboard({ schemaVersion: 2, id: template.id, title: template.name, locale: context.locale,
      filters: {}, layout: template.layout, widgets: template.widgets }, context); return true; }
    catch (error) { if (error instanceof AuthorizationError) return false; throw error; }
  };
  return { library, deps, clock, planner, savedDashboards, executor, analytics, directory, userId, session, authorize, ensureDashboard, checked, templateAllowed };
}
export { analyticsContext };
