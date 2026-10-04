import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccessControlError } from '@el-dabboos/domain';
import { createAdministration, DemoIdentityProvider, bootstrapAdministration, provisionTenantAdministrator, provisionAssignmentCandidate } from '../../application/src/index.ts';
import { SqliteAdministrationStore } from '../src/metadata/administration.ts';
import { migrateMetadata } from '../src/metadata/migrations.ts';
import { seedDemoAdministration } from '../src/metadata/demo-seed.ts';
const actor = { identityId: 'synthetic:demo-iq-admin', tenantId: 'demo-iq', locale: 'en' as const };
const setup = () => { const db = new DatabaseSync(':memory:'); migrateMetadata(db, { reconcile: seedDemoAdministration }); const store = new SqliteAdministrationStore(db); return { db, store, service: createAdministration(store) }; };
const code = (c: string) => (e: unknown) => e instanceof AccessControlError && e.code === c;
test('persistent demo authorization parity, role unions and fresh lifecycle resolution', async () => {
    const { db, service } = setup();
    try {
        const legacy = new DemoIdentityProvider();
        for (const user of legacy.listUsers())
            for (const m of legacy.membershipsFor(user.id)) {
                const next = (await service.resolveTenant({ ...actor, identityId: `synthetic:${user.id}`, tenantId: m.tenantId })).context;
                const old = legacy.resolve(user.id, m.tenantId, 'en');
                assert.deepEqual([...next.authorization.metricDomains].sort(), [...old.authorization.metricDomains].sort());
                assert.deepEqual(next.authorization.enforcedFilters, old.authorization.enforcedFilters);
                assert.ok(old.authorization.permissions.every(p => next.authorization.permissions.includes(p)));
                if (user.id !== 'demo-iq-admin')
                    assert.deepEqual([...next.authorization.permissions].sort(), [...old.authorization.permissions].sort());
            }
        await service.changeMembershipStatus(actor, {  id: 'iq-analyst', expectedVersion: 1, status: 'suspended' });
        await assert.rejects(service.resolveTenant({ ...actor, identityId: 'synthetic:demo-iq-analyst' }), code('MEMBERSHIP_INACTIVE'));
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_audit_events').get()?.n, 1);
    }
    finally {
        db.close();
    }
});
test('platform has metadata authority without implicit tenant analytics and tenant admin has no platform authority', async () => {
    const { db, service } = setup();
    try {
        assert.equal((await service.resolvePlatform('synthetic:demo-platform-admin')).plane, 'platform');
        await assert.rejects(service.resolveTenant({ ...actor, identityId: 'synthetic:demo-platform-admin' }), code('ACCESS_DENIED'));
        await assert.rejects(service.resolvePlatform(actor.identityId), code('ACCESS_DENIED'));
        const customer = await service.createCustomer('synthetic:demo-platform-admin', {  name: 'New customer' });
        assert.ok('id' in customer);
    }
    finally {
        db.close();
    }
});
test('custom roles refuse escalation, protected edits, referenced deletion and stale versions', async () => {
    const { db, service } = setup();
    try {
        const created = await service.createRole(actor, {  name: 'Sales', description: 'custom', permissions: ['dashboard:view', 'analytics:query'], metricDomains: ['sales'] });
        assert.ok('id' in created);
        if (!('id' in created))
            throw Error('missing role');
        await service.updateRole(actor, {  id: created.id, expectedVersion: 1, name: 'Renamed', description: 'custom', permissions: ['dashboard:view', 'analytics:query'], metricDomains: ['sales'] });
        await assert.rejects(service.updateRole(actor, {  id: created.id, expectedVersion: 1, name: 'Stale', description: '', permissions: [], metricDomains: [] }), code('VERSION_CONFLICT'));
        await assert.rejects(service.deleteRole(actor, {  id: 'admin', expectedVersion: 1 }), code('PROTECTED_ROLE'));
        await assert.rejects(service.deleteRole(actor, {  id: 'demo-sales-viewer', expectedVersion: 1 }), code('ROLE_IN_USE'));
        await assert.rejects(service.changeMembershipRoles({ ...actor, identityId: 'synthetic:demo-agent-manager' }, {  id: 'iq-agent', expectedVersion: 1, roleIds: ['admin'] }));
    }
    finally {
        db.close();
    }
});
test('serialized concurrent removal retains a recoverable last tenant administrator and audits only committed mutation', async () => {
    const { db, store, service } = setup();
    try {
        await store.write(async (tx) => { const m = (await tx.tenants.getMembership('demo-iq', 'iq-analyst'))!; await tx.tenants.updateMembership({ ...m, roleIds: ['admin'] }, 1); });
        const other = { ...actor, identityId: 'synthetic:demo-iq-analyst' };
        const outcomes = await Promise.allSettled([service.changeMembershipStatus(actor, {  id: 'iq-admin', expectedVersion: 1, status: 'suspended' }), service.changeMembershipStatus(other, {  id: 'iq-analyst', expectedVersion: 2, status: 'suspended' })]);
        assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
        assert.equal((await store.write(tx => tx.tenants.activeAdministratorUserIds('demo-iq'))).length, 1);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_audit_events').get()?.n, 1);
    }
    finally {
        db.close();
    }
});
test('last-admin scope narrowing, global suspension and identity disable roll back', async () => {
    const { db, service } = setup();
    try {
        await assert.rejects(service.changeMembershipScopes(actor, {  id: 'iq-admin', expectedVersion: 1, dataScopes: [{ dimension: 'branch', values: ['baghdad'] }] }, { branch: ['baghdad'] }), code('LAST_ADMIN'));
        await assert.rejects(service.updateUser('synthetic:demo-platform-admin', {  id: 'demo-iq-admin', expectedVersion: 1, displayName: 'Iraq Admin', preferredLocale: 'en', status: 'suspended' }), code('LAST_ADMIN'));
        await assert.rejects(service.disableIdentity('synthetic:demo-platform-admin', {  id: 'synthetic:demo-platform-admin' }), code('LAST_ADMIN'));
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_audit_events').get()?.n, 0);
        assert.ok((await service.resolveTenant(actor)).context.authorization.enforcedFilters.length === 0);
    }
    finally {
        db.close();
    }
});
test('scope validation stays restrictive, enforces canonical values, and applies on next request', async () => {
    const { db, service } = setup();
    try {
        await assert.rejects(service.changeMembershipScopes(actor, {  id: 'iq-agent-manager', expectedVersion: 1, dataScopes: [{ dimension: 'branch', values: ['fake'] }] }, { branch: ['baghdad'] }), code('STALE_DATA_SCOPE'));
        await service.changeMembershipScopes(actor, {  id: 'iq-agent-manager', expectedVersion: 1, dataScopes: [{ dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['salesperson_1', 'salesperson_2'] }] }, { branch: ['baghdad'], salesperson: ['salesperson_1', 'salesperson_2'] });
        assert.equal((await service.resolveTenant({ ...actor, identityId: 'synthetic:demo-agent-manager' })).context.authorization.enforcedFilters.length, 2);
    }
    finally {
        db.close();
    }
});
test('audit failure rolls back mutation and cross-tenant role references fail', async () => {
    const { db, store, service } = setup();
    try {
        db.exec("CREATE TRIGGER test_audit_failure BEFORE INSERT ON admin_audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable');END");
        await assert.rejects(service.changeMembershipStatus(actor, {  id: 'iq-analyst', expectedVersion: 1, status: 'suspended' }));
        assert.equal((await service.resolveTenant({ ...actor, identityId: 'synthetic:demo-iq-analyst' })).plane, 'tenant');
        await assert.rejects(store.write(async (tx) => { const m = (await tx.tenants.getMembership('demo-eg', 'eg-analyst'))!; await tx.tenants.updateMembership({ ...m, roleIds: ['demo-sales-viewer'] }, 1); }));
    }
    finally {
        db.close();
    }
});
test('dynamic customer/tenant persistence provides empty trusted examples without granting readiness', async () => {
    const { db, store, service } = setup();
    try {
        const r = await service.createTenant('synthetic:demo-platform-admin', {  customerId: 'demo-customer', name: 'Dynamic workspace', configuration: { countryCode: 'IQ', arabicDialect: 'iq', defaultLocale: 'en', reportingCurrency: 'IQD', timeZone: 'Asia/Baghdad' } });
        assert.ok('id' in r);
        if (!('id' in r))
            throw Error('missing tenant');
        const p = await store.profiles.get(r.id, 'en');
        assert.deepEqual(p?.exampleBranchIds, []);
        assert.deepEqual(p?.branchLabels, {});
        await assert.rejects(service.resolveTenant({ ...actor, tenantId: r.id }), code('ACCESS_DENIED'));
    }
    finally {
        db.close();
    }
});
test('two connections to the same metadata file serialize callbacks and optimistic role versions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'admin-test-')), path = join(dir, 'metadata.db'), a = new DatabaseSync(path);
    migrateMetadata(a, { reconcile: seedDemoAdministration });
    const b = new DatabaseSync(path);
    try {
        const first = createAdministration(new SqliteAdministrationStore(a)), second = createAdministration(new SqliteAdministrationStore(b));
        const command = { action: 'role.update' as const, id: 'demo-sales-viewer', expectedVersion: 1, name: 'Updated', description: 'custom', permissions: ['dashboard:view' as const], metricDomains: ['sales' as const] };
        const results = await Promise.allSettled([first.updateRole(actor, command), second.updateRole(actor, command)]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(a.prepare("SELECT version FROM roles WHERE id='demo-sales-viewer'").get()?.version, 2);
    }
    finally {
        a.close();
        b.close();
        rmSync(dir, { recursive: true, force: true });
    }
});
test('offline bootstrap is one-use, separates identities and platform assignment, and tenant activation is explicit', async () => {
    const db = new DatabaseSync(':memory:');
    migrateMetadata(db);
    const store = new SqliteAdministrationStore(db);
    try {
        const result = await bootstrapAdministration(store, { displayName: 'Verified operator', provider: 'test-issuer/realm', providerSubject: 'verified-subject', preferredLocale: 'en' }, 'verified-operational-reference');
        await assert.rejects(bootstrapAdministration(store, { displayName: 'Replay', provider: 'test-issuer/realm', providerSubject: 'other', preferredLocale: 'en' }, 'replay'), code('BOOTSTRAP_COMPLETED'));
        const service = createAdministration(store);
        assert.equal((await service.resolvePlatform(result.identityId)).plane, 'platform');
        const meta = { version: 1, createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' };
        await store.write(async (tx) => { await tx.customers.createCustomer({ ...meta, id: 'customer', name: 'Synthetic account', status: 'active' }); await tx.customers.createTenant({ ...meta, id: 'new-tenant', customerId: 'customer', name: 'Workspace', status: 'provisioning', configuration: { countryCode: 'EG', arabicDialect: 'eg', reportingCurrency: 'EGP', timeZone: 'Africa/Cairo', defaultLocale: 'en' } }); await tx.users.createUser({ ...meta, id: 'initial-admin', displayName: 'Verified human', preferredLocale: 'en', status: 'active' }); await tx.users.bindIdentity({ id: 'verified-human', userId: 'initial-admin', provider: 'test-issuer/realm', providerSubject: 'tenant-admin', status: 'active' }); });
        await provisionTenantAdministrator(store, result.identityId, 'new-tenant', 'verified-human', 1);
        await assert.rejects(service.resolveTenant({ identityId: result.identityId, tenantId: 'new-tenant', locale: 'en' }), code('ACCESS_DENIED'));
        assert.equal((await service.resolveTenant({ identityId: 'verified-human', tenantId: 'new-tenant', locale: 'en' })).context.authorization.enforcedFilters.length, 0);
        await assert.rejects(provisionTenantAdministrator(store, result.identityId, 'new-tenant', result.identityId, 2), code('INVALID_ADMIN_INPUT'));
    }
    finally {
        db.close();
    }
});
test('tenant-local operational candidate is assignable but guessed global user ID is denied', async () => {
    const { db, store, service } = setup();
    try {
        await assert.rejects(service.createMembership(actor, {  userId: 'demo-eg-analyst', roleIds: ['agent-manager'], dataScopes: [] }), code('NOT_FOUND'));
        await provisionAssignmentCandidate(store, 'synthetic:demo-platform-admin', 'demo-iq', 'synthetic:demo-eg-analyst');
        const assigned = await service.createMembership(actor, {  userId: 'demo-eg-analyst', roleIds: ['agent-manager'], dataScopes: [] });
        assert.ok('roleIds' in assigned);
        const iq = (await service.resolveTenant({ ...actor, identityId: 'synthetic:demo-eg-analyst' })).context, eg = (await service.resolveTenant({ ...actor, identityId: 'synthetic:demo-eg-analyst', tenantId: 'demo-eg' })).context;
        assert.deepEqual([...iq.authorization.metricDomains].sort(), ['crm', 'sales']);
        assert.ok(eg.authorization.metricDomains.includes('finance'));
        assert.ok(!iq.authorization.metricDomains.includes('finance'));
    }
    finally {
        db.close();
    }
});
test('persisted delegated admin cannot alter current higher capabilities or create a role above its ceiling', async () => {
    const { db, store, service } = setup();
    try {
        await store.write(async (tx) => { const meta = { version: 1, createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' }; await tx.tenants.createCustomRole({ ...meta, id: 'delegated', name: 'Delegated administrator', description: 'bounded', scope: 'tenant', tenantId: 'demo-iq', protected: false, permissions: ['roles:view', 'roles:manage', 'users:view', 'users:manage', 'data_scopes:view', 'data_scopes:manage'], metricDomains: ['sales'] }); const m = (await tx.tenants.getMembership('demo-iq', 'iq-custom'))!; await tx.tenants.updateMembership({ ...m, roleIds: ['delegated'] }, 1); });
        const delegated = { ...actor, identityId: 'synthetic:demo-custom-user' };
        await assert.rejects(service.createRole(delegated, {  name: 'Finance', description: 'over ceiling', permissions: ['roles:view'], metricDomains: ['finance'] }), code('ROLE_ESCALATION'));
        await assert.rejects(service.changeMembershipRoles(delegated, {  id: 'iq-admin', expectedVersion: 1, roleIds: ['demo-sales-viewer'] }), code('ROLE_ESCALATION'));
        await assert.rejects(service.changeMembershipStatus(delegated, {  id: 'iq-admin', expectedVersion: 1, status: 'suspended' }), code('ROLE_ESCALATION'));
    }
    finally {
        db.close();
    }
});
test('denied mutation audit is bounded identifier evidence in a separate safe sink', async () => {
    const { db, service } = setup();
    try {
        await assert.rejects(service.deleteRole(actor, {  id: 'admin', expectedVersion: 1 }), code('PROTECTED_ROLE'));
        assert.equal(service.failureAuditEvents.length, 1);
        assert.deepEqual(Object.keys(service.failureAuditEvents[0]!).sort(), ['action', 'actorUserId', 'result', 'targetId', 'tenantId', 'timestamp']);
        assert.equal(service.failureAuditEvents[0]?.result, 'denied');
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admin_audit_events').get()?.n, 0);
    }
    finally {
        db.close();
    }
});

test('administration read DTOs expose exact safe fields and preserve tenant role counts', async () => {
    const { db, service } = setup();
    try {
        const members = await service.listMemberships(actor);
        assert.ok('items' in members);
        const membership = members.items.find(item => 'userId' in item && item.userId === 'demo-iq-admin');
        assert.ok(membership);
        assert.deepEqual(Object.keys(membership).sort(), ['createdAt', 'dataScopes', 'id', 'identities', 'roleIds', 'roles', 'status', 'tenantId', 'updatedAt', 'user', 'userId', 'version']);
        assert.ok('user' in membership);
        assert.deepEqual(Object.keys(membership.user).sort(), ['displayName', 'id', 'status']);
        const roles = await service.listRoles(actor);
        assert.deepEqual(Object.keys(roles).sort(), ['grantableMetricDomains', 'grantablePermissions', 'items']);
    } finally { db.close(); }
});
test('invalid membership candidate fails before assignment authorization; protected role fails before version conflict', async () => {
    const { db, service } = setup();
    try {
        await assert.rejects(service.createMembership({ ...actor, identityId: 'synthetic:demo-agent-manager' }, {  userId: 'unknown', roleIds: ['admin'], dataScopes: [] }), code('NOT_FOUND'));
        await assert.rejects(service.updateRole(actor, {  id: 'admin', expectedVersion: 999, name: 'Renamed', description: '', permissions: [], metricDomains: [] }), code('PROTECTED_ROLE'));
    } finally { db.close(); }
});
