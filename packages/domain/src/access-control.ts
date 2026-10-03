/** Administration v1 contracts; persistent wiring is deliberately a separate milestone. */
import type { AnalyticsFilter, Locale, TenantProfile } from './contracts.ts';
import type { DashboardRecord } from './dashboard-repository.ts';
import type { MetricDomain } from './metric-registry.ts';
import { tenantPermissions } from './security.ts';
import type { Permission, RequestContext } from './security.ts';

export interface VersionedMetadata { version: number; createdAt: string; updatedAt: string }
export interface CustomerAccount extends VersionedMetadata { id: string; name: string; status: 'active' | 'suspended' }
export interface ManagedTenant extends VersionedMetadata {
  id: string; customerId: string; name: string; status: 'provisioning' | 'active' | 'suspended';
  configuration: Pick<TenantProfile, 'countryCode' | 'defaultLocale' | 'arabicDialect' | 'reportingCurrency' | 'timeZone'>;
}
export interface ProductUser extends VersionedMetadata { id: string; displayName: string; preferredLocale: Locale; status: 'invited' | 'active' | 'suspended' }
/** provider is a configured issuer key (including issuer/realm), never a user-selected IdP. */
export interface IdentityBinding { id: string; userId: string; provider: string; providerSubject: string; loginHint?: string; status: 'active' | 'disabled' }
export const platformPermissions = ['platform:customers:view', 'platform:customers:manage', 'platform:tenants:view',
  'platform:tenants:manage', 'platform:users:view', 'platform:users:manage'] as const;
export type PlatformPermission = typeof platformPermissions[number];
export const accessMetricDomains = ['sales', 'crm', 'finance', 'inventory', 'purchasing', 'customers', 'maintenance'] as const satisfies readonly MetricDomain[];
interface RoleMetadata extends VersionedMetadata { id: string; name: string; description: string }
export type TenantAccessRole = RoleMetadata & { scope: 'tenant'; permissions: readonly Permission[]; metricDomains: readonly MetricDomain[] } & (
  | { protected: true; systemKey: 'tenant_admin' | 'manager' | 'agent_manager' | 'analyst' | 'viewer' | 'sales_analyst'; tenantId?: never }
  | { protected: false; tenantId: string; systemKey?: never }
);
export type PlatformAccessRole = RoleMetadata & { scope: 'platform'; protected: true; systemKey: 'platform_admin' | 'support_admin'; permissions: readonly PlatformPermission[]; tenantId?: never; metricDomains?: never };
export type AccessRole = TenantAccessRole | PlatformAccessRole;
export const scopeDimensions = ['region', 'branch', 'salesperson'] as const;
export type ScopeDimension = typeof scopeDimensions[number];
export interface MembershipDataScope { dimension: ScopeDimension; values: readonly string[] }
export interface ManagedMembership extends VersionedMetadata {
  id: string; userId: string; tenantId: string; status: 'active' | 'suspended';
  roleIds: readonly string[]; dataScopes: readonly MembershipDataScope[];
}
export interface PlatformAssignment extends VersionedMetadata { userId: string; roleIds: readonly string[]; status: 'active' | 'suspended' }
export interface PlatformContext { plane: 'platform'; userId: string; permissions: readonly PlatformPermission[] }
/** Trusted, request-local resolution. Never accepted from an HTTP body or retained as a session cache. */
export interface ResolvedTenantAccess { plane: 'tenant'; context: RequestContext; roleIds: readonly string[] }
export type ManagedDashboardScope = DashboardRecord['scope'] | 'restricted';
export type AccessControlledDashboardRecord = Omit<DashboardRecord, 'scope'> & { scope: ManagedDashboardScope };
export interface DashboardGrant { subjectType: 'role' | 'membership'; subjectId: string; access: 'view' }
/** Version is shared with DashboardRecord: spec, visibility and audience race on one CAS token. */
export interface DashboardAccessState { dashboardId: string; tenantId: string; version: number; scope: ManagedDashboardScope; grants: readonly DashboardGrant[] }
export interface TenantInvitation extends VersionedMetadata {
  id: string; tenantId: string; targetLogin: string; roleIds: readonly string[]; dataScopes: readonly MembershipDataScope[];
  expiresAt: string; invitedBy: string; status: 'pending' | 'accepted' | 'revoked' | 'expired';
  /** One-use token hash, never a reusable secret. Actual invitation delivery is deferred. */
  tokenDigest: string;
}
export const adminAuditActions = ['customer.created', 'customer.updated', 'tenant.created', 'tenant.updated', 'tenant.suspended',
  'user.updated', 'user.suspended', 'identity.disabled', 'membership.created', 'membership.candidate_provisioned', 'membership.updated', 'membership.suspended',
  'membership.roles_changed', 'membership.scope_changed', 'role.created', 'role.updated', 'role.deleted',
  'dashboard.access_changed', 'invitation.created', 'invitation.revoked', 'invitation.accepted', 'platform.access_changed'] as const;
export interface AdminAuditEvent {
  actorUserId: string; tenantId?: string; customerId?: string; targetId: string;
  action: typeof adminAuditActions[number]; timestamp: string; result: 'allowed' | 'denied' | 'error';
}
export class AccessControlError extends Error { constructor(readonly code: string) { super(code); } }
function requireInvariant(ok: boolean, code: string): asserts ok { if (!ok) throw new AccessControlError(code); }
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value;
const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

/** Reject corrupted adapter output as well as invalid admin input; no unknown permission is ignored. */
export function validateAccessRole(role: AccessRole): void {
  requireInvariant(id(role.id) && id(role.name) && Number.isInteger(role.version) && role.version > 0, 'INVALID_ROLE');
  requireInvariant(Array.isArray(role.permissions) && unique(role.permissions), 'INVALID_ROLE');
  if (role.scope === 'platform') {
    requireInvariant(role.protected === true && ['platform_admin', 'support_admin'].includes(role.systemKey) &&
      role.tenantId === undefined && role.metricDomains === undefined && role.permissions.every(p => platformPermissions.includes(p)), 'INVALID_PLATFORM_ROLE');
  } else {
    requireInvariant(role.scope === 'tenant' && role.permissions.every(p => tenantPermissions.includes(p)), 'INVALID_TENANT_ROLE');
    requireInvariant(Array.isArray(role.metricDomains) && unique(role.metricDomains) && role.metricDomains.every(d => accessMetricDomains.includes(d)), 'INVALID_ROLE_DOMAINS');
    requireInvariant(role.protected === true
      ? role.tenantId === undefined && ['tenant_admin', 'manager', 'agent_manager', 'analyst', 'viewer', 'sales_analyst'].includes(role.systemKey)
      : role.protected === false && id(role.tenantId) && role.systemKey === undefined, 'INVALID_ROLE_OWNERSHIP');
  }
}
export function validateTenantConfiguration(tenant: ManagedTenant): void {
  const c = tenant.configuration;
  requireInvariant(id(tenant.id) && id(tenant.customerId) && id(tenant.name), 'INVALID_TENANT');
  requireInvariant(['provisioning', 'active', 'suspended'].includes(tenant.status), 'INVALID_TENANT');
  requireInvariant(c.defaultLocale === 'en' || c.defaultLocale === 'ar', 'INVALID_TENANT_CONFIGURATION');
  // Deliberately retain approved market profiles; opaque workspace IDs are independent of markets.
  requireInvariant((c.countryCode === 'IQ' && c.arabicDialect === 'iq' && c.reportingCurrency === 'IQD' && c.timeZone === 'Asia/Baghdad') ||
    (c.countryCode === 'EG' && c.arabicDialect === 'eg' && c.reportingCurrency === 'EGP' && c.timeZone === 'Africa/Cairo'), 'INVALID_TENANT_CONFIGURATION');
}
export function compileMembershipScopes(scopes: readonly MembershipDataScope[]): AnalyticsFilter[] {
  requireInvariant(Array.isArray(scopes) && scopes.length <= scopeDimensions.length, 'INVALID_DATA_SCOPE');
  requireInvariant(unique(scopes.map(s => s.dimension)), 'DUPLICATE_SCOPE_DIMENSION');
  return scopes.map(s => {
    requireInvariant(scopeDimensions.includes(s.dimension) && Array.isArray(s.values) && s.values.length > 0 &&
      s.values.length <= 1000 && s.values.every(id) && unique(s.values), 'INVALID_DATA_SCOPE');
    return { dimension: s.dimension, values: [...s.values] };
  });
}
/** Source discovery supplies canonical values. Missing/stale values never turn into unrestricted access. */
export function validateScopeValues(scopes: readonly MembershipDataScope[], available: Readonly<Partial<Record<ScopeDimension, readonly string[]>>>): void {
  compileMembershipScopes(scopes);
  for (const s of scopes) requireInvariant(s.values.every(v => available[s.dimension]?.includes(v)), 'STALE_DATA_SCOPE');
}
/** The target cannot remove or broaden a dimension restriction imposed on the administering actor. */
export function assertScopeWithin(target: readonly MembershipDataScope[], ceiling: readonly MembershipDataScope[]): void {
  compileMembershipScopes(target); compileMembershipScopes(ceiling);
  for (const limit of ceiling) {
    const requested = target.find(s => s.dimension === limit.dimension);
    requireInvariant(!!requested && requested.values.every(v => limit.values.includes(v)), 'SCOPE_ESCALATION');
  }
}
