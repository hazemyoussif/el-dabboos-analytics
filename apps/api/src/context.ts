import { createAdministration, GovernedSavedDashboardService, resolveTenantAccess } from '@el-dabboos/application';
import type { AdministrationActor } from '@el-dabboos/application';
import type { AdministrationUnitOfWork, AccessDirectory, TenantProfileProvider } from '@el-dabboos/domain';
import { DashboardLibraryService, AuthorizedAnalyticsService, AuthorizationError, DefaultAuthorizationPolicy, DemoIdentityProvider, DashboardExecutor, InMemoryAuditSink, MockDashboardPlanner, SavedDashboardService, analyticsContext, dashboardTemplates } from '@el-dabboos/application';
import { getTenantProfile, validateDashboardSpec } from '@el-dabboos/domain';
import type { AnalyticsRepository, AuditAction, AuditSink, AuthorizationPolicy, DashboardPlanner, DashboardLibraryRepository, DashboardRepository, DashboardSpec, DemoIdentityDirectory, DimensionValueRepository, IdentityProvider, Locale, Permission, RequestContext, TenantProfile } from '@el-dabboos/domain';
import { ApiError } from './errors.ts';

export interface ApiDependencies {
  customerProductCoverage?: import('@el-dabboos/domain').CustomerProductCoverageRepository;
  workspaceAi?: (tenantId: string) => Promise<{ planner: DashboardPlanner; analystPlanner: import('@el-dabboos/application').StructuredAnalyticsPlanner; analystSynthesis?: import('@el-dabboos/domain').LLMProvider } | null>;
  workspaceAiAdministration?: import('./workspace-ai/models.ts').WorkspaceAiAdministration;
  analystRepository?: import('@el-dabboos/domain').AnalystConversationRepository;
  analystPlanner?: import('@el-dabboos/application').StructuredAnalyticsPlanner;
  analystSynthesis?: import('@el-dabboos/domain').LLMProvider;
  drillThroughRepository?: import('@el-dabboos/domain').DrillThroughRepository;
  operationalCommands?: { availability?(tenantId:string):import('@el-dabboos/domain').AnalyticsSourceAvailability;run(request: import('@el-dabboos/domain').AnalyticsJobRequest): Promise<import('@el-dabboos/domain').AnalyticsOperationResult> };
  operationalStatus?: import('@el-dabboos/domain').OperationalStatusProvider;
  administration?: { unitOfWork: AdministrationUnitOfWork; directory: AccessDirectory; profiles: TenantProfileProvider;
    /** Explicit synthetic adapter or configured trusted IdP boundary; headers never directly become binding IDs. */
    authenticate: (headers: Record<string, unknown>) => Promise<string>;
    principals?: () => Promise<readonly { id: string; displayName: string }[]>;
    dataReady: (tenantId: string) => Promise<boolean>;
    provisionEmployee?: (actorIdentityId:string,input:{displayName:string;preferredLocale:'en'|'ar';email:string;password:string}) => Promise<unknown>;
    provisionWorkspaceEmployee?: (actor:AdministrationActor,input:import('@el-dabboos/application').WorkspaceUserInput&{password:string}) => Promise<unknown> };
  analyticsRepository: AnalyticsRepository;
  publishedCapabilities?: import('@el-dabboos/domain').PublishedCapabilityProvider;
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
  savedDashboards: SavedDashboardService | GovernedSavedDashboardService | null;
  administration: ReturnType<typeof createAdministration> | null;
  identityId(headers: Record<string, unknown>): Promise<string>;
  requireData(tenantId: string): Promise<void>;
  executor: DashboardExecutor;
  analytics: AuthorizedAnalyticsService;
  directory: DemoIdentityDirectory;
  userId(headers: Record<string, unknown>): string;
  session(headers: Record<string, unknown>): Promise<{ context: RequestContext; profile: TenantProfile }>;
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
  const executor = new DashboardExecutor(deps.analyticsRepository, clock, {
    ...(deps.executionConcurrency===undefined?{}:{maxConcurrency:deps.executionConcurrency}),
    onSeriesFailure:diagnostic=>process.stderr.write(`${JSON.stringify({component:'analytics-series-failure',...diagnostic})}\n`),
  });
  const analytics = new AuthorizedAnalyticsService(deps.analyticsRepository, policy);
  const actors = new WeakMap<RequestContext, AdministrationActor>();
  const administration = deps.administration ? createAdministration(deps.administration.unitOfWork, policy, clock) : null;
  const savedDashboards = deps.administration ? new GovernedSavedDashboardService(deps.administration.unitOfWork, policy, context => {
    const actor = actors.get(context); if (!actor) throw new ApiError(403, 'ACCESS_DENIED', 'Access unavailable.'); return actor;
  }, clock) : deps.dashboardRepository ? new SavedDashboardService(deps.dashboardRepository, policy, clock) : null;
  const library = deps.libraryRepository && savedDashboards ? new DashboardLibraryService(deps.libraryRepository, savedDashboards, clock) : null;
  const userId = (headers: Record<string, unknown>) => {
    const value = headers['x-demo-user-id'];
    if (typeof value !== 'string' || !value) throw new ApiError(401, 'DEMO_USER_REQUIRED', 'A controlled demo user header is required.');
    if (!directory.listUsers().some(user => user.id === value)) throw new ApiError(401, 'UNKNOWN_USER', 'Unknown demo user.');
    return value;
  };
  const identityId = async (headers: Record<string, unknown>) => {
    if (!deps.administration) throw new ApiError(503, 'ADMIN_UNAVAILABLE', 'Administration is unavailable.');
    return deps.administration.authenticate(headers);
  };
  const requireData = async (tenantId: string) => {
    if (!deps.administration) return;
    let ready:boolean;
    try{ready=await deps.administration.dataReady(tenantId);}
    catch{throw new ApiError(503,'ANALYTICS_UNAVAILABLE','Analytics could not be checked. Please retry.');}
    if (!ready) throw new ApiError(503, 'DATA_NOT_READY', 'Approved analytics data is not ready for this workspace.');
  };
  const session = async (headers: Record<string, unknown>): Promise<{ context: RequestContext; profile: TenantProfile }> => {
    if (deps.administration) {
      const binding = await identityId(headers), tenant = headers['x-tenant-id'];
      if (typeof tenant !== 'string' || !tenant) throw new ApiError(401, 'TENANT_REQUIRED', 'Select a workspace.');
      const profile = await deps.administration.profiles.get(tenant, 'en').catch(() => { throw new ApiError(503, 'ADMIN_UNAVAILABLE', 'Metadata unavailable.'); });
      if (!profile) throw new ApiError(403, 'ACCESS_DENIED', 'Workspace unavailable.');
      const locale = headers['x-locale'] ?? profile.defaultLocale;
      if (locale !== 'en' && locale !== 'ar') throw new ApiError(400, 'INVALID_LOCALE', 'Locale must be en or ar.');
      const snapshot = await deps.administration.directory.tenantAccess(binding, tenant).catch(() => { throw new ApiError(503, 'ADMIN_UNAVAILABLE', 'Metadata unavailable.'); });
      if (!snapshot) throw new ApiError(403, 'ACCESS_DENIED', 'Workspace unavailable.');
      const resolved = resolveTenantAccess(snapshot, binding, tenant, locale);
      actors.set(resolved.context, { identityId: binding, tenantId: tenant, locale });
      return { context: resolved.context, profile };
    }
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
  return { administration, identityId, requireData, library, deps, clock, planner, savedDashboards, executor, analytics, directory, userId, session, authorize, ensureDashboard, checked, templateAllowed };
}
export { analyticsContext };
