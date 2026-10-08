import type { PublishedAnalyticsCapabilities, MetricId } from '@el-dabboos/domain';
/** Bounded AI projection aggregates repeated publications; immutable provenance stays in execution. */
export function analyticsCapabilityContext(published:PublishedAnalyticsCapabilities,metricIds:readonly MetricId[]) {
  return {mode:published.mode,metrics:metricIds.map(metric=>{
    const admitted=published.releases.flatMap(release=>release.capabilities.filter(capability=>capability.metric===metric).map(capability=>({release,capability})));
    const periods=admitted.flatMap(item=>item.release.period ? [item.release.period] : []);
    return {metric,available:admitted.length>0,dimensions:[...new Set(admitted.flatMap(item=>item.capability.dimensions))],
      analyses:[...new Set(admitted.flatMap(item=>item.capability.analyses))],
      comparisons:[...new Set(admitted.flatMap(item=>item.capability.comparisons ?? []))],
      movingAverageWindows:[...new Set(admitted.flatMap(item=>item.capability.movingAverageWindows ?? []))],
      selectionSemantics:[...new Set(admitted.flatMap(item=>item.release.selectionSemantics ? [item.release.selectionSemantics] : []))],
      ...(periods.length ? {coverage:{from:periods.map(period=>period.from).sort()[0],through:periods.map(period=>period.to).sort().at(-1)}} : {})};
  })};
}
