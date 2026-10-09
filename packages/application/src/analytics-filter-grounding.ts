import type { DimensionId, DimensionValueRepository, RequestContext } from '@el-dabboos/domain';
import type { AnalyticsIntent } from './analytics-intent.ts';
import type { AnalyticsConversationState } from './analytics-conversation.ts';
import { analyticsContext } from './security.ts';

/** Unknown model filter values are invalid plans, not successful empty business answers. */
export async function analyticsFilterValuesKnown(intent: AnalyticsIntent, identity: RequestContext,
  supplied: { pageContext?: AnalyticsIntent['context']; state?: AnalyticsConversationState }, repository?: DimensionValueRepository): Promise<boolean> {
  const known = new Map<DimensionId, Set<string>>();
  const references = [...(supplied.pageContext?.dimensions ?? []), ...(supplied.state?.viewerFilters ?? []),
    ...(supplied.state?.activeContext.dimensions ?? []), ...(supplied.state?.entities.map(group => ({ dimension: group.dimension, values: group.ids })) ?? [])];
  for (const reference of references) known.set(reference.dimension, new Set([...(known.get(reference.dimension) ?? []), ...reference.values]));
  const filters = [...(intent.context.dimensions ?? []), ...intent.analyses.flatMap(analysis => analysis.context?.dimensions ?? [])];
  const discovered = new Set<DimensionId>();
  for (const filter of filters) {
    if (filter.values.every(value => known.get(filter.dimension)?.has(value))) continue;
    if (!repository) return false;
    if (!discovered.has(filter.dimension)) {
      known.set(filter.dimension, new Set(await repository.listDimensionValues(filter.dimension, analyticsContext(identity))));
      discovered.add(filter.dimension);
    }
    if (!filter.values.every(value => known.get(filter.dimension)?.has(value))) return false;
  }
  return true;
}
