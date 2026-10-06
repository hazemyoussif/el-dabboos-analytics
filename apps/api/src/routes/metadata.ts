import type { FastifyInstance } from 'fastify';
import { publishedCatalog } from '@el-dabboos/application';
import { categoricalDimensions,DimensionDiscoveryLimitError,UncertifiedDimensionError } from '@el-dabboos/domain';
import type { DimensionId } from '@el-dabboos/domain';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';
import { ApiError } from '../errors.ts';

export function registerMetadataRoutes(app: FastifyInstance, services: RouteContext): void {
  app.get('/api/semantic-catalog', async request => {
    const { context } = await services.session(request.headers); services.authorize(context, 'analytics:query');
    return publishedCatalog(context,await workspacePublishedCapabilities(services,context));
  });
  app.get<{ Params: { dimension: string } }>('/api/dimensions/:dimension/values', async request => {
    const { context, profile } = await services.session(request.headers); services.authorize(context, 'analytics:query');
    const dimension = request.params.dimension;
    if (!categoricalDimensions.includes(dimension as DimensionId))
      throw new ApiError(400, 'UNSUPPORTED_DIMENSION', 'Dimension values are unavailable.');
    await services.requireData(context.tenant.tenantId);
    const published = await workspacePublishedCapabilities(services,context);
    if (!published.releases.some(release => release.capabilities.some(capability => capability.dimensions.includes(dimension as DimensionId))))
      return { dimension,availability: 'unavailable',reason: 'uncertified_dimension',values: [] };
    let ids: string[];
    try { ids = await services.deps.dimensionValues.listDimensionValues(dimension as DimensionId, analyticsContext(context)); }
    catch (error) {
      if ((error instanceof UncertifiedDimensionError || error instanceof DimensionDiscoveryLimitError) && error.dimension===dimension)
        return { dimension,availability: 'unavailable',reason: error instanceof DimensionDiscoveryLimitError ? 'discovery_limit' : 'uncertified_dimension',values: [] };
      throw error;
    }
    return { dimension, values: ids.map(id => ({ id, label: dimension === 'branch' ? profile.branchLabels[id]?.[context.locale] ?? id : id.replaceAll('_', ' ') })) };
  });
}
