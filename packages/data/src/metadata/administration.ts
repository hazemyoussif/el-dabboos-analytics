import { realpathSync } from 'node:fs';
import { SqliteDashboardLibraryRepository } from '../library-sqlite.ts';
import type { DashboardLibraryRepository } from '@el-dabboos/domain';
import { seedProtectedAccessRoles } from './demo-seed.ts';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { AccessControlError, compileMembershipScopes, validateAccessRole, validateTenantConfiguration, getTenantProfile } from '@el-dabboos/domain';
import type { AccessRole, AdministrationTransaction, AdministrationUnitOfWork, CustomerAccount, ManagedTenant, ProductUser, IdentityBinding, TenantAccessRole, ManagedMembership, PlatformAssignment, DashboardAccessState, AccessControlledDashboardRecord, PageRequest, MetadataWriteResult, TenantProfileProvider, AccessDirectory } from '@el-dabboos/domain';
import { assertMetadataReady } from './migrations.ts';
type Row = Record<string, unknown>;
const fieldNames: Record<string, string> = { customerId: 'customer_id', displayName: 'display_name', preferredLocale: 'preferred_locale', userId: 'user_id', providerSubject: 'provider_subject', loginHint: 'login_hint', tenantId: 'tenant_id', systemKey: 'system_key', ownerUserId: 'owner_user_id', createdBy: 'created_by', updatedBy: 'updated_by', createdAt: 'created_at', updatedAt: 'updated_at' };
const column = (key: string) => fieldNames[key] ?? key;
function fail(code: string): never { throw new AccessControlError(code); }
const queues = new Map<string, Promise<unknown>>();
/** SQLite transaction implementation; only callbacks get write repositories. No HTTP exposes bootstrap ports. */
export class SqliteAdministrationStore implements AdministrationUnitOfWork {
    private readonly key: string;
    constructor(private readonly db: DatabaseSync) { db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000'); assertMetadataReady(db); const path = String(db.prepare('PRAGMA database_list').get()?.file ?? ''); this.key = path ? realpathSync(path) : randomUUID(); }
    private enqueue<T>(op: () => Promise<T>) { const result = (queues.get(this.key) ?? Promise.resolve()).then(op); queues.set(this.key, result.catch(() => { })); return result; }
    private transaction<T>(write: boolean, operation: (t: AdministrationTransaction) => Promise<T>): Promise<T> { return this.enqueue(async () => { this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN'); try {
        const result = await operation(this.repositories());
        this.db.exec('COMMIT');
        return result;
    }
    catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
    } }); }
    write<T>(op: (t: AdministrationTransaction) => Promise<T>) { return this.transaction(true, op); }
    read<T>(op: (t: AdministrationTransaction) => Promise<T>) { return this.transaction(false, op); }
    readonly directory: AccessDirectory = { tenantAccess: (id, t) => this.read(tx => tx.directory.tenantAccess(id, t)), platformAccess: id => this.read(tx => tx.directory.platformAccess(id)), listActiveMemberships: id => this.read(tx => tx.directory.listActiveMemberships(id)) };
    readonly library: DashboardLibraryRepository = {
        listFolders: s => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).listFolders(s)),
        createFolder: f => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).createFolder(f)),
        renameFolder: (s, id, name, date) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).renameFolder(s, id, name, date)),
        deleteFolder: (s, id) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).deleteFolder(s, id)),
        listPreferences: s => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).listPreferences(s)),
        getPreference: (s, id) => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).getPreference(s, id)),
        setPreference: p => this.enqueue(() => new SqliteDashboardLibraryRepository(this.db).setPreference(p)),
    };
    readonly profiles: TenantProfileProvider = { get: id => this.read(async (tx) => { const t = await tx.customers.getTenant(id); if (!t)
            return null; validateTenantConfiguration(t); return { ...(getTenantProfile(id) ?? { labels: { en: t.name, ar: t.name }, branchLabels: {}, exampleBranchIds: [] }), id, ...t.configuration }; }) };
    /** Offline-only trusted bootstrap: no HTTP route can invoke this capability. */
    async bootstrap(input: {
        displayName: string;
        provider: string;
        providerSubject: string;
        preferredLocale: 'en' | 'ar';
    }, reference: string) {
        if (!reference.trim() || reference.length > 200 || !input.provider.trim() || input.provider.length > 200 || !input.providerSubject.trim() || input.providerSubject.length > 200)
            fail('INVALID_ADMIN_INPUT');
        return this.write(async (tx) => {
            if (this.db.prepare("SELECT 1 FROM bootstrap_state WHERE id='completed'").get())
                fail('BOOTSTRAP_COMPLETED');
            const timestamp = new Date().toISOString(), meta = { version: 1, createdAt: timestamp, updatedAt: timestamp }, userId = randomUUID(), identityId = randomUUID();
            seedProtectedAccessRoles(this.db, timestamp);
            await tx.users.createUser({ ...meta, id: userId, displayName: input.displayName, preferredLocale: input.preferredLocale, status: 'active' });
            await tx.users.bindIdentity({ id: identityId, userId, provider: input.provider, providerSubject: input.providerSubject, status: 'active' });
            const result = await tx.users.provisionPlatformAssignment({ ...meta, userId, roleIds: ['platform-admin'], status: 'active' }, null);
            if (result.outcome !== 'saved')
                fail('VERSION_CONFLICT');
            this.db.prepare('INSERT INTO bootstrap_state(id,reference,completed_at) VALUES (?,?,?)').run('completed', reference, timestamp);
            await tx.appendAudit({ actorUserId: userId, targetId: userId, action: 'platform.access_changed', timestamp, result: 'allowed' });
            return { userId, identityId };
        });
    }
    /** Explicit platform provisioning of an inactive workspace's first protected admin. No existing-active-tenant bypass. */
    async provisionTenantAdministrator(actorIdentityId: string, tenantId: string, targetIdentityId: string, expectedVersion: number) {
        return this.write(async (tx) => {
            const actor = await tx.users.getIdentity(actorIdentityId), target = await tx.users.getIdentity(targetIdentityId), tenant = await tx.customers.getTenant(tenantId);
            if (!actor || actor.status !== 'active' || !(await tx.users.activePlatformAdministratorUserIds()).includes(actor.userId))
                fail('ACCESS_DENIED');
            if (!target || target.status !== 'active' || (await tx.users.getUser(target.userId))?.status !== 'active')
                fail('INVALID_ADMIN_INPUT');
            if (!tenant || tenant.status !== 'provisioning')
                fail('INVALID_ADMIN_INPUT');
            const timestamp = new Date().toISOString(), meta = { version: 1, createdAt: timestamp, updatedAt: timestamp };
            const member = await tx.tenants.createMembership({ ...meta, id: randomUUID(), userId: target.userId, tenantId, status: 'active', roleIds: ['admin'], dataScopes: [] });
            const result = await tx.customers.updateTenant({ ...tenant, status: 'active', updatedAt: timestamp }, expectedVersion);
            if (result.outcome !== 'saved')
                return fail('VERSION_CONFLICT');
            await tx.appendAudit({ actorUserId: actor.userId, customerId: tenant.customerId, tenantId, targetId: member.id, action: 'membership.created', timestamp, result: 'allowed' });
            return result.value;
        });
    }
    /** Operationally provision a tenant-local candidate for normal bounded member assignment. */
    async provisionAssignmentCandidate(actorIdentityId: string, tenantId: string, targetIdentityId: string) {
        return this.write(async (tx) => {
            const actor = await tx.users.getIdentity(actorIdentityId), target = await tx.users.getIdentity(targetIdentityId);
            if (!actor || actor.status !== 'active' || !(await tx.users.activePlatformAdministratorUserIds()).includes(actor.userId))
                fail('ACCESS_DENIED');
            if (!target || target.status !== 'active' || (await tx.users.getUser(target.userId))?.status !== 'active' || !await tx.customers.getTenant(tenantId))
                fail('INVALID_ADMIN_INPUT');
            this.db.prepare('INSERT INTO tenant_assignment_candidates(tenant_id,user_id) VALUES (?,?)').run(tenantId, target.userId);
            await tx.appendAudit({ actorUserId: actor.userId, tenantId, targetId: target.userId, action: 'membership.candidate_provisioned', timestamp: new Date().toISOString(), result: 'allowed' });
            return { userId: target.userId };
        });
    }
    private repositories(): AdministrationTransaction {
        const db = this.db;
        const one = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).get(...args);
        const all = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).all(...args);
        const run = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).run(...args);
        const convert = <T>(r: Row): T => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null).map(([k, v]) => [Object.keys(fieldNames).find(f => column(f) === k) ?? k, v])) as T;
        const tenant = (r: Row): ManagedTenant => { const { country_code, default_locale, arabic_dialect, reporting_currency, time_zone, ...rest } = r; return { ...convert<ManagedTenant>(rest), configuration: { countryCode: country_code, defaultLocale: default_locale, arabicDialect: arabic_dialect, reportingCurrency: reporting_currency, timeZone: time_zone } } as ManagedTenant; };
        const dashboard = (r: Row): AccessControlledDashboardRecord => { const { spec_json, ...rest } = r; return { ...convert<AccessControlledDashboardRecord>(rest), spec: JSON.parse(String(spec_json)) }; };
        const insert = (table: string, record: object) => { const entries = Object.entries(record).filter(([, v]) => v !== undefined); run(`INSERT INTO ${table}(${entries.map(([k]) => column(k)).join(',')}) VALUES (${entries.map(() => '?').join(',')})`, ...entries.map(([, v]) => v as SQLInputValue)); };
        const update = <T>(table: string, id: string, changes: object, expected: number, read: () => T | null, key = 'id'): MetadataWriteResult<T> => {
            if (!Number.isInteger(expected) || expected < 1)
                fail('INVALID_ADMIN_INPUT');
            const entries = Object.entries(changes);
            const x = run(`UPDATE ${table} SET ${entries.map(([k]) => `${column(k)}=?`).join(',')},version=version+1 WHERE ${key}=? AND version=?`, ...entries.map(([, v]) => v as SQLInputValue), id, expected);
            const value = read();
            return x.changes && value ? { outcome: 'saved', value } : value ? { outcome: 'conflict' } : { outcome: 'not_found' };
        };
        const page = <T>(table: string, p: PageRequest, partition: string, convert: (r: Row) => T, field?: string) => {
            if (!Number.isInteger(p.limit) || p.limit < 1 || p.limit > 100)
                fail('INVALID_ADMIN_INPUT');
            let after = '';
            if (p.cursor) {
                try {
                    const c = JSON.parse(Buffer.from(p.cursor, 'base64url').toString());
                    if (c.table !== table || c.partition !== partition || typeof c.id !== 'string')
                        fail('INVALID_ADMIN_INPUT');
                    after = c.id;
                }
                catch {
                    fail('INVALID_ADMIN_INPUT');
                }
            }
            const rows = all(`SELECT * FROM ${table} WHERE ${field ? `${field}=? AND ` : ''}id>? ORDER BY id LIMIT ?`, ...(field ? [partition] : []), after, p.limit + 1);
            return { items: rows.slice(0, p.limit).map(convert), ...(rows.length > p.limit ? { nextCursor: Buffer.from(JSON.stringify({ table, partition, id: rows[p.limit - 1]!.id })).toString('base64url') } : {}) };
        };
        const getCustomer = (id: string) => { const r = one('SELECT * FROM customers WHERE id=?', id); return r ? convert<CustomerAccount>(r) : null; };
        const getTenant = (id: string) => { const r = one('SELECT * FROM tenants WHERE id=?', id); return r ? tenant(r) : null; };
        const getUser = (id: string) => { const r = one('SELECT * FROM users WHERE id=?', id); return r ? convert<ProductUser>(r) : null; };
        const getRole = (r: Row): AccessRole => { const value = { ...convert<AccessRole>(r), protected: r.protected === 1, permissions: all('SELECT permission FROM role_permissions WHERE role_id=? ORDER BY permission', String(r.id)).map(v => v.permission), ...(r.scope === 'tenant' ? { metricDomains: all('SELECT domain FROM role_metric_domains WHERE role_id=? ORDER BY domain', String(r.id)).map(v => v.domain) } : {}) } as unknown as AccessRole; validateAccessRole(value); return value; };
        const roleValues = (r: TenantAccessRole) => { run('DELETE FROM role_permissions WHERE role_id=?', r.id); run('DELETE FROM role_metric_domains WHERE role_id=?', r.id); for (const permission of r.permissions)
            insert('role_permissions', { role_id: r.id, permission }); for (const domain of r.metricDomains)
            insert('role_metric_domains', { role_id: r.id, domain }); };
        const membership = (r: Row): ManagedMembership => {
            const scopes = new Map<string, string[]>();
            for (const s of all('SELECT dimension,value FROM membership_scopes WHERE tenant_id=? AND membership_id=? ORDER BY dimension,value', String(r.tenant_id), String(r.id)))
                scopes.set(String(s.dimension), [...(scopes.get(String(s.dimension)) ?? []), String(s.value)]);
            const value = { ...convert<ManagedMembership>(r), roleIds: all('SELECT role_id FROM membership_roles WHERE tenant_id=? AND membership_id=? ORDER BY role_id', String(r.tenant_id), String(r.id)).map(v => String(v.role_id)), dataScopes: [...scopes].map(([dimension, values]) => ({ dimension, values })) } as ManagedMembership;
            compileMembershipScopes(value.dataScopes);
            return value;
        };
        const getMembership = (tenant: string, id: string) => { const r = one('SELECT * FROM memberships WHERE tenant_id=? AND id=?', tenant, id); return r ? membership(r) : null; };
        const membershipValues = (r: ManagedMembership) => {
            compileMembershipScopes(r.dataScopes);
            if (!r.roleIds.length || new Set(r.roleIds).size !== r.roleIds.length)
                fail('INVALID_ASSIGNMENT');
            run('DELETE FROM membership_roles WHERE tenant_id=? AND membership_id=?', r.tenantId, r.id);
            run('DELETE FROM membership_scopes WHERE tenant_id=? AND membership_id=?', r.tenantId, r.id);
            for (const role_id of r.roleIds)
                insert('membership_roles', { membership_id: r.id, tenant_id: r.tenantId, role_id });
            for (const s of r.dataScopes)
                for (const value of s.values)
                    insert('membership_scopes', { membership_id: r.id, tenant_id: r.tenantId, dimension: s.dimension, value });
        };
        const getAssignment = (id: string): PlatformAssignment | null => { const r = one('SELECT * FROM platform_assignments WHERE user_id=?', id); return r ? { ...convert<PlatformAssignment>(r), roleIds: all('SELECT role_id FROM platform_assignment_roles WHERE user_id=? ORDER BY role_id', id).map(v => String(v.role_id)) } : null; };
        const getRecord = (tenant: string, id: string) => { const r = one('SELECT * FROM dashboard_records WHERE tenant_id=? AND id=?', tenant, id); return r ? dashboard(r) : null; };
        const getAccess = (tenantId: string, id: string): DashboardAccessState | null => { const r = getRecord(tenantId, id); return r ? { tenantId, dashboardId: id, version: r.version, scope: r.scope, grants: all('SELECT subject_type,subject_id,access FROM dashboard_grants WHERE tenant_id=? AND dashboard_id=? ORDER BY subject_type,subject_id', tenantId, id).map(g => ({ subjectType: g.subject_type, subjectId: g.subject_id, access: g.access })) as DashboardAccessState['grants'] } : null; };
        const referenced = (tenant: string, id: string) => !!(one('SELECT 1 FROM membership_roles WHERE tenant_id=? AND role_id=? LIMIT 1', tenant, id) || one('SELECT 1 FROM dashboard_grants WHERE tenant_id=? AND role_id=? LIMIT 1', tenant, id));
        const identityFor = (id: string) => { const r = one('SELECT * FROM identities WHERE id=?', id); return r ? convert<IdentityBinding>(r) : null; };
        return {
            directory: {
                tenantAccess: async (id, t) => { const identity = identityFor(id); if (!identity)
                    return null; const user = getUser(identity.userId), tenant = getTenant(t), m = getMembership(t, String(one('SELECT id FROM memberships WHERE tenant_id=? AND user_id=?', t, identity.userId)?.id ?? '')); if (!user || !tenant || !m)
                    return null; const customer = getCustomer(tenant.customerId); if (!customer)
                    return null; return { identity, user, tenant, customer, membership: m, roles: m.roleIds.map(role => getRole(one('SELECT * FROM roles WHERE id=?', role) ?? fail('INVALID_ASSIGNMENT'))) }; },
                platformAccess: async (id) => { const identity = identityFor(id); if (!identity)
                    return null; const user = getUser(identity.userId), assignment = getAssignment(identity.userId); return user && assignment ? { identity, user, assignment, roles: assignment.roleIds.map(role => getRole(one('SELECT * FROM roles WHERE id=?', role) ?? fail('INVALID_ASSIGNMENT'))) } : null; },
                listActiveMemberships: async (id) => { const identity = identityFor(id); if (!identity || identity.status !== 'active' || getUser(identity.userId)?.status !== 'active')
                    return []; return all("SELECT m.* FROM memberships m JOIN tenants t ON t.id=m.tenant_id JOIN customers c ON c.id=t.customer_id WHERE m.user_id=? AND m.status='active' AND t.status='active' AND c.status='active' ORDER BY m.id", identity.userId).map(membership); },
            },
            customers: {
                listCustomers: async (p) => page('customers', p, '', convert<CustomerAccount>), getCustomer: async (id) => getCustomer(id), createCustomer: async (r) => { insert('customers', { ...r, version: 1 }); return getCustomer(r.id)!; }, updateCustomer: async (r, v) => update('customers', r.id, { name: r.name, status: r.status, updatedAt: r.updatedAt }, v, () => getCustomer(r.id)),
                listTenants: async (id, p) => page('tenants', p, id, tenant, 'customer_id'), getTenant: async (id) => getTenant(id), createTenant: async (r) => { validateTenantConfiguration(r); const { configuration, ...rest } = r; insert('tenants', { ...rest, country_code: configuration.countryCode, default_locale: configuration.defaultLocale, arabic_dialect: configuration.arabicDialect, reporting_currency: configuration.reportingCurrency, time_zone: configuration.timeZone, version: 1 }); return getTenant(r.id)!; },
                updateTenant: async (r, v) => { validateTenantConfiguration(r); const old = getTenant(r.id); if (old && old.customerId !== r.customerId)
                    fail('IMMUTABLE_TENANT'); if (old && old.status !== 'provisioning' && r.status === 'provisioning')
                    fail('INVALID_LIFECYCLE_TRANSITION'); if (old && old.status !== 'provisioning' && (['countryCode', 'arabicDialect', 'reportingCurrency', 'timeZone'] as const).some(k => old.configuration[k] !== r.configuration[k]))
                    fail('INVALID_TENANT_CONFIGURATION'); const c = r.configuration; return update('tenants', r.id, { name: r.name, status: r.status, default_locale: c.defaultLocale, country_code: c.countryCode, arabic_dialect: c.arabicDialect, reporting_currency: c.reportingCurrency, time_zone: c.timeZone, updatedAt: r.updatedAt }, v, () => getTenant(r.id)); },
            },
            users: { listUsers: async (p) => page('users', p, '', convert<ProductUser>), getUser: async (id) => getUser(id), createUser: async (r) => { insert('users', { ...r, version: 1 }); return getUser(r.id)!; }, updateUser: async (r, v) => { const old = getUser(r.id); if (old && old.status !== 'invited' && r.status === 'invited')
                    fail('INVALID_LIFECYCLE_TRANSITION'); return update('users', r.id, { displayName: r.displayName, preferredLocale: r.preferredLocale, status: r.status, updatedAt: r.updatedAt }, v, () => getUser(r.id)); },
                getIdentity: async (id) => identityFor(id), listIdentities: async (id) => all('SELECT * FROM identities WHERE user_id=? ORDER BY id', id).map(convert<IdentityBinding>), findIdentity: async (provider, subject) => { const r = one('SELECT * FROM identities WHERE provider=? AND provider_subject=?', provider, subject); return r ? convert<IdentityBinding>(r) : null; }, bindIdentity: async (r) => { insert('identities', r); return structuredClone(r); }, disableIdentity: async (id) => Boolean(run("UPDATE identities SET status='disabled' WHERE id=? AND status='active'", id).changes), membershipTenantIds: async (id) => all('SELECT tenant_id FROM memberships WHERE user_id=? ORDER BY tenant_id', id).map(v => String(v.tenant_id)), getPlatformAssignment: async (id) => getAssignment(id),
                provisionPlatformAssignment: async (r, v) => { const { roleIds, ...rest } = r; let result: MetadataWriteResult<PlatformAssignment>; if (v === null) {
                    if (getAssignment(r.userId))
                        return { outcome: 'conflict' };
                    insert('platform_assignments', { ...rest, version: 1 });
                    result = { outcome: 'saved', value: r };
                }
                else
                    result = update('platform_assignments', r.userId, { status: r.status, updatedAt: r.updatedAt }, v, () => getAssignment(r.userId), 'user_id'); if (result.outcome === 'saved') {
                    run('DELETE FROM platform_assignment_roles WHERE user_id=?', r.userId);
                    for (const role_id of roleIds)
                        insert('platform_assignment_roles', { user_id: r.userId, role_id });
                    return { outcome: 'saved', value: getAssignment(r.userId)! };
                } return result; },
                activePlatformAdministratorUserIds: async () => all(`SELECT DISTINCT u.id FROM users u JOIN platform_assignments a ON a.user_id=u.id JOIN platform_assignment_roles ar ON ar.user_id=a.user_id JOIN roles r ON r.id=ar.role_id WHERE u.status='active' AND a.status='active' AND r.scope='platform' AND r.system_key='platform_admin' AND r.protected=1 AND EXISTS(SELECT 1 FROM identities i WHERE i.user_id=u.id AND i.status='active')`).map(r => String(r.id)),
            },
            tenants: { listAssignmentCandidates: async (t) => all('SELECT u.* FROM users u JOIN tenant_assignment_candidates c ON c.user_id=u.id WHERE c.tenant_id=? ORDER BY u.id LIMIT 100', t).map(convert<ProductUser>), listMemberships: async (t, p) => page('memberships', p, t, membership, 'tenant_id'), getMembership: async (t, id) => getMembership(t, id), createMembership: async (r) => { if (one('SELECT 1 FROM memberships WHERE tenant_id=? AND user_id=?', r.tenantId, r.userId))
                    fail('VERSION_CONFLICT'); const rest = { id: r.id, tenantId: r.tenantId, userId: r.userId, status: r.status, version: r.version, createdAt: r.createdAt, updatedAt: r.updatedAt }; insert('memberships', { ...rest, version: 1 }); membershipValues(r); return getMembership(r.tenantId, r.id)!; },
                updateMembership: async (r, v) => { const old = getMembership(r.tenantId, r.id); if (!old)
                    return { outcome: 'not_found' }; if (old.userId !== r.userId)
                    fail('IMMUTABLE_MEMBERSHIP_IDENTITY'); const x = update('memberships', r.id, { status: r.status, updatedAt: r.updatedAt }, v, () => getMembership(r.tenantId, r.id)); if (x.outcome === 'saved') {
                    membershipValues(r);
                    return { outcome: 'saved', value: getMembership(r.tenantId, r.id)! };
                } return x; },
                listRoles: async (t) => all("SELECT * FROM roles WHERE scope='tenant' AND (protected=1 OR tenant_id=?) ORDER BY id", t).map(r => getRole(r) as TenantAccessRole),
                createCustomRole: async (r) => { validateAccessRole(r); const rest = { id: r.id, name: r.name, description: r.description, scope: r.scope, tenantId: r.tenantId, version: r.version, createdAt: r.createdAt, updatedAt: r.updatedAt }; insert('roles', { ...rest, protected: 0, version: 1 }); roleValues(r); return getRole(one('SELECT * FROM roles WHERE id=?', r.id)!) as TenantAccessRole; },
                updateCustomRole: async (r, v) => { validateAccessRole(r); const old = one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", r.id, r.tenantId); if (!old)
                    return { outcome: 'not_found' }; if (old.protected === 1)
                    fail('PROTECTED_ROLE'); const x = update('roles', r.id, { name: r.name, description: r.description, updatedAt: r.updatedAt }, v, () => getRole(one('SELECT * FROM roles WHERE id=?', r.id)!) as TenantAccessRole); if (x.outcome === 'saved') {
                    roleValues(r);
                    return { outcome: 'saved', value: getRole(one('SELECT * FROM roles WHERE id=?', r.id)!) as TenantAccessRole };
                } return x; },
                roleIsReferenced: async (t, id) => referenced(t, id), deleteUnassignedCustomRole: async (t, id, v) => { const r = one("SELECT * FROM roles WHERE id=? AND scope='tenant' AND (protected=1 OR tenant_id=?)", id, t); if (!r)
                    return 'not_found'; if (r.protected === 1)
                    return 'protected'; if (r.version !== v)
                    return 'conflict'; if (referenced(t, id))
                    return 'in_use'; run('DELETE FROM role_permissions WHERE role_id=?', id); run('DELETE FROM role_metric_domains WHERE role_id=?', id); run('DELETE FROM roles WHERE id=? AND tenant_id=? AND version=?', id, t, v); return 'deleted'; },
                activeAdministratorUserIds: async (t) => all(`SELECT DISTINCT u.id FROM users u JOIN memberships m ON m.user_id=u.id JOIN membership_roles mr ON mr.membership_id=m.id AND mr.tenant_id=m.tenant_id JOIN roles r ON r.id=mr.role_id WHERE m.tenant_id=? AND u.status='active' AND m.status='active' AND r.scope='tenant' AND r.system_key='tenant_admin' AND r.protected=1 AND EXISTS(SELECT 1 FROM identities i WHERE i.user_id=u.id AND i.status='active') AND NOT EXISTS(SELECT 1 FROM membership_scopes s WHERE s.membership_id=m.id AND s.tenant_id=m.tenant_id)`, t).map(r => String(r.id)),
            },
            dashboards: { listTenantCandidates: async (t, p) => page('dashboard_records', p, t, dashboard, 'tenant_id'), getTenantRecord: async (t, id) => getRecord(t, id), getAccess: async (t, id) => getAccess(t, id),
                create: async (r) => { const { spec, ...rest } = r; insert('dashboard_records', { ...rest, spec_json: JSON.stringify(spec), version: 1 }); return getRecord(r.tenantId, r.id)!; }, updateOwned: async (r) => { const old = getRecord(r.tenantId, r.id); if (!old || old.ownerUserId !== r.ownerUserId)
                    return { outcome: 'not_found' }; return update('dashboard_records', r.id, { spec_json: JSON.stringify(r.spec), updatedBy: r.updatedBy, updatedAt: r.updatedAt }, r.expectedVersion, () => getRecord(r.tenantId, r.id)); },
                replaceAccess: async (r, v, actor) => { if (r.scope !== 'restricted' && r.grants.length)
                    fail('INVALID_GRANTS'); if (!getRecord(r.tenantId, r.dashboardId))
                    return { outcome: 'not_found' }; const x = update('dashboard_records', r.dashboardId, { scope: r.scope, updatedBy: actor, updatedAt: new Date().toISOString() }, v, () => getAccess(r.tenantId, r.dashboardId)); if (x.outcome !== 'saved')
                    return x; run('DELETE FROM dashboard_grants WHERE tenant_id=? AND dashboard_id=?', r.tenantId, r.dashboardId); for (const g of r.grants)
                    insert('dashboard_grants', { tenant_id: r.tenantId, dashboard_id: r.dashboardId, subject_type: g.subjectType, subject_id: g.subjectId, access: g.access, role_id: g.subjectType === 'role' ? g.subjectId : null, membership_id: g.subjectType === 'membership' ? g.subjectId : null }); return { outcome: 'saved', value: getAccess(r.tenantId, r.dashboardId)! }; },
            },
            appendAudit: async (e) => { insert('admin_audit_events', { event_id: randomUUID(), actor_user_id: e.actorUserId, tenant_id: e.tenantId, customer_id: e.customerId, target_id: e.targetId, action: e.action, result: e.result, occurred_at: e.timestamp }); },
        };
    }
}
