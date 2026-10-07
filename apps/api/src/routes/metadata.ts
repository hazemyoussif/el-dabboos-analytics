import type { FastifyInstance } from 'fastify';
import { managementControlReview,publishedCatalog } from '@el-dabboos/application';
import { categoricalDimensions,governedDimensionLabel,DimensionDiscoveryLimitError,UncertifiedDimensionError } from '@el-dabboos/domain';
import type { DimensionId } from '@el-dabboos/domain';
import { workspacePublishedCapabilities } from '../published-analytics.ts';
import { analyticsContext } from '../context.ts';
import type { RouteContext } from '../context.ts';
import { ApiError } from '../errors.ts';

export function registerMetadataRoutes(app: FastifyInstance, services: RouteContext): void {
  app.get('/api/management-control-review',async request=>{
    const { context }=await services.session(request.headers);
    services.authorize(context,'dashboard:view','analytics:query');
    return {review:managementControlReview(context.tenant.tenantId)};
  });
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
    let options: Array<{id:string;label?:string}>;
    try {
      const repository=services.deps.dimensionValues;
      options=repository.listDimensionOptions?await repository.listDimensionOptions(dimension as DimensionId,analyticsContext(context)):
        (await repository.listDimensionValues(dimension as DimensionId,analyticsContext(context))).map(id=>({id,...(published.mode==='synthetic'?{label:id.replaceAll('_',' ')}:{})}));
    }
    catch (error) {
      if ((error instanceof UncertifiedDimensionError || error instanceof DimensionDiscoveryLimitError) && error.dimension===dimension)
        return { dimension,availability: 'unavailable',reason: error instanceof DimensionDiscoveryLimitError ? 'discovery_limit' : 'uncertified_dimension',values: [] };
      throw error;
    }
    return { dimension, values: options.map(({id,label}) => ({ id, label: governedDimensionLabel(id,dimension === 'branch' ? profile.branchLabels[id]?.[context.locale] ?? label : label,context.locale,dimension as DimensionId) })) };
  });
}
