import {ApiError} from '../src/errors.ts';
import {AccessControlError} from '@el-dabboos/domain';
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { MockAnalyticsRepository, migrateMetadata, seedDemoAdministration, SqliteAdministrationStore } from '@el-dabboos/data';
import { createRouteContext } from '../src/context.ts';
import { registerAdministrationRoutes } from '../src/routes/administration.ts';
import { registerErrorHandler } from '../src/errors.ts';
test('strict mutation schemas invoke exactly the corresponding named operation with trusted path IDs', async () => {
  const database = new DatabaseSync(':memory:'); migrateMetadata(database, { reconcile: seedDemoAdministration });
  const store = new SqliteAdministrationStore(database), repository = new MockAnalyticsRepository([]);
  const employeeCalls: { actor: string; input: unknown }[] = [];
  const context = createRouteContext({ analyticsRepository: repository, dimensionValues: repository,
    administration: { unitOfWork: store, directory: store.directory, profiles: store.profiles, authenticate: async () => 'synthetic:demo-iq-admin', dataReady: async () => true,
      provisionEmployee: async (actor,input) => { employeeCalls.push({ actor,input }); return { id:'created-user' }; } } });
  assert.ok(context.administration);
  const tenantBase = '/api/tenants/demo-iq/admin';
  const role = { name: 'Reviewed', description: '', permissions: ['dashboard:view'], metricDomains: ['sales'] };
  const configuration = { countryCode: 'EG', defaultLocale: 'en', arabicDialect: 'eg', reportingCurrency: 'EGP', timeZone: 'Africa/Cairo' };
  const cases = [
    { method: 'POST', url: tenantBase + '/roles', operation: 'createRole', body: role, command: role },
    { method: 'PUT', url: tenantBase + '/roles/role-target', operation: 'updateRole', body: { ...role, expectedVersion: 7 }, command: { ...role, expectedVersion: 7, id: 'role-target' } },
    { method: 'DELETE', url: tenantBase + '/roles/role-target', operation: 'deleteRole', body: { expectedVersion: 7 }, command: { expectedVersion: 7, id: 'role-target' } },
    { method: 'POST', url: tenantBase + '/memberships', operation: 'createMembership', body: { userId: 'candidate', roleIds: ['viewer'], dataScopes: [] }, command: { userId: 'candidate', roleIds: ['viewer'], dataScopes: [] } },
    { method: 'PUT', url: tenantBase + '/memberships/member-target/roles', operation: 'changeMembershipRoles', body: { roleIds: ['viewer'], expectedVersion: 7 }, command: { roleIds: ['viewer'], expectedVersion: 7, id: 'member-target' } },
    { method: 'PUT', url: tenantBase + '/memberships/member-target/scopes', operation: 'changeMembershipScopes', body: { dataScopes: [], expectedVersion: 7 }, command: { dataScopes: [], expectedVersion: 7, id: 'member-target' } },
    { method: 'POST', url: tenantBase + '/memberships/member-target/suspend', operation: 'changeMembershipStatus', body: { status: 'suspended', expectedVersion: 7 }, command: { status: 'suspended', expectedVersion: 7, id: 'member-target' } },
    { method: 'PUT', url: tenantBase + '/tenant', operation: 'updateWorkspace', body: { name: 'Reviewed', defaultLocale: 'ar', expectedVersion: 7 }, command: { name: 'Reviewed', defaultLocale: 'ar', expectedVersion: 7 } },
    { method: 'PUT', url: tenantBase + '/dashboards/dashboard-target/access', operation: 'changeDashboardAccess', body: { scope: 'private', grants: [], expectedVersion: 7 }, command: { scope: 'private', grants: [], expectedVersion: 7, id: 'dashboard-target' } },
    { method: 'POST', url: '/api/platform/customers', operation: 'createCustomer', body: { name: 'Reviewed' }, command: { name: 'Reviewed' } },
    { method: 'PUT', url: '/api/platform/customers/customer-target', operation: 'updateCustomer', body: { name: 'Reviewed', status: 'active', expectedVersion: 7 }, command: { name: 'Reviewed', status: 'active', expectedVersion: 7, id: 'customer-target' } },
    { method: 'POST', url: '/api/platform/customers/customer-target/tenants', operation: 'createTenant', body: { name: 'Reviewed', configuration }, command: { name: 'Reviewed', configuration, customerId: 'customer-target' } },
    { method: 'PUT', url: '/api/platform/tenants/tenant-target', operation: 'updateTenant', body: { name: 'Reviewed', configuration, status: 'provisioning', expectedVersion: 7 }, command: { name: 'Reviewed', configuration, status: 'provisioning', expectedVersion: 7, id: 'tenant-target' } },
    { method: 'POST', url: '/api/platform/users/user-target/tenant-candidates', operation: 'provisionUserForTenant', body: { tenantId: 'demo-iq' }, command: { userId: 'user-target', tenantId: 'demo-iq' } },
    { method: 'PUT', url: '/api/platform/users/user-target', operation: 'updateUser', body: { displayName: 'Reviewed', preferredLocale: 'ar', status: 'active', expectedVersion: 7 }, command: { displayName: 'Reviewed', preferredLocale: 'ar', status: 'active', expectedVersion: 7, id: 'user-target' } },
    { method: 'POST', url: '/api/platform/identities/identity-target/disable', operation: 'disableIdentity', body: {}, command: { id: 'identity-target' } },
  ] as const;
  const calls: { operation: string; actor: unknown; command: unknown }[] = [];
  for (const fixture of cases) Object.assign(context.administration, { [fixture.operation]: async (actor: unknown, command: unknown) => { calls.push({ operation: fixture.operation, actor, command }); return { recorded: true }; } });
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } }); registerErrorHandler(app); registerAdministrationRoutes(app, context);
  try {
    const employee = { displayName:'New Employee',preferredLocale:'ar',email:'employee@example.test',password:'initial-passphrase' };
    const created = await app.inject({ method:'POST',url:'/api/platform/users',payload:employee,headers:{ 'x-tenant-id':'demo-iq' } });
    assert.equal(created.statusCode,200,created.body);
    assert.deepEqual(employeeCalls.pop(),{ actor:'synthetic:demo-iq-admin',input:employee });
    const invalidEmployee = await app.inject({ method:'POST',url:'/api/platform/users',payload:{...employee,unexpected:true},headers:{ 'x-tenant-id':'demo-iq' } });
    assert.equal(invalidEmployee.statusCode,400); assert.equal(employeeCalls.length,0);
    for(const failure of [{error:new AccessControlError('PLATFORM_FORBIDDEN'),status:403},{error:new ApiError(429,'USER_PROVISIONING_LIMITED','Try again later.'),status:429},{error:Object.assign(new Error('private duplicate detail'),{code:'23505'}),status:409},{error:new Error('private SQL detail'),status:503}]){
      Object.assign(context.deps.administration!,{provisionEmployee:async()=>{throw failure.error;}});
      const response=await app.inject({method:'POST',url:'/api/platform/users',payload:employee,headers:{'x-tenant-id':'demo-iq'}});
      assert.equal(response.statusCode,failure.status);assert.ok(!response.body.includes('private'));
    }
    for (const fixture of cases) {
      const response = await app.inject({ method: fixture.method, url: fixture.url, payload: fixture.body, headers: { 'x-tenant-id': 'demo-iq' } });
      assert.equal(response.statusCode, 200, response.body);
      const call = calls.pop(); assert.ok(call); assert.equal(call.operation, fixture.operation); assert.deepEqual(call.command, fixture.command);
      assert.deepEqual(call.actor, fixture.url.startsWith(tenantBase) ? { identityId: 'synthetic:demo-iq-admin', tenantId: 'demo-iq', locale: 'en' } : 'synthetic:demo-iq-admin');
      const invalid = await app.inject({ method: fixture.method, url: fixture.url, payload: { ...fixture.body, unexpected: true }, headers: { 'x-tenant-id': 'demo-iq' } });
      assert.equal(invalid.statusCode, 400); assert.equal(invalid.json().error.code, 'INVALID_ADMIN_INPUT'); assert.equal(calls.length, 0);
    }
  } finally { await app.close(); database.close(); }
});
