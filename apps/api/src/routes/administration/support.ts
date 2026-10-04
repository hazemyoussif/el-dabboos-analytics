import type { AdministrationActor, ScopeValues } from '@el-dabboos/application';
import { scopeDimensions } from '@el-dabboos/domain';
import type { RouteContext } from '../../context.ts';
import { analyticsContext } from '../../context.ts';
import { ApiError } from '../../errors.ts';
export function administration(context: RouteContext) {
    if (!context.administration)
        throw new ApiError(503, 'ADMIN_UNAVAILABLE', 'Administration is unavailable.');
    return context.administration;
}
export async function tenantActor(context: RouteContext, headers: Record<string, unknown>, tenantId: string): Promise<AdministrationActor> {
    if (headers['x-tenant-id'] !== tenantId)
        throw new ApiError(403, 'ACCESS_DENIED', 'Selected workspace must match the target.');
    const locale = headers['x-locale'] ?? 'en';
    if (locale !== 'en' && locale !== 'ar')
        throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Invalid locale.');
    return { identityId: await context.identityId(headers), tenantId, locale };
}
export function cursor(query: unknown) {
    if (!query || typeof query !== 'object')
        return undefined;
    const input = query as Record<string, unknown>;
    if (Object.keys(input).some(key => key !== 'cursor') || (input.cursor !== undefined && typeof input.cursor !== 'string'))
        throw new ApiError(400, 'INVALID_ADMIN_INPUT', 'Invalid page cursor.');
    return input.cursor as string | undefined;
}
export async function availableScopes(context: RouteContext, actor: AdministrationActor): Promise<ScopeValues> {
    const resolved = await administration(context).resolveTenant(actor);
    context.authorize(resolved.context, 'data_scopes:manage');
    await context.requireData(actor.tenantId);
    return Object.fromEntries(await Promise.all(scopeDimensions.map(async (dimension) => [dimension, await context.deps.dimensionValues.listDimensionValues(dimension, analyticsContext(resolved.context))])));
}
export type TenantParams = {
    tenantId: string;
    id: string;
};
export type PlatformParams = {
    id: string;
    customerId: string;
};
