import type { TenantProfile } from '@el-dabboos/domain';
import { ApiClientError, getAdministrationCapabilities, getDemoUsers, getTenantProfiles } from '../api/client.ts';
import type { PreferenceStore } from '../ui-preferences.ts';
import { preferredTenant } from '../ui-preferences.ts';
/** Identity validation and plane discovery precede any tenant/data capability request. */
export async function discoverWorkspaceAccess(userId: string) {
    const users = await getDemoUsers(userId);
    if (!users.users.some(user => user.id === userId))
        throw new Error('Unknown demo identity');
    const platform = await getAdministrationCapabilities(userId).catch(cause => {
        if (cause instanceof ApiClientError && cause.status === 404)
            return { platformPermissions: [] };
        throw cause;
    });
    const membership = await getTenantProfiles(userId);
    return { users, platform, membership };
}
/** Platform metadata authority without a tenant membership cannot enter analytics. */
export function isPlatformOnlyAccess(profiles: readonly unknown[], platformPermissions: readonly string[]): boolean {
    return profiles.length === 0 && platformPermissions.length > 0;
}
/** Explicit selection wins over stored/default preferences, and never invents a membership. */
export function selectWorkspaceProfile(profiles: readonly TenantProfile[], defaultTenantId: string, explicitTenantId: string | undefined, preferences: PreferenceStore | null): TenantProfile {
    const preferred = explicitTenantId ? profiles.find(profile => profile.id === explicitTenantId) ?? preferredTenant(preferences, profiles, defaultTenantId) : preferredTenant(preferences, profiles, defaultTenantId);
    if (!preferred)
        throw new Error('No demo tenant membership is available');
    return preferred;
}
