import { AccessControlError, assertScopeWithin, compileMembershipScopes, validateAccessRole, validateTenantConfiguration } from '@el-dabboos/domain';
import type { AccessControlledDashboardRecord, AccessRole, AuthorizationPolicy, DashboardAccessState, DashboardGrant,
  Locale, ManagedMembership, MembershipDataScope, Permission, PlatformAccessSnapshot, PlatformContext, PlatformPermission,
  ResolvedTenantAccess, TenantAccessRole, TenantAccessSnapshot } from '@el-dabboos/domain';

function requireAccess(ok: boolean, code: string): asserts ok { if (!ok) throw new AccessControlError(code); }
function assignedRoles(ids: readonly string[], roles: readonly AccessRole[]): AccessRole[] {
  requireAccess(ids.length > 0 && new Set(ids).size === ids.length && new Set(roles.map(r => r.id)).size === roles.length, 'INVALID_ASSIGNMENT');
  return ids.map(id => { const role = roles.find(r => r.id === id); requireAccess(!!role, 'INVALID_ASSIGNMENT'); validateAccessRole(role); return role; });
}
function tenantRole(role: AccessRole, tenantId: string): asserts role is TenantAccessRole {
  validateAccessRole(role);
  requireAccess(role.scope === 'tenant' && (role.protected || role.tenantId === tenantId), 'ROLE_TENANT_FORBIDDEN');
}
export function resolveTenantAccess(snapshot: TenantAccessSnapshot, identityId: string, selectedTenantId: string, locale: Locale): ResolvedTenantAccess {
  const { customer, tenant, user, identity, membership } = snapshot;
  validateTenantConfiguration(tenant);
  requireAccess(identity.id === identityId && identity.userId === user.id && identity.status === 'active' && user.status === 'active', 'IDENTITY_INACTIVE');
  requireAccess(tenant.id === selectedTenantId && customer.id === tenant.customerId && customer.status === 'active' && tenant.status === 'active', 'TENANT_INACTIVE');
  requireAccess(membership.userId === user.id && membership.tenantId === selectedTenantId && membership.status === 'active', 'MEMBERSHIP_INACTIVE');
  requireAccess(locale === 'en' || locale === 'ar', 'INVALID_LOCALE');
  const roles = assignedRoles(membership.roleIds, snapshot.roles).map(role => { tenantRole(role, selectedTenantId); return role; });
  return { plane: 'tenant', roleIds: [...membership.roleIds], context: {
    principal: { userId: user.id, membershipId: membership.id }, tenant: { tenantId: selectedTenantId }, locale,
    authorization: { permissions: [...new Set(roles.flatMap(r => r.permissions))], metricDomains: [...new Set(roles.flatMap(r => r.metricDomains))],
      enforcedFilters: compileMembershipScopes(membership.dataScopes) },
  } };
}
export function resolvePlatformAccess(snapshot: PlatformAccessSnapshot, identityId: string): PlatformContext {
  const { user, identity, assignment } = snapshot;
  requireAccess(identity.id === identityId && identity.userId === user.id && identity.status === 'active' && user.status === 'active', 'IDENTITY_INACTIVE');
  requireAccess(assignment.userId === user.id && assignment.status === 'active', 'PLATFORM_FORBIDDEN');
  const permissions = assignedRoles(assignment.roleIds, snapshot.roles).flatMap(role => {
    requireAccess(role.scope === 'platform', 'PLATFORM_FORBIDDEN'); return role.permissions;
  });
  return { plane: 'platform', userId: user.id, permissions: [...new Set(permissions)] };
}
export function authorizePlatform(actor: PlatformContext, permission: PlatformPermission): void {
  requireAccess(actor.plane === 'platform' && actor.permissions.includes(permission), 'PLATFORM_FORBIDDEN');
}
export function authorizeTenantAdministration(actor: ResolvedTenantAccess, targetTenantId: string, permission: Permission): void {
  requireAccess(actor.plane === 'tenant' && actor.context.tenant.tenantId === targetTenantId && actor.context.authorization.permissions.includes(permission), 'ADMIN_FORBIDDEN');
}
/** Grantable ceiling is the actor's effective capabilities, never all permissions just because roles:manage is present. */
export function authorizeRoleDelegation(actor: ResolvedTenantAccess, tenantId: string, roles: readonly TenantAccessRole[]): void {
  authorizeTenantAdministration(actor, tenantId, 'roles:manage');
  assertDelegableCapabilities(actor, tenantId, roles);
}
function assertDelegableCapabilities(actor: ResolvedTenantAccess, tenantId: string, roles: readonly TenantAccessRole[]): void {
  requireAccess(roles.length > 0 && new Set(roles.map(r => r.id)).size === roles.length, 'INVALID_ASSIGNMENT');
  for (const role of roles) {
    tenantRole(role, tenantId);
    requireAccess(role.permissions.every(p => actor.context.authorization.permissions.includes(p)) &&
      role.metricDomains.every(d => actor.context.authorization.metricDomains.includes(d)), 'ROLE_ESCALATION');
  }
}
export function authorizeMembershipAssignment(actor: ResolvedTenantAccess, target: ManagedMembership, roles: readonly TenantAccessRole[]): void {
  authorizeTenantAdministration(actor, target.tenantId, 'users:manage');
  authorizeRoleDelegation(actor, target.tenantId, roles);
  requireAccess(new Set(target.roleIds).size === target.roleIds.length && target.roleIds.length === roles.length && roles.every(r => target.roleIds.includes(r.id)), 'INVALID_ASSIGNMENT');
  assertScopeWithin(target.dataScopes, actorScopes(actor));
}
export function authorizeMembershipChange(actor: ResolvedTenantAccess, current: ManagedMembership, next: ManagedMembership,
  currentRoles: readonly TenantAccessRole[], nextRoles: readonly TenantAccessRole[]): void {
  requireAccess(current.id === next.id && current.userId === next.userId && current.tenantId === next.tenantId, 'IMMUTABLE_MEMBERSHIP_IDENTITY');
  authorizeMembershipAssignment(actor, current, currentRoles);
  authorizeMembershipAssignment(actor, next, nextRoles);
}
/** Role definition edits affect every assignee, so V1 reserves them to administrators without row restrictions. */
export function authorizeCustomRoleChange(actor: ResolvedTenantAccess, next: TenantAccessRole, current?: TenantAccessRole): void {
  const tenantId = actor.context.tenant.tenantId;
  requireAccess(actor.context.authorization.enforcedFilters.length === 0, 'SCOPED_ROLE_DEFINITION_FORBIDDEN');
  assertCustomRoleMutable(next, tenantId);
  if (current) { assertCustomRoleMutable(current, tenantId); requireAccess(current.id === next.id, 'IMMUTABLE_ROLE_IDENTITY'); }
  authorizeRoleDelegation(actor, tenantId, current ? [current] : [next]);
  authorizeRoleDelegation(actor, tenantId, [next]);
}
function actorScopes(actor: ResolvedTenantAccess): MembershipDataScope[] {
  return actor.context.authorization.enforcedFilters.map(s => ({ dimension: s.dimension as MembershipDataScope['dimension'], values: s.values }));
}
export function authorizeScopeChange(actor: ResolvedTenantAccess, tenantId: string, current: readonly MembershipDataScope[], next: readonly MembershipDataScope[], targetRoles: readonly TenantAccessRole[]): void {
  authorizeTenantAdministration(actor, tenantId, 'data_scopes:manage');
  assertDelegableCapabilities(actor, tenantId, targetRoles);
  // A scoped delegated administrator cannot take over a broader target, even by first narrowing it.
  assertScopeWithin(current, actorScopes(actor)); assertScopeWithin(next, actorScopes(actor));
}
export function assertCustomRoleMutable(role: TenantAccessRole, tenantId: string): void {
  tenantRole(role, tenantId); requireAccess(!role.protected, 'PROTECTED_ROLE');
}
export function assertCustomRoleDeletable(role: TenantAccessRole, tenantId: string, referenced: boolean): void {
  assertCustomRoleMutable(role, tenantId); requireAccess(!referenced, 'ROLE_IN_USE');
}
/** Call on the complete effective post-mutation administrator set under the metadata write lock. */
export function assertRecoverableAdministrators(activeAdministratorUserIds: readonly string[]): void {
  requireAccess(activeAdministratorUserIds.length > 0, 'LAST_ADMIN');
}
/** Complete post-change snapshots, not a count of role assignments (suspended users do not qualify).
 * Tenant suspension itself preserves recovery memberships and does not delete them. */
export function assertTenantAdministratorContinuity(tenantId: string, snapshots: readonly TenantAccessSnapshot[]): void {
  const users = snapshots.filter(s => s.tenant.id === tenantId && s.membership.tenantId === tenantId &&
    s.membership.userId === s.user.id && s.identity.userId === s.user.id && s.identity.status === 'active' &&
    s.user.status === 'active' && s.membership.status === 'active' && s.membership.dataScopes.length === 0).filter(s =>
      assignedRoles(s.membership.roleIds, s.roles).some(role => {
        tenantRole(role, tenantId); return role.protected && role.systemKey === 'tenant_admin';
      }));
  assertRecoverableAdministrators(users.map(s => s.user.id));
}
export function assertPlatformAdministratorContinuity(snapshots: readonly PlatformAccessSnapshot[]): void {
  const admins = snapshots.filter(s => s.identity.userId === s.user.id && s.identity.status === 'active' &&
    s.user.status === 'active' && s.assignment.userId === s.user.id && s.assignment.status === 'active').filter(s =>
      assignedRoles(s.assignment.roleIds, s.roles).some(role => role.scope === 'platform' && role.systemKey === 'platform_admin'));
  assertRecoverableAdministrators(admins.map(s => s.user.id));
}
export function validateDashboardGrants(tenantId: string, grants: readonly DashboardGrant[], roles: readonly AccessRole[], memberships: readonly ManagedMembership[]): void {
  requireAccess(grants.length <= 1000 && new Set(grants.map(g => JSON.stringify([g.subjectType, g.subjectId]))).size === grants.length, 'INVALID_GRANTS');
  for (const grant of grants) {
    requireAccess(grant.access === 'view', 'INVALID_GRANTS');
    if (grant.subjectType === 'role') {
      const role = roles.find(r => r.id === grant.subjectId); requireAccess(!!role, 'INVALID_GRANTS'); tenantRole(role, tenantId);
    } else {
      requireAccess(grant.subjectType === 'membership' && memberships.some(m => m.id === grant.subjectId && m.tenantId === tenantId && m.status === 'active'), 'INVALID_GRANTS');
    }
  }
}
/** Same predicate for list/get/execute; grants never skip current spec metric authorization. */
export function authorizeDashboardResource(record: AccessControlledDashboardRecord, access: DashboardAccessState,
  actor: ResolvedTenantAccess, policy: AuthorizationPolicy): void {
  requireAccess(actor.plane === 'tenant', 'DASHBOARD_NOT_FOUND');
  const { context } = actor;
  requireAccess(record.tenantId === context.tenant.tenantId && access.tenantId === record.tenantId &&
    access.dashboardId === record.id && access.version === record.version && access.scope === record.scope, 'DASHBOARD_NOT_FOUND');
  policy.authorize('dashboard:view', context);
  // Listings promise executable dashboards; owners also require action/domain authorization.
  policy.authorize('analytics:query', context);
  const owner = record.ownerUserId === context.principal.userId;
  const granted = access.grants.some(g => g.access === 'view' && ((g.subjectType === 'role' && actor.roleIds.includes(g.subjectId)) ||
    (g.subjectType === 'membership' && g.subjectId === context.principal.membershipId)));
  requireAccess(record.scope === 'private' ? owner : record.scope === 'tenant' || (record.scope === 'restricted' && (owner || granted)), 'DASHBOARD_NOT_FOUND');
  policy.authorizeDashboard(record.spec, context);
}
export function authorizeDashboardAccessChange(record: AccessControlledDashboardRecord, access: DashboardAccessState,
  actor: ResolvedTenantAccess, policy: AuthorizationPolicy): void {
  authorizeTenantAdministration(actor, record.tenantId, 'dashboard_access:manage');
  policy.authorize('dashboard:share', actor.context);
  authorizeDashboardResource(record, access, actor, policy);
}
