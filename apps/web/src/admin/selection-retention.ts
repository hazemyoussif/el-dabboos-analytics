import type { DashboardGrant, MembershipDataScope, ScopeDimension } from '@el-dabboos/domain';
export interface ScopeOption {
    id: string;
    label: string;
}
/** Unavailable canonical values remain visible and selected until explicitly reviewed. */
export function scopeOptionsWithRetainedValues(options: readonly ScopeOption[], scopes: readonly MembershipDataScope[], dimension: ScopeDimension, staleLabel: string): ScopeOption[] {
    const retained = scopes.find(dataScope => dataScope.dimension === dimension)?.values ?? [];
    return [...options, ...retained.filter(id => !options.some(option => option.id === id)).map(id => ({ id, label: `${id} (${staleLabel})` }))];
}
/** A supporting membership page is bounded; omitted existing exceptions must survive Save. */
export function omittedMembershipGrants(grants: readonly DashboardGrant[], members: readonly {
    id: string;
}[]): DashboardGrant[] {
    return grants.filter(grant => grant.subjectType === 'membership' && !members.some(membership => membership.id === grant.subjectId));
}
