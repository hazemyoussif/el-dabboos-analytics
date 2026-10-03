import assert from 'node:assert/strict';
import test from 'node:test';
import { assertScopeWithin, compileMembershipScopes, validateAccessRole, validateScopeValues, validateTenantConfiguration } from '@el-dabboos/domain';
import type { AccessRole, MembershipDataScope, Permission, PlatformContext, ResolvedTenantAccess } from '@el-dabboos/domain';
import { assertCustomRoleDeletable, assertRecoverableAdministrators, authorizeCustomRoleChange, authorizeDashboardAccessChange, authorizeDashboardResource, authorizeMembershipChange, authorizePlatform, authorizeRoleDelegation, authorizeScopeChange, authorizeTenantAdministration, resolvePlatformAccess, resolveTenantAccess, validateDashboardGrants } from '../src/access-control.ts';
import { AuthorizedAnalyticsService, DefaultAuthorizationPolicy } from '../src/security.ts';
import { adminRole, agentRole, customRole, dashboardFixture, platformSnapshot, tenantSnapshot } from './fixtures/access-control.ts';
const resolve = (s = tenantSnapshot()) => resolveTenantAccess(s, s.identity.id, s.tenant.id, 'en');
const policy = new DefaultAuthorizationPolicy();
const denied = (fn: () => unknown, code: string) => assert.throws(fn, { code });
function admin() { const s = tenantSnapshot(); s.membership.roleIds = [adminRole.id]; s.membership.dataScopes = []; s.roles = [adminRole]; return resolve(s); }

test('one customer has several opaque tenant IDs; a human spans customers through separate memberships', () => {
  const iq = tenantSnapshot(); const sandbox = tenantSnapshot(); sandbox.tenant.id = 'opaque-sandbox'; sandbox.membership.tenantId = sandbox.tenant.id;
  assert.equal(resolve(iq).context.tenant.tenantId, 'workspace-iq-1');
  assert.equal(resolve(sandbox).context.tenant.tenantId, 'opaque-sandbox');
  const other = tenantSnapshot(); other.customer.id = 'customer-2'; other.tenant.customerId = 'customer-2'; other.tenant.id = 'workspace-eg'; other.membership.tenantId = 'workspace-eg'; other.membership.id = 'membership-2';
  other.membership.dataScopes = [{ dimension: 'branch', values: ['cairo'] }]; other.membership.roleIds = [adminRole.id]; other.roles = [adminRole];
  const a = resolve(iq), b = resolve(other);
  assert.equal(a.context.principal.userId, b.context.principal.userId);
  assert.notEqual(a.context.principal.membershipId, b.context.principal.membershipId);
  assert.deepEqual(a.context.authorization.enforcedFilters[0]?.values, ['baghdad']);
  assert.deepEqual(b.context.authorization.enforcedFilters[0]?.values, ['cairo']);
  assert.ok(!a.context.authorization.permissions.includes('users:manage'));
  denied(() => resolveTenantAccess(iq, iq.identity.id, 'workspace-eg', 'en'), 'TENANT_INACTIVE');
});
test('multiple selected roles union permissions and domains without pulling unassigned roles', () => {
  const s = tenantSnapshot(); const finance = { ...customRole, metricDomains: ['finance' as const] };
  s.roles = [agentRole, finance, adminRole]; s.membership.roleIds = [agentRole.id, finance.id];
  assert.deepEqual(resolve(s).context.authorization.metricDomains, ['sales', 'crm', 'finance']);
  assert.deepEqual(resolve(s).context.authorization.permissions, ['dashboard:view', 'analytics:query', 'dashboard:create']);
  s.membership.roleIds = ['unknown']; denied(() => resolve(s), 'INVALID_ASSIGNMENT');
});
test('same role works across Baghdad and Basra without putting scope in roles', () => {
  const s = tenantSnapshot(); s.membership.dataScopes = [{ dimension: 'branch', values: ['basra'] }];
  assert.deepEqual(resolve(s).roleIds, resolve().roleIds);
  assert.deepEqual(resolve(s).context.authorization.enforcedFilters, [{ dimension: 'branch', values: ['basra'] }]);
});
test('scope compilation preserves OR values and AND dimensions; rejects empty, duplicate and ungoverned scopes', () => {
  const scopes = tenantSnapshot().membership.dataScopes;
  assert.deepEqual(compileMembershipScopes(scopes), scopes);
  for (const value of [[{ dimension: 'branch', values: [] }], [{ dimension: 'branch', values: ['a', 'a'] }], [{ dimension: 'sales_team', values: ['a'] }]] )
    denied(() => compileMembershipScopes(value as MembershipDataScope[]), 'INVALID_DATA_SCOPE');
  denied(() => compileMembershipScopes([...scopes, scopes[0]!]), 'DUPLICATE_SCOPE_DIMENSION');
  assert.deepEqual(compileMembershipScopes([]), []);
  denied(() => validateScopeValues(scopes, { branch: ['baghdad'], salesperson: ['synthetic-agent-17'] }), 'STALE_DATA_SCOPE');
  denied(() => assertScopeWithin([], scopes), 'SCOPE_ESCALATION');
});
test('platform control plane can manage customer/tenant metadata but never resolves analytics membership', async () => {
  const platform = resolvePlatformAccess(platformSnapshot(), 'synthetic-ahmed');
  authorizePlatform(platform, 'platform:customers:manage'); authorizePlatform(platform, 'platform:tenants:manage');
  assert.equal('tenant' in platform, false); assert.equal('authorization' in platform, false);
  const s = tenantSnapshot(); s.roles = [...platformSnapshot().roles]; s.membership.roleIds = ['system-platform-admin'];
  denied(() => resolve(s), 'ROLE_TENANT_FORBIDDEN');
  denied(() => authorizePlatform(resolve() as unknown as PlatformContext, 'platform:customers:manage'), 'PLATFORM_FORBIDDEN');
  const { record, access } = dashboardFixture();
  denied(() => authorizeDashboardResource(record, access, platform as unknown as ResolvedTenantAccess, policy), 'DASHBOARD_NOT_FOUND');
  let queries = 0;
  const service = new AuthorizedAnalyticsService({ execute: async () => { queries++; throw new Error('must not execute'); } }, policy);
  // There is no fallback tenant membership for a platform assignment.
  for (const tenantId of ['demo-iq', 'demo-eg']) {
    await assert.rejects(async () => { const actor = resolveTenantAccess(s, s.identity.id, tenantId, 'en'); await service.execute({ metric: 'revenue' }, actor.context); });
  }
  assert.equal(queries, 0);
});
test('tenant roles reject platform permissions and foreign custom roles even when IDs match assignment', () => {
  denied(() => validateAccessRole({ ...customRole, permissions: ['platform:customers:manage'] } as unknown as AccessRole), 'INVALID_TENANT_ROLE');
  const s = tenantSnapshot(); s.roles = [{ ...customRole, tenantId: 'other' }]; s.membership.roleIds = [customRole.id];
  denied(() => resolve(s), 'ROLE_TENANT_FORBIDDEN');
  denied(() => authorizeTenantAdministration(admin(), 'other', 'users:manage'), 'ADMIN_FORBIDDEN');
});
test('tenant admin delegation checks action, current/next capabilities and scopes', () => {
  authorizeCustomRoleChange(admin(), customRole);
  const actor = resolve(); actor.context.authorization.permissions = ['users:manage'];
  denied(() => authorizeRoleDelegation(actor, 'workspace-iq-1', [customRole]), 'ADMIN_FORBIDDEN');
  actor.context.authorization.permissions = ['users:manage', 'roles:manage'];
  denied(() => authorizeRoleDelegation(actor, 'workspace-iq-1', [customRole]), 'ROLE_ESCALATION');
  denied(() => authorizeCustomRoleChange(actor, customRole), 'SCOPED_ROLE_DEFINITION_FORBIDDEN');
  const current = tenantSnapshot().membership;
  authorizeMembershipChange(admin(), current, { ...current, roleIds: [customRole.id] }, [agentRole], [customRole]);
  denied(() => authorizeMembershipChange(admin(), current, { ...current, userId: 'other' }, [agentRole], [agentRole]), 'IMMUTABLE_MEMBERSHIP_IDENTITY');
  actor.context.authorization.permissions = ['data_scopes:manage', 'dashboard:view', 'analytics:query'];
  denied(() => authorizeScopeChange(actor, 'workspace-iq-1', current.dataScopes, [], [agentRole]), 'SCOPE_ESCALATION');
  denied(() => authorizeScopeChange(actor, 'workspace-iq-1', [], current.dataScopes, [agentRole]), 'SCOPE_ESCALATION');
});
test('protected and assigned custom roles cannot be deleted; last active administrator cannot be removed', () => {
  denied(() => assertCustomRoleDeletable(adminRole, 'workspace-iq-1', false), 'PROTECTED_ROLE');
  denied(() => assertCustomRoleDeletable(customRole, 'workspace-iq-1', true), 'ROLE_IN_USE');
  assertCustomRoleDeletable(customRole, 'workspace-iq-1', false);
  denied(() => assertRecoverableAdministrators([]), 'LAST_ADMIN');
  assertRecoverableAdministrators(['remaining-active-admin']);
});
for (const subject of ['user', 'identity', 'membership', 'tenant', 'customer'] as const) test(`suspended ${subject} denied on next resolution`, () => {
  const s = tenantSnapshot();
  if (subject === 'identity') s.identity.status = 'disabled'; else s[subject].status = 'suspended';
  assert.throws(() => resolve(s));
});
test('invited users and provisioning tenants have no ordinary tenant session; invalid market configuration rejected', () => {
  const s = tenantSnapshot(); s.user.status = 'invited'; denied(() => resolve(s), 'IDENTITY_INACTIVE');
  s.user.status = 'active'; s.tenant.status = 'provisioning'; denied(() => resolve(s), 'TENANT_INACTIVE');
  s.tenant.configuration.reportingCurrency = 'EGP'; denied(() => validateTenantConfiguration(s.tenant), 'INVALID_TENANT_CONFIGURATION');
});
test('restricted grants gate list and deep-link candidates; membership exceptions are tenant-bound', () => {
  const { record, access } = dashboardFixture(); const actor = resolve();
  authorizeDashboardResource(record, access, actor, policy);
  denied(() => authorizeDashboardResource(record, { ...access, grants: [] }, actor, policy), 'DASHBOARD_NOT_FOUND');
  const exception = { subjectType: 'membership' as const, subjectId: actor.context.principal.membershipId, access: 'view' as const };
  authorizeDashboardResource(record, { ...access, grants: [exception] }, actor, policy);
  denied(() => validateDashboardGrants('other', [exception], [], [tenantSnapshot().membership]), 'INVALID_GRANTS');
  denied(() => authorizeDashboardResource({ ...record, tenantId: 'other' }, access, actor, policy), 'DASHBOARD_NOT_FOUND');
  denied(() => authorizeDashboardResource(record, { ...access, version: 2 }, actor, policy), 'DASHBOARD_NOT_FOUND');
});
test('grant and ownership never bypass updated metrics or missing action permissions', () => {
  const { record, access } = dashboardFixture(); record.spec.widgets[0]!.series[0]!.metric = 'inventory_value';
  denied(() => authorizeDashboardResource(record, access, resolve(), policy), 'METRIC_FORBIDDEN');
  record.ownerUserId = 'ahmed'; denied(() => authorizeDashboardResource(record, access, resolve(), policy), 'METRIC_FORBIDDEN');
  record.spec.widgets[0]!.series[0]!.metric = 'revenue';
  for (const missing of ['dashboard:view', 'analytics:query'] as Permission[]) {
    const actor = resolve(); actor.context.authorization.permissions = actor.context.authorization.permissions.filter(p => p !== missing);
    denied(() => authorizeDashboardResource(record, access, actor, policy), 'PERMISSION_DENIED');
  }
});
test('private owner and tenant sharing compatibility; tenant administrators get no implicit restricted grant', () => {
  const { record, access } = dashboardFixture();
  denied(() => authorizeDashboardResource(record, access, admin(), policy), 'DASHBOARD_NOT_FOUND');
  for (const scope of ['private', 'tenant'] as const) {
    const r = { ...record, scope }, a = { ...access, scope, grants: [] };
    if (scope === 'private') denied(() => authorizeDashboardResource(r, a, resolve(), policy), 'DASHBOARD_NOT_FOUND');
    else authorizeDashboardResource(r, a, resolve(), policy);
    authorizeDashboardResource({ ...r, ownerUserId: 'ahmed' }, a, resolve(), policy);
  }
  denied(() => authorizeDashboardAccessChange(record, access, resolve(), policy), 'ADMIN_FORBIDDEN');
});

test('last-admin continuity counts active humans and identities, not just role rows', async () => {
  const { assertTenantAdministratorContinuity } = await import('../src/access-control.ts');
  const a = tenantSnapshot(); a.membership.dataScopes = []; a.roles = [adminRole]; a.membership.roleIds = [adminRole.id];
  const b = structuredClone(a); b.user.id = 'backup'; b.identity.userId = 'backup'; b.identity.id = 'backup-id'; b.membership.userId = 'backup'; b.membership.id = 'backup-membership';
  const check = () => assertTenantAdministratorContinuity(a.tenant.id, [a, b]);
  check(); a.membership.status = 'suspended'; check();
  b.user.status = 'suspended'; denied(check, 'LAST_ADMIN');
  b.user.status = 'active'; b.identity.status = 'disabled'; denied(check, 'LAST_ADMIN');
  b.identity.status = 'active'; b.roles = [customRole]; b.membership.roleIds = [customRole.id]; denied(check, 'LAST_ADMIN');
  b.roles = [adminRole]; b.membership.roleIds = [adminRole.id]; b.tenant.status = 'suspended'; check();
});

test('platform recovery excludes disabled identity, suspended assignment and support-only roles', async () => {
  const { assertPlatformAdministratorContinuity } = await import('../src/access-control.ts');
  const s = platformSnapshot(); assertPlatformAdministratorContinuity([s]);
  s.identity.status = 'disabled'; denied(() => assertPlatformAdministratorContinuity([s]), 'LAST_ADMIN');
  s.identity.status = 'active'; s.assignment.status = 'suspended'; denied(() => assertPlatformAdministratorContinuity([s]), 'LAST_ADMIN');
  s.assignment.status = 'active'; s.roles = s.roles.map(r => ({ ...r, scope: 'platform', protected: true, systemKey: 'support_admin', permissions: ['platform:users:view'] } as AccessRole));
  denied(() => assertPlatformAdministratorContinuity([s]), 'LAST_ADMIN');
});
test('custom-role Agent gets the same functional capability with a narrower individual scope', () => {
  const s = tenantSnapshot(); const role = { ...customRole, permissions: agentRole.permissions, metricDomains: agentRole.metricDomains };
  s.user.id = 'synthetic-agent'; s.identity.userId = s.user.id; s.membership.userId = s.user.id;
  s.membership.roleIds = [role.id]; s.roles = [role]; s.membership.dataScopes = [{ dimension: 'branch', values: ['baghdad'] }, { dimension: 'salesperson', values: ['synthetic-agent-17'] }];
  assert.deepEqual(resolve(s).context.authorization.metricDomains, ['sales', 'crm']);
  assert.deepEqual(resolve(s).context.authorization.enforcedFilters[1]?.values, ['synthetic-agent-17']);
});

test('Agent Manager handcrafted finance query fails before repository execution', async () => {
  let called = false;
  const service = new AuthorizedAnalyticsService({ execute: async () => { called = true; throw new Error('unexpected execution'); } }, policy);
  await assert.rejects(service.execute({ metric: 'outstanding_amount' }, resolve().context), { code: 'METRIC_FORBIDDEN' });
  assert.equal(called, false);
});
