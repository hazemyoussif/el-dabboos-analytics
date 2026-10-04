import type { AccessControlledDashboardRecord, AdministrationTransaction, AdministrationUnitOfWork, AuthorizationPolicy, ManagedDashboardScope, PageRequest, RequestContext } from '@el-dabboos/domain';
import { AccessControlError, validateDashboardSpec } from '@el-dabboos/domain';
import { authorizeDashboardResource, resolveTenantAccess } from './access-control.ts';
import type { AdministrationActor } from './administration.ts';
import { DashboardPersistenceError } from './saved-dashboards.ts';
import { AuthorizationError } from './security.ts';
const missing = (): never => { throw new DashboardPersistenceError('DASHBOARD_NOT_FOUND', 'Saved dashboard was not found.'); };
export class GovernedSavedDashboardService {
    constructor(private readonly uow: AdministrationUnitOfWork, private readonly policy: AuthorizationPolicy, private readonly trustedActor: (context: RequestContext) => AdministrationActor, private readonly clock: () => Date = () => new Date()) { }
    private async actor(transaction: AdministrationTransaction, context: RequestContext) {
        const actorInput = this.trustedActor(context), snapshot = await transaction.directory.tenantAccess(actorInput.identityId, actorInput.tenantId);
        if (!snapshot)
            throw new AccessControlError('ACCESS_DENIED');
        return resolveTenantAccess(snapshot, actorInput.identityId, actorInput.tenantId, actorInput.locale);
    }
    private async record(transaction: AdministrationTransaction, id: string, actor: Awaited<ReturnType<GovernedSavedDashboardService['actor']>>) {
        const tenantId = actor.context.tenant.tenantId, record = await transaction.dashboards.getTenantRecord(tenantId, id), access = await transaction.dashboards.getAccess(tenantId, id);
        if (!record || !access)
            return missing();
        try {
            validateDashboardSpec(record.spec);
        }
        catch {
            throw new AccessControlError('ADMIN_UNAVAILABLE');
        }
        try {
            authorizeDashboardResource(record, access, actor, this.policy);
        }
        catch (error) {
            if (error instanceof AccessControlError && error.code === 'DASHBOARD_NOT_FOUND')
                return missing();
            throw error;
        }
        return record;
    }
    async listPage(context: RequestContext, page: PageRequest = { limit: 100 }) {
        if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100)
            throw new AccessControlError('INVALID_ADMIN_INPUT');
        return this.uow.write(async (transaction) => {
            const actor = await this.actor(transaction, context);
            this.policy.authorize('dashboard:view', actor.context);
            this.policy.authorize('analytics:query', actor.context);
            const items: AccessControlledDashboardRecord[] = [];
            let cursor = page.cursor, scanned = 0;
            do {
                const candidates = await transaction.dashboards.listTenantCandidates(actor.context.tenant.tenantId, { limit: 1, ...(cursor ? { cursor } : {}) });
                for (const candidate of candidates.items) {
                    scanned++;
                    try {
                        items.push(await this.record(transaction, candidate.id, actor));
                    }
                    catch (error) {
                        if (!(error instanceof AuthorizationError) && !(error instanceof DashboardPersistenceError && error.code === 'DASHBOARD_NOT_FOUND'))
                            throw error;
                    }
                }
                cursor = candidates.nextCursor;
            } while (cursor && items.length < page.limit && scanned < 1000);
            return { items, ...(cursor ? { nextCursor: cursor } : {}) };
        });
    }
    /** Internal library orchestration consumes governed pages; public HTTP uses bounded listPage. */
    async list(context: RequestContext): Promise<AccessControlledDashboardRecord[]> {
        const records: AccessControlledDashboardRecord[] = [];
        let cursor: string | undefined;
        do {
            const page = await this.listPage(context, { limit: 100, ...(cursor ? { cursor } : {}) });
            records.push(...page.items);
            cursor = page.nextCursor;
        } while (cursor);
        return records;
    }
    get(id: string, context: RequestContext) { return this.uow.write(async (transaction) => this.record(transaction, id, await this.actor(transaction, context))); }
    create(spec: unknown, scope: ManagedDashboardScope, context: RequestContext) {
        return this.uow.write(async (transaction) => {
            const actor = await this.actor(transaction, context);
            this.policy.authorize('dashboard:create', actor.context);
            if (scope !== 'private')
                this.policy.authorize('dashboard:share', actor.context);
            validateDashboardSpec(spec);
            this.policy.authorizeDashboard(spec, actor.context);
            const timestamp = this.clock().toISOString(), user = actor.context.principal.userId;
            return transaction.dashboards.create({ id: crypto.randomUUID(), tenantId: actor.context.tenant.tenantId, ownerUserId: user, scope, spec: structuredClone(spec), version: 1, createdBy: user, updatedBy: user, createdAt: timestamp, updatedAt: timestamp });
        });
    }
    update(id: string, expectedVersion: number, spec: unknown, context: RequestContext) {
        return this.uow.write(async (transaction) => {
            const actor = await this.actor(transaction, context);
            const old = await this.record(transaction, id, actor);
            if (old.ownerUserId !== actor.context.principal.userId)
                return missing();
            this.policy.authorize('dashboard:edit', actor.context);
            validateDashboardSpec(spec);
            this.policy.authorizeDashboard(spec, actor.context);
            const result = await transaction.dashboards.updateOwned({ id, tenantId: actor.context.tenant.tenantId, ownerUserId: actor.context.principal.userId, expectedVersion, spec: structuredClone(spec), updatedBy: actor.context.principal.userId, updatedAt: this.clock().toISOString() });
            if (result.outcome === 'conflict')
                throw new DashboardPersistenceError('DASHBOARD_VERSION_CONFLICT', 'Saved dashboard has changed; reload before saving.');
            if (result.outcome === 'saved')
                return result.value;
            return missing();
        });
    }
}
