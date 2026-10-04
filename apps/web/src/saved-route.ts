import type { AccessControlledDashboardRecord as DashboardRecord, TenantProfile } from '@el-dabboos/domain';

/** A route is resolved only through memberships returned for this user by the server. */
export async function resolveSavedRoute(
  recordId: string,
  preferred: TenantProfile,
  memberships: readonly TenantProfile[],
  get: (tenant: TenantProfile, recordId: string) => Promise<DashboardRecord>,
  inaccessible: (error: unknown) => boolean,
): Promise<{ tenant: TenantProfile; record: DashboardRecord } | null> {
  const candidates = [preferred, ...memberships.filter(tenant => tenant.id !== preferred.id)];
  for (const tenant of candidates) {
    if (!memberships.some(member => member.id === tenant.id)) continue;
    try { return { tenant, record: await get(tenant, recordId) }; }
    catch (error) { if (!inaccessible(error)) throw error; }
  }
  return null;
}
