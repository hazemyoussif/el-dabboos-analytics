import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import type { DashboardSpec } from '@el-dabboos/domain';
import { AccessControlError, tenantProfiles } from '@el-dabboos/domain';
import { MockAnalyticsRepository, generateSeedFacts, migrateMetadata, seedDemoAdministration, SqliteAdministrationStore } from '@el-dabboos/data';
import { buildApi } from '../src/app.ts';
const headers = (user = 'demo-iq-admin', tenant = 'demo-iq') => ({ 'x-demo-user-id': user, 'x-tenant-id': tenant, 'x-locale': 'en' });
async function setup() {
    const db = new DatabaseSync(':memory:');
    migrateMetadata(db, { reconcile: seedDemoAdministration });
    const store = new SqliteAdministrationStore(db), repository = new MockAnalyticsRepository([...generateSeedFacts('demo-iq'), ...generateSeedFacts('demo-eg')]);
    const app = await buildApi({ analyticsRepository: repository, dimensionValues: repository, libraryRepository: store.library, administration: { unitOfWork: store, directory: store.directory, profiles: store.profiles, authenticate: async (h) => { const id = h['x-demo-user-id']; if (typeof id !== 'string')
                throw new AccessControlError('IDENTITY_REQUIRED'); const binding = await store.read(t => t.users.findIdentity('synthetic', id)); if (!binding)
                throw new AccessControlError('IDENTITY_REQUIRED'); return binding.id; }, dataReady: async (id) => id === 'demo-iq' || id === 'demo-eg' } });
    return { app, db, store };
}
const spec: DashboardSpec = { schemaVersion: 2, id: 'portable', title: { en: 'Agent sales', ar: 'مبيعات الوكلاء' }, locale: 'en', filters: {}, layout: { columns: 1 }, widgets: [{ id: 'sales', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
test('admin API rejects wrong planes, unknown fields, cross-tenant targets, protected roles and stale versions', async () => {
    const { app, db } = await setup();
    try {
        assert.equal((await app.inject({ url: '/api/platform/customers', headers: headers() })).statusCode, 403);
        assert.equal((await app.inject({ url: '/api/tenants/demo-iq/admin/roles', headers: headers('demo-platform-admin') })).statusCode, 403);
        assert.equal((await app.inject({ url: '/api/tenants/demo-eg/admin/roles', headers: headers() })).statusCode, 403);
        const extra = await app.inject({ method: 'POST', url: '/api/tenants/demo-iq/admin/roles', headers: headers(), payload: { name: 'bad', description: '', permissions: [], metricDomains: [], protected: true } });
        assert.equal(extra.statusCode, 400);
        assert.equal(extra.json().error.code, 'INVALID_ADMIN_INPUT');
        const platform = await app.inject({ method: 'POST', url: '/api/tenants/demo-iq/admin/roles', headers: headers(), payload: { name: 'bad', description: '', permissions: ['platform:customers:manage'], metricDomains: [] } });
        assert.equal(platform.statusCode, 400);
        const role = await app.inject({ method: 'DELETE', url: '/api/tenants/demo-iq/admin/roles/admin', headers: headers(), payload: { expectedVersion: 1 } });
        assert.equal(role.statusCode, 409);
        assert.equal(role.json().error.code, 'PROTECTED_ROLE');
        const suspend = { method: 'POST' as const, url: '/api/tenants/demo-iq/admin/memberships/iq-analyst/suspend', headers: headers(), payload: { expectedVersion: 1, status: 'suspended' } };
        assert.equal((await app.inject(suspend)).statusCode, 200);
        assert.equal((await app.inject(suspend)).statusCode, 409);
        assert.equal((await app.inject({ url: '/api/saved-dashboards', headers: headers('demo-iq-analyst') })).statusCode, 403);
    }
    finally {
        await app.close();
        db.close();
    }
});
test('restricted grant cutover shares CAS and enforces list/get/library/deep links, current metrics and owner editing', async () => {
    const { app, db } = await setup();
    try {
        const created = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: headers(), payload: { dashboard: spec, scope: 'restricted' } });
        assert.equal(created.statusCode, 200);
        const r = created.json();
        const manager = headers('demo-agent-manager');
        const direct = () => app.inject({ url: `/api/saved-dashboards/${r.id}`, headers: manager });
        assert.equal((await direct()).statusCode, 404);
        const grant = { method: 'PUT' as const, url: `/api/tenants/demo-iq/admin/dashboards/${r.id}/access`, headers: headers(), payload: { scope: 'restricted', grants: [{ subjectType: 'role', subjectId: 'agent-manager', access: 'view' }], expectedVersion: 1 } };
        assert.equal((await app.inject(grant)).statusCode, 200);
        assert.equal((await direct()).statusCode, 200);
        const list = await app.inject({ url: '/api/saved-dashboards', headers: manager });
        assert.deepEqual(list.json().dashboards.map((d: {
            id: string;
        }) => d.id), [r.id]);
        const lib = await app.inject({ url: '/api/dashboard-library', headers: manager });
        assert.equal(lib.statusCode, 200);
        const other = await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${r.id}`, headers: headers('demo-iq-analyst'), payload: { dashboard: spec, expectedVersion: 2 } });
        assert.equal(other.statusCode, 404);
        assert.equal((await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${r.id}`, headers: headers(), payload: { dashboard: spec, expectedVersion: 1 } })).statusCode, 409);
        const inventory = { ...spec, widgets: [{ id: 'inventory', type: 'kpi', series: [{ id: 'inventory', metric: 'inventory_value' }] }] };
        assert.equal((await app.inject({ method: 'PUT', url: `/api/saved-dashboards/${r.id}`, headers: headers(), payload: { dashboard: inventory, expectedVersion: 2 } })).statusCode, 200);
        assert.equal((await direct()).statusCode, 403);
        assert.equal((await app.inject({ url: '/api/saved-dashboards', headers: manager })).json().dashboards.length, 0);
        assert.equal((await app.inject(grant)).statusCode, 409);
        const query = await app.inject({ method: 'POST', url: '/api/analytics/query', headers: manager, payload: { metric: 'revenue', groupBy: 'branch', filters: [{ dimension: 'branch', values: ['basra'] }] } });
        assert.equal(query.statusCode, 200);
        assert.deepEqual(query.json().rows, []);
    }
    finally {
        await app.close();
        db.close();
    }
});
test('dynamic active workspace can administer metadata, returns DATA_NOT_READY before planner, and profiles contain no branch inventions', async () => {
    const { app, db, store } = await setup();
    try {
        await store.write(async (tx) => { const meta = { version: 1, createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' }; await tx.customers.createTenant({ ...meta, id: 'dynamic-iq', customerId: 'demo-customer', name: 'New workspace', status: 'active', configuration: tenantProfiles['demo-iq'] }); await tx.tenants.createMembership({ ...meta, id: 'dynamic-admin', tenantId: 'dynamic-iq', userId: 'demo-iq-admin', status: 'active', roleIds: ['admin'], dataScopes: [] }); });
        const h = headers('demo-iq-admin', 'dynamic-iq');
        const profile = await app.inject({ url: '/api/tenant-profile', headers: h });
        assert.equal(profile.statusCode, 200);
        assert.deepEqual(profile.json().exampleBranchIds, []);
        assert.deepEqual(profile.json().branchLabels, {});
        assert.equal((await app.inject({ url: '/api/tenants/dynamic-iq/admin/tenant', headers: h })).statusCode, 200);
        for (const url of ['/api/dashboards/generate', '/api/analytics/query']) {
            const r = await app.inject({ method: 'POST', url, headers: h, payload: { prompt: 'sales', metric: 'revenue' } });
            assert.equal(r.statusCode, 503);
            assert.equal(r.json().error.code, 'DATA_NOT_READY');
        }
        assert.equal((await app.inject({ url: '/api/tenants/dynamic-iq/admin/scope-values/branch', headers: h })).json().error.code, 'DATA_NOT_READY');
    }
    finally {
        await app.close();
        db.close();
    }
});
test('resource-policy matrix includes private, tenant, membership grants, dormant suspension and Save As', async () => {
    const { app, db } = await setup();
    try {
        const create = async (dashboard: unknown, scope: string) => { const response = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: headers(), payload: { dashboard, scope } }); assert.equal(response.statusCode, 200); return response.json(); };
        const privateRecord = await create(spec, 'private'), shared = await create(spec, 'tenant'), restricted = await create(spec, 'restricted');
        const finance = await create({ ...spec, widgets: [{ id: 'finance', type: 'kpi', series: [{ id: 'balance', metric: 'outstanding_amount' }] }] }, 'tenant');
        const inventory = await create({ ...spec, widgets: [{ id: 'inventory', type: 'kpi', series: [{ id: 'stock', metric: 'inventory_value' }] }] }, 'tenant');
        const get = (user: string, id: string) => app.inject({ url: `/api/saved-dashboards/${id}`, headers: headers(user) });
        assert.equal((await get('demo-iq-admin', privateRecord.id)).statusCode, 200);
        assert.equal((await get('demo-agent-manager', privateRecord.id)).statusCode, 404);
        assert.equal((await get('demo-agent-manager', shared.id)).statusCode, 200);
        assert.equal((await get('demo-agent-manager', finance.id)).statusCode, 403);
        assert.equal((await get('demo-agent-manager', inventory.id)).statusCode, 403);
        const access = (grants: unknown[], version: number) => app.inject({ method: 'PUT', url: `/api/tenants/demo-iq/admin/dashboards/${restricted.id}/access`, headers: headers(), payload: { scope: 'restricted', grants, expectedVersion: version } });
        assert.equal((await access([{ subjectType: 'membership', subjectId: 'eg-analyst', access: 'view' }], 1)).statusCode, 404);
        assert.equal((await access([{ subjectType: 'membership', subjectId: 'iq-analyst', access: 'view' }], 1)).statusCode, 200);
        assert.equal((await get('demo-iq-analyst', restricted.id)).statusCode, 200);
        assert.equal((await get('demo-agent-manager', restricted.id)).statusCode, 404);
        const copy = await app.inject({ method: 'POST', url: '/api/saved-dashboards', headers: headers('demo-iq-analyst'), payload: { dashboard: spec } });
        assert.equal(copy.statusCode, 200);
        assert.notEqual(copy.json().id, restricted.id);
        assert.equal(copy.json().scope, 'private');
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM dashboard_grants WHERE dashboard_id=?').get(copy.json().id)?.n, 0);
        await app.inject({ method: 'POST', url: '/api/tenants/demo-iq/admin/memberships/iq-analyst/suspend', headers: headers(), payload: { expectedVersion: 1, status: 'suspended' } });
        assert.equal((await get('demo-iq-analyst', restricted.id)).statusCode, 403);
        assert.equal((await access([{ subjectType: 'membership', subjectId: 'iq-analyst', access: 'view' }], 2)).statusCode, 200); // retain an existing dormant audience, no new suspended assignment
        const race = await Promise.all([access([{ subjectType: 'role', subjectId: 'agent-manager', access: 'view' }], 3), app.inject({ method: 'PUT', url: `/api/saved-dashboards/${restricted.id}`, headers: headers(), payload: { dashboard: spec, expectedVersion: 3 } })]);
        assert.deepEqual(race.map(r => r.statusCode).sort(), [200, 409]);
        const list = await app.inject({ url: '/api/saved-dashboards', headers: headers('demo-agent-manager') });
        const ids = list.json().dashboards.map((d: {
            id: string;
        }) => d.id);
        assert.ok(!ids.includes(finance.id));
        assert.ok(!ids.includes(inventory.id));
        assert.ok(!ids.includes(privateRecord.id));
        assert.equal((await app.inject({ method: 'POST', url: `/api/saved-dashboards/${finance.id}/execute`, headers: headers('demo-agent-manager') })).statusCode, 403);
        assert.equal((await app.inject({ method: 'POST', url: `/api/saved-dashboards/${shared.id}/execute`, headers: headers('demo-platform-admin') })).statusCode, 403);
    }
    finally {
        await app.close();
        db.close();
    }
});
test('governed pagination fills accessible pages after hidden records and binds cursors to tenant', async () => {
    const { app, db, store } = await setup();
    try {
        await store.write(async (tx) => { for (const [id, scope] of [['a-hidden', 'private'], ['b-allowed', 'tenant'], ['c-hidden', 'private'], ['d-allowed', 'tenant']] as const)
            await tx.dashboards.create({ id, scope, tenantId: 'demo-iq', ownerUserId: 'demo-iq-admin', spec, version: 1, createdBy: 'demo-iq-admin', updatedBy: 'demo-iq-admin', createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z' }); });
        const list = await app.inject({ url: '/api/saved-dashboards', headers: headers('demo-agent-manager') });
        assert.deepEqual(list.json().dashboards.map((d: {
            id: string;
        }) => d.id), ['b-allowed', 'd-allowed']);
        assert.equal(list.json().total, undefined);
        const cursor = Buffer.from(JSON.stringify({ table: 'dashboard_records', partition: 'demo-eg', id: '' })).toString('base64url');
        const wrong = await app.inject({ url: `/api/saved-dashboards?cursor=${cursor}`, headers: headers('demo-agent-manager') });
        assert.equal(wrong.statusCode, 400);
    }
    finally {
        await app.close();
        db.close();
    }
});
