import { AccessControlError, validateAccessRole, validateScopeValues, compileMembershipScopes } from '@el-dabboos/domain';
import type { AdministrationTransaction, AdministrationUnitOfWork, CustomerAccount, ManagedTenant, ProductUser, TenantAccessRole, ManagedMembership, MembershipDataScope, ScopeDimension, PlatformPermission, Permission, ResolvedTenantAccess, PlatformContext, MetadataWriteResult, AdminAuditEvent, DashboardGrant, ManagedDashboardScope, AuthorizationPolicy } from '@el-dabboos/domain';
import { resolveTenantAccess, resolvePlatformAccess, authorizePlatform, authorizeTenantAdministration, authorizeCustomRoleChange, assertCustomRoleDeletable, authorizeMembershipChange, authorizeMembershipAssignment, authorizeScopeChange, assertRecoverableAdministrators, authorizeDashboardAccessChange, validateDashboardGrants, authorizeDashboardResource } from './access-control.ts';
import { AuthorizationError, DefaultAuthorizationPolicy } from './security.ts';
const fail = (code: string): never => { throw new AccessControlError(code); };
const found = <T>(v: T | null): T => v ?? fail('NOT_FOUND');
const saved = <T>(r: MetadataWriteResult<T>): T => r.outcome === 'saved' ? r.value : fail(r.outcome === 'conflict' ? 'VERSION_CONFLICT' : 'NOT_FOUND');
export interface AdministrationActor {
    identityId: string;
    tenantId: string;
    locale: 'en' | 'ar';
}
export type ScopeValues = Readonly<Partial<Record<ScopeDimension, readonly string[]>>>;
export type TenantAdministrationCommand = {
    action: 'role.create';
    name: string;
    description: string;
    permissions: TenantAccessRole['permissions'];
    metricDomains: TenantAccessRole['metricDomains'];
} | {
    action: 'role.update';
    id: string;
    expectedVersion: number;
    name: string;
    description: string;
    permissions: TenantAccessRole['permissions'];
    metricDomains: TenantAccessRole['metricDomains'];
} | {
    action: 'role.delete';
    id: string;
    expectedVersion: number;
} | {
    action: 'membership.create';
    userId: string;
    roleIds: readonly string[];
    dataScopes: readonly MembershipDataScope[];
} | {
    action: 'membership.roles';
    id: string;
    expectedVersion: number;
    roleIds: readonly string[];
} | {
    action: 'membership.status';
    id: string;
    expectedVersion: number;
    status: 'active' | 'suspended';
} | {
    action: 'membership.scopes';
    id: string;
    expectedVersion: number;
    dataScopes: readonly MembershipDataScope[];
} | {
    action: 'tenant.update';
    expectedVersion: number;
    name: string;
    defaultLocale: 'en' | 'ar';
} | {
    action: 'dashboard.access';
    id: string;
    expectedVersion: number;
    scope: ManagedDashboardScope;
    grants: readonly DashboardGrant[];
};
export type PlatformAdministrationCommand = {
    action: 'customer.create';
    name: string;
} | {
    action: 'customer.update';
    id: string;
    expectedVersion: number;
    name: string;
    status: CustomerAccount['status'];
} | {
    action: 'tenant.create';
    customerId: string;
    name: string;
    configuration: ManagedTenant['configuration'];
} | {
    action: 'tenant.update';
    id: string;
    expectedVersion: number;
    name: string;
    status: ManagedTenant['status'];
    configuration: ManagedTenant['configuration'];
} | {
    action: 'user.update';
    id: string;
    expectedVersion: number;
    displayName: string;
    preferredLocale: 'en' | 'ar';
    status: ProductUser['status'];
} | {
    action: 'identity.disable';
    id: string;
};
/** Deterministic control plane. Every mutation reloads actor/target under the same serialized lock as audit and recovery. */
export class AdministrationService {
    /** Separate bounded safe sink for denied/error attempts; durable production retention remains pending. */
    readonly failureAuditEvents: AdminAuditEvent[] = [];
    private failed(actorUserId: string | undefined, action: AdminAuditEvent['action'], targetId: string, error: unknown, tenantId?: string) {
        if (!actorUserId)
            return;
        this.failureAuditEvents.push({ actorUserId, action, targetId, ...(tenantId ? { tenantId } : {}), timestamp: this.clock().toISOString(), result: error instanceof AccessControlError || error instanceof AuthorizationError ? 'denied' : 'error' });
        if (this.failureAuditEvents.length > 1000)
            this.failureAuditEvents.shift();
    }
    constructor(private readonly uow: AdministrationUnitOfWork, private readonly policy: AuthorizationPolicy = new DefaultAuthorizationPolicy(), private readonly clock: () => Date = () => new Date(), private readonly candidates: Readonly<Record<string, readonly string[]>> = {}) { }
    private metadata() { const timestamp = this.clock().toISOString(); return { version: 1, createdAt: timestamp, updatedAt: timestamp }; }
    private async tenantActor(tx: AdministrationTransaction, a: AdministrationActor) { return resolveTenantAccess((await tx.directory.tenantAccess(a.identityId, a.tenantId)) ?? fail('ACCESS_DENIED'), a.identityId, a.tenantId, a.locale); }
    private async platformActor(tx: AdministrationTransaction, id: string) { return resolvePlatformAccess((await tx.directory.platformAccess(id)) ?? fail('ACCESS_DENIED'), id); }
    private audit(tx: AdministrationTransaction, actor: ResolvedTenantAccess | PlatformContext, action: AdminAuditEvent['action'], targetId: string, customerId?: string) { return tx.appendAudit({ actorUserId: actor.plane === 'tenant' ? actor.context.principal.userId : actor.userId, ...(actor.plane === 'tenant' ? { tenantId: actor.context.tenant.tenantId } : {}), ...(customerId ? { customerId } : {}), action, targetId, timestamp: this.clock().toISOString(), result: 'allowed' }); }
    async resolveTenant(a: AdministrationActor) { return this.uow.write(tx => this.tenantActor(tx, a)); }
    async resolvePlatform(id: string) { return this.uow.write(tx => this.platformActor(tx, id)); }
    async tenantRead(a: AdministrationActor, kind: 'roles' | 'memberships' | 'scopes' | 'dashboards' | 'tenant' | 'candidates', cursor?: string) {
        return this.uow.write(async (tx) => {
            const actor = await this.tenantActor(tx, a);
            const permission: Permission = kind === 'roles' ? 'roles:view' : kind === 'memberships' || kind === 'candidates' ? 'users:view' : kind === 'scopes' ? 'data_scopes:view' : kind === 'dashboards' ? 'dashboard_access:view' : 'tenant:view';
            authorizeTenantAdministration(actor, a.tenantId, permission);
            if (kind === 'candidates')
                return { items: (await tx.tenants.listAssignmentCandidates(a.tenantId)).map(u => ({ id: u.id, displayName: u.displayName, status: u.status })) };
            if (kind === 'roles') {
                const roles = await tx.tenants.listRoles(a.tenantId);
                const counts = new Map<string, number>();
                let next: string | undefined;
                do {
                    const page = await tx.tenants.listMemberships(a.tenantId, { limit: 100, ...(next ? { cursor: next } : {}) });
                    for (const m of page.items)
                        for (const r of m.roleIds)
                            counts.set(r, (counts.get(r) ?? 0) + 1);
                    next = page.nextCursor;
                } while (next);
                return { items: roles.map(r => ({ ...r, membershipCount: counts.get(r.id) ?? 0 })), grantablePermissions: actor.context.authorization.permissions, grantableMetricDomains: actor.context.authorization.metricDomains };
            }
            if (kind === 'tenant')
                return { tenant: found(await tx.customers.getTenant(a.tenantId)), customer: found(await tx.customers.getCustomer(found(await tx.customers.getTenant(a.tenantId)).customerId)) };
            if (kind === 'dashboards') {
                const items = [];
                let next = cursor;
                do {
                    const p = await tx.dashboards.listTenantCandidates(a.tenantId, { limit: 100, ...(next ? { cursor: next } : {}) });
                    for (const r of p.items) {
                        const access = found(await tx.dashboards.getAccess(a.tenantId, r.id));
                        try {
                            authorizeDashboardResource(r, access, actor, this.policy);
                            items.push({ id: r.id, title: r.spec.title, ownerUserId: r.ownerUserId, ...access });
                        }
                        catch (e) {
                            if (!(e instanceof AuthorizationError) && !(e instanceof AccessControlError && e.code === 'DASHBOARD_NOT_FOUND'))
                                throw e;
                        }
                    }
                    next = p.nextCursor;
                } while (next && items.length < 100);
                return { items, ...(next ? { nextCursor: next } : {}) };
            }
            const page = await tx.tenants.listMemberships(a.tenantId, { limit: 100, ...(cursor ? { cursor } : {}) });
            const roles = await tx.tenants.listRoles(a.tenantId);
            const items = [];
            for (const m of page.items) {
                const u = found(await tx.users.getUser(m.userId));
                const identities = await tx.users.listIdentities(u.id);
                items.push({ ...m, user: { id: u.id, displayName: u.displayName, status: u.status }, identities: identities.map(i => ({ id: i.id, status: i.status, provider: i.provider, loginHint: i.loginHint })), roles: roles.filter(r => m.roleIds.includes(r.id)).map(r => ({ id: r.id, name: r.name })) });
            }
            return { ...page, items };
        });
    }
    async platformRead(identityId: string, kind: 'customers' | 'tenants' | 'users', id?: string, cursor?: string) {
        return this.uow.write(async (tx) => {
            const actor = await this.platformActor(tx, identityId);
            authorizePlatform(actor, `platform:${kind}:view` as PlatformPermission);
            const p = { limit: 100, ...(cursor ? { cursor } : {}) };
            const customerSummary = async (c: CustomerAccount) => { let next: string | undefined, count = 0; do {
                const page = await tx.customers.listTenants(c.id, { limit: 100, ...(next ? { cursor: next } : {}) });
                count += page.items.length;
                next = page.nextCursor;
            } while (next); return { ...c, tenantCount: count }; };
            if (kind === 'customers') {
                if (id)
                    return customerSummary(found(await tx.customers.getCustomer(id)));
                const page = await tx.customers.listCustomers(p);
                return { ...page, items: await Promise.all(page.items.map(customerSummary)) };
            }
            if (kind === 'tenants')
                return id ? found(await tx.customers.getTenant(id)) : fail('INVALID_ADMIN_INPUT');
            const userSummary = async (u: ProductUser) => ({ ...u, identities: (await tx.users.listIdentities(u.id)).map(i => ({ id: i.id, provider: i.provider, status: i.status, ...(i.loginHint ? { loginHint: i.loginHint } : {}) })), platformAssignment: await tx.users.getPlatformAssignment(u.id) });
            if (id)
                return userSummary(found(await tx.users.getUser(id)));
            const page = await tx.users.listUsers(p);
            return { ...page, items: await Promise.all(page.items.map(userSummary)) };
        });
    }
    async customerTenants(identityId: string, customerId: string, cursor?: string) { return this.uow.write(async (tx) => { authorizePlatform(await this.platformActor(tx, identityId), 'platform:tenants:view'); found(await tx.customers.getCustomer(customerId)); return tx.customers.listTenants(customerId, { limit: 100, ...(cursor ? { cursor } : {}) }); }); }
    async tenantMembership(a: AdministrationActor, id: string) {
        return this.uow.write(async (tx) => {
            const actor = await this.tenantActor(tx, a);
            authorizeTenantAdministration(actor, a.tenantId, 'users:view');
            const m = found(await tx.tenants.getMembership(a.tenantId, id)), u = found(await tx.users.getUser(m.userId));
            return { ...m, user: { id: u.id, displayName: u.displayName, status: u.status }, identities: (await tx.users.listIdentities(u.id)).map(i => ({ id: i.id, provider: i.provider, status: i.status, ...(i.loginHint ? { loginHint: i.loginHint } : {}) })) };
        });
    }
    async tenantMutate(a: AdministrationActor, c: TenantAdministrationCommand, available: ScopeValues = {}) {
        let actorUserId: string | undefined;
        return this.uow.write(async (tx) => {
            actorUserId = (await tx.users.getIdentity(a.identityId))?.userId;
            const actor = await this.tenantActor(tx, a), now = this.clock().toISOString();
            const roles = await tx.tenants.listRoles(a.tenantId);
            const selected = (ids: readonly string[]) => ids.map(id => found(roles.find(r => r.id === id) ?? null));
            if (c.action.startsWith('role.')) {
                if (c.action === 'role.create' || c.action === 'role.update') {
                    const current = c.action === 'role.update' ? found(roles.find(r => r.id === c.id) ?? null) : undefined;
                    const next: TenantAccessRole & {
                        protected: false;
                    } = { ...this.metadata(), createdAt: current?.createdAt ?? now, version: current?.version ?? 1, id: current?.id ?? crypto.randomUUID(), scope: 'tenant', protected: false, tenantId: a.tenantId, name: c.name, description: c.description, permissions: c.permissions, metricDomains: c.metricDomains, updatedAt: now };
                    if (current?.protected)
                        fail('PROTECTED_ROLE');
                    validateAccessRole(next);
                    authorizeCustomRoleChange(actor, next, current);
                    const result = c.action === 'role.create' ? await tx.tenants.createCustomRole(next) : saved(await tx.tenants.updateCustomRole(next, c.expectedVersion));
                    await this.audit(tx, actor, c.action === 'role.create' ? 'role.created' : 'role.updated', result.id);
                    return result;
                }
                if (c.action === 'role.delete') {
                    const r = found(roles.find(r => r.id === c.id) ?? null);
                    assertCustomRoleDeletable(r, a.tenantId, await tx.tenants.roleIsReferenced(a.tenantId, r.id));
                    authorizeCustomRoleChange(actor, r);
                    const result = await tx.tenants.deleteUnassignedCustomRole(a.tenantId, r.id, c.expectedVersion);
                    if (result !== 'deleted')
                        fail(result === 'conflict' ? 'VERSION_CONFLICT' : result === 'in_use' ? 'ROLE_IN_USE' : result === 'protected' ? 'PROTECTED_ROLE' : 'NOT_FOUND');
                    await this.audit(tx, actor, 'role.deleted', r.id);
                    return { deleted: true };
                }
            }
            if (c.action === 'membership.create') {
                if (!this.candidates[a.tenantId]?.includes(c.userId) && !(await tx.tenants.listAssignmentCandidates(a.tenantId)).some(u => u.id === c.userId))
                    fail('NOT_FOUND');
                found(await tx.users.getUser(c.userId));
                compileMembershipScopes(c.dataScopes);
                if (c.dataScopes.length) {
                    authorizeTenantAdministration(actor, a.tenantId, 'data_scopes:manage');
                    validateScopeValues(c.dataScopes, available);
                }
                const next: ManagedMembership = { ...this.metadata(), id: crypto.randomUUID(), tenantId: a.tenantId, userId: c.userId, status: 'active', roleIds: c.roleIds, dataScopes: c.dataScopes };
                authorizeMembershipAssignment(actor, next, selected(next.roleIds));
                const result = await tx.tenants.createMembership(next);
                await this.audit(tx, actor, 'membership.created', result.id);
                return result;
            }
            if (c.action === 'membership.roles' || c.action === 'membership.status' || c.action === 'membership.scopes') {
                const current = found(await tx.tenants.getMembership(a.tenantId, c.id));
                const next = { ...current, updatedAt: now, ...(c.action === 'membership.roles' ? { roleIds: c.roleIds } : c.action === 'membership.status' ? { status: c.status } : { dataScopes: c.dataScopes }) };
                if (c.action === 'membership.scopes') {
                    authorizeScopeChange(actor, a.tenantId, current.dataScopes, next.dataScopes, selected(current.roleIds));
                    validateScopeValues(next.dataScopes, available);
                }
                else if (c.action === 'membership.roles')
                    authorizeMembershipChange(actor, current, next, selected(current.roleIds), selected(next.roleIds));
                else {
                    authorizeTenantAdministration(actor, a.tenantId, 'users:manage');
                    authorizeScopeChangeForLifecycle(actor, current, selected(current.roleIds));
                }
                const result = saved(await tx.tenants.updateMembership(next, c.expectedVersion));
                assertRecoverableAdministrators(await tx.tenants.activeAdministratorUserIds(a.tenantId));
                await this.audit(tx, actor, c.action === 'membership.roles' ? 'membership.roles_changed' : c.action === 'membership.scopes' ? 'membership.scope_changed' : c.status === 'suspended' ? 'membership.suspended' : 'membership.updated', current.id);
                return result;
            }
            if (c.action === 'tenant.update') {
                authorizeTenantAdministration(actor, a.tenantId, 'tenant:manage');
                if (actor.context.authorization.enforcedFilters.length)
                    fail('ADMIN_FORBIDDEN');
                const current = found(await tx.customers.getTenant(a.tenantId));
                const next = { ...current, name: c.name, configuration: { ...current.configuration, defaultLocale: c.defaultLocale }, updatedAt: now };
                const result = saved(await tx.customers.updateTenant(next, c.expectedVersion));
                await this.audit(tx, actor, 'tenant.updated', result.id);
                return result;
            }
            if (c.action === 'dashboard.access') {
                const r = found(await tx.dashboards.getTenantRecord(a.tenantId, c.id)), access = found(await tx.dashboards.getAccess(a.tenantId, c.id));
                authorizeDashboardAccessChange(r, access, actor, this.policy);
                const memberships: ManagedMembership[] = [];
                const retainedDormant = new Set<string>();
                for (const g of c.grants)
                    if (g.subjectType === 'membership') {
                        const m = found(await tx.tenants.getMembership(a.tenantId, g.subjectId));
                        memberships.push(m);
                        if (m.status === 'suspended') {
                            if (!access.grants.some(old => old.subjectType === 'membership' && old.subjectId === g.subjectId && old.access === g.access))
                                fail('INVALID_GRANTS');
                            retainedDormant.add(g.subjectId);
                        }
                    }
                if (c.grants.length > 1000 || new Set(c.grants.map(g => JSON.stringify([g.subjectType, g.subjectId]))).size !== c.grants.length)
                    fail('INVALID_GRANTS');
                validateDashboardGrants(a.tenantId, c.grants.filter(g => g.subjectType !== 'membership' || !retainedDormant.has(g.subjectId)), roles, memberships);
                const result = saved(await tx.dashboards.replaceAccess({ dashboardId: r.id, tenantId: a.tenantId, version: c.expectedVersion, scope: c.scope, grants: c.grants }, c.expectedVersion, actor.context.principal.userId));
                await this.audit(tx, actor, 'dashboard.access_changed', r.id);
                return result;
            }
            return fail('INVALID_ADMIN_INPUT');
        }).catch(error => {
            const actions: Record<TenantAdministrationCommand['action'], AdminAuditEvent['action']> = { 'role.create': 'role.created', 'role.update': 'role.updated', 'role.delete': 'role.deleted', 'membership.create': 'membership.created', 'membership.roles': 'membership.roles_changed', 'membership.status': 'membership.updated', 'membership.scopes': 'membership.scope_changed', 'tenant.update': 'tenant.updated', 'dashboard.access': 'dashboard.access_changed' };
            this.failed(actorUserId, actions[c.action], 'id' in c ? c.id : a.tenantId, error, a.tenantId);
            throw error;
        });
    }
    async platformMutate(identityId: string, c: PlatformAdministrationCommand) {
        let actorUserId: string | undefined;
        return this.uow.write(async (tx) => {
            actorUserId = (await tx.users.getIdentity(identityId))?.userId;
            const actor = await this.platformActor(tx, identityId), now = this.clock().toISOString();
            const kind = c.action.startsWith('customer.') ? 'customers' : c.action.startsWith('tenant.') ? 'tenants' : 'users';
            authorizePlatform(actor, `platform:${kind}:manage` as PlatformPermission);
            if (c.action === 'customer.create') {
                const r = await tx.customers.createCustomer({ ...this.metadata(), id: crypto.randomUUID(), name: c.name, status: 'active' });
                await this.audit(tx, actor, 'customer.created', r.id, r.id);
                return r;
            }
            if (c.action === 'customer.update') {
                const old = found(await tx.customers.getCustomer(c.id));
                const r = saved(await tx.customers.updateCustomer({ ...old, name: c.name, status: c.status, updatedAt: now }, c.expectedVersion));
                await this.audit(tx, actor, 'customer.updated', r.id, r.id);
                return r;
            }
            if (c.action === 'tenant.create') {
                found(await tx.customers.getCustomer(c.customerId));
                const r = await tx.customers.createTenant({ ...this.metadata(), id: crypto.randomUUID(), customerId: c.customerId, name: c.name, status: 'provisioning', configuration: c.configuration });
                await this.audit(tx, actor, 'tenant.created', r.id, r.customerId);
                return r;
            }
            if (c.action === 'tenant.update') {
                const old = found(await tx.customers.getTenant(c.id));
                if (c.status === 'active')
                    assertRecoverableAdministrators(await tx.tenants.activeAdministratorUserIds(old.id));
                const r = saved(await tx.customers.updateTenant({ ...old, name: c.name, status: c.status, configuration: c.configuration, updatedAt: now }, c.expectedVersion));
                await this.audit(tx, actor, c.status === 'suspended' ? 'tenant.suspended' : 'tenant.updated', r.id, r.customerId);
                return r;
            }
            if (c.action === 'user.update') {
                const old = found(await tx.users.getUser(c.id));
                const r = saved(await tx.users.updateUser({ ...old, displayName: c.displayName, preferredLocale: c.preferredLocale, status: c.status, updatedAt: now }, c.expectedVersion));
                await this.recovery(tx, old.id);
                await this.audit(tx, actor, c.status === 'suspended' ? 'user.suspended' : 'user.updated', r.id);
                return r;
            }
            // Binding IDs are opaque. No rebinding/assignment HTTP capability is provided.
            if (c.action === 'identity.disable') {
                const identity = found(await tx.users.getIdentity(c.id));
                if (!await tx.users.disableIdentity(c.id))
                    fail('NOT_FOUND');
                await this.recovery(tx, identity.userId);
                await this.audit(tx, actor, 'identity.disabled', c.id);
                return { disabled: true };
            }
            return fail('INVALID_ADMIN_INPUT');
        }).catch(error => {
            const actions: Record<PlatformAdministrationCommand['action'], AdminAuditEvent['action']> = { 'customer.create': 'customer.created', 'customer.update': 'customer.updated', 'tenant.create': 'tenant.created', 'tenant.update': 'tenant.updated', 'user.update': 'user.updated', 'identity.disable': 'identity.disabled' };
            this.failed(actorUserId, actions[c.action], 'id' in c ? c.id : 'customerId' in c ? c.customerId : 'new-customer', error);
            throw error;
        });
    }
    private async recovery(tx: AdministrationTransaction, userId: string) { for (const t of await tx.users.membershipTenantIds(userId))
        assertRecoverableAdministrators(await tx.tenants.activeAdministratorUserIds(t)); assertRecoverableAdministrators(await tx.users.activePlatformAdministratorUserIds()); }
}
function authorizeScopeChangeForLifecycle(actor: ResolvedTenantAccess, current: ManagedMembership, roles: readonly TenantAccessRole[]) {
    // Lifecycle requires users:manage, while reusing the exact current capability/scope ceiling without requiring roles:manage.
    const filters = actor.context.authorization.enforcedFilters;
    for (const r of roles)
        if (!r.permissions.every(p => actor.context.authorization.permissions.includes(p)) || !r.metricDomains.every(d => actor.context.authorization.metricDomains.includes(d)))
            fail('ROLE_ESCALATION');
    for (const f of filters) {
        const s = current.dataScopes.find(s => s.dimension === f.dimension);
        if (!s || !s.values.every(v => f.values.includes(v)))
            fail('SCOPE_ESCALATION');
    }
}
