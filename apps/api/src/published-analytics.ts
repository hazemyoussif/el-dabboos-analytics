import { publishedCatalog } from '@el-dabboos/application';
import type { RequestContext } from '@el-dabboos/domain';
import { syntheticCapabilities as syntheticPublished } from '@el-dabboos/domain';
import type { RouteContext } from './context.ts';
import { analyticsContext } from './context.ts';

export async function workspacePublishedCapabilities(services: RouteContext,context: RequestContext) {
  const published = services.deps.publishedCapabilities
    ? await services.deps.publishedCapabilities.getPublishedCapabilities(analyticsContext(context)) : syntheticPublished(analyticsContext(context));
  return publishedCatalog(context,published).published;
}
