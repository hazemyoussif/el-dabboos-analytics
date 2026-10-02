import { validateDashboardSpec } from '@el-dabboos/domain';
import { AuthorizationError } from './security.ts';
import type { AuthorizationPolicy, DashboardRecord, DashboardRepository, DashboardScope, RequestContext } from '@el-dabboos/domain';

export class DashboardPersistenceError extends Error {
  constructor(readonly code: 'DASHBOARD_NOT_FOUND' | 'DASHBOARD_VERSION_CONFLICT', message: string) { super(message); }
}
export class SavedDashboardService {
  constructor(private readonly repository: DashboardRepository, private readonly policy: AuthorizationPolicy,
    private readonly clock: () => Date = () => new Date(), private readonly createId: () => string = () => crypto.randomUUID()) {}
  async list(context: RequestContext): Promise<DashboardRecord[]> {
    this.policy.authorize('dashboard:view', context);
    const records = await this.repository.listAccessible(context.tenant.tenantId, context.principal.userId);
    return records.filter(record => {
      try { this.policy.authorizeDashboard(record.spec, context); return true; }
      catch (error) { if (error instanceof AuthorizationError) return false; throw error; }
    });
  }
  async get(id: string, context: RequestContext): Promise<DashboardRecord> {
    this.policy.authorize('dashboard:view', context);
    const record = await this.repository.getAccessible(id, context.tenant.tenantId, context.principal.userId);
    if (!record) throw new DashboardPersistenceError('DASHBOARD_NOT_FOUND', 'Saved dashboard was not found.');
    this.policy.authorizeDashboard(record.spec, context);
    return record;
  }
  async create(spec: unknown, scope: DashboardScope, context: RequestContext): Promise<DashboardRecord> {
    this.policy.authorize('dashboard:create', context);
    if (scope === 'tenant') this.policy.authorize('dashboard:share', context);
    validateDashboardSpec(spec);
    this.policy.authorizeDashboard(spec, context);
    const timestamp = this.clock().toISOString();
    return this.repository.create({ id: this.createId(), tenantId: context.tenant.tenantId, ownerUserId: context.principal.userId,
      scope, spec: structuredClone(spec), version: 1, createdBy: context.principal.userId, updatedBy: context.principal.userId,
      createdAt: timestamp, updatedAt: timestamp });
  }
  async update(id: string, expectedVersion: number, spec: unknown, context: RequestContext): Promise<DashboardRecord> {
    this.policy.authorize('dashboard:edit', context);
    validateDashboardSpec(spec);
    this.policy.authorizeDashboard(spec, context);
    const result = await this.repository.updateOwned({ id, tenantId: context.tenant.tenantId, ownerUserId: context.principal.userId,
      expectedVersion, spec: structuredClone(spec), updatedBy: context.principal.userId, updatedAt: this.clock().toISOString() });
    if (result === 'conflict') throw new DashboardPersistenceError('DASHBOARD_VERSION_CONFLICT', 'Saved dashboard has changed; reload it before saving.');
    if (!result) throw new DashboardPersistenceError('DASHBOARD_NOT_FOUND', 'Saved dashboard was not found.');
    return result;
  }
}
