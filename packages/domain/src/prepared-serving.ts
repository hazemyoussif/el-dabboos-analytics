import {requiredMeasures,semanticCatalog,timeDimensions} from './catalog.ts';
import {compatibleQuantityMetrics} from './business-catalog.ts';
import type {AnalyticsContext,AnalyticsQuery,DimensionId,FactMeasureId} from './contracts.ts';

export type PreparedTimeGrain='daily'|'monthly'|'cutoff';
export interface PreparedGrain {
 id:string;
 dimensions:readonly DimensionId[];
 measures:readonly FactMeasureId[];
 timeGrain:PreparedTimeGrain;
 rows:number;
}
export interface PreparedGrainRequirement {
 query:AnalyticsQuery;
 context:AnalyticsContext;
 timeGrain:PreparedTimeGrain;
}
/** Every authorization and viewer-filter dimension must survive a rollup. */
export function preparedReadDimensions(query:AnalyticsQuery,context:AnalyticsContext):DimensionId[]{
 const semantics=semanticCatalog[query.metric].semantics;
 const semanticDimensions=semantics.kind==='distinct_count'?[semantics.dimension]:[];
 if(compatibleQuantityMetrics.includes(query.metric as import('./contracts.ts').BusinessMetricId))semanticDimensions.push('uom');
 return [...new Set([query.groupBy,...semanticDimensions,...(query.filters??[]).map(filter=>filter.dimension),...(context.enforcedFilters??[]).map(filter=>filter.dimension)].filter((dimension):dimension is DimensionId=>dimension!==undefined&&!timeDimensions.includes(dimension)))].sort();
}
export function selectPreparedGrain(grains:readonly PreparedGrain[],requirement:PreparedGrainRequirement):PreparedGrain|undefined{
 const dimensions=preparedReadDimensions(requirement.query,requirement.context),measures=requiredMeasures(requirement.query.metric);
 return grains.filter(grain=>grain.timeGrain===requirement.timeGrain&&dimensions.every(dimension=>grain.dimensions.includes(dimension))&&measures.every(measure=>grain.measures.includes(measure)))
  .sort((left,right)=>left.rows-right.rows||left.dimensions.length-right.dimensions.length||left.id.localeCompare(right.id))[0];
}
/** A semantic snapshot is a prepared cutoff, including snapshot-basis ratios. */
export function preparedMetricBasis(metric:AnalyticsQuery['metric']):'event'|'snapshot'{
 const semantics=semanticCatalog[metric].semantics;
 if(semantics.kind==='comparison_derived')return preparedMetricBasis(semantics.base);
 return semantics.kind==='snapshot'||semantics.kind==='ratio'&&semantics.basis==='snapshot'?'snapshot':'event';
}
/** Grains are dataset properties. They never depend on a dashboard/report identifier. */
export function preparedDimensionGrains(dimensions:readonly DimensionId[]):DimensionId[][]{
 const full=[...new Set(dimensions.filter(dimension=>!timeDimensions.includes(dimension)))].sort();
 return [...new Map([[],...full.map(dimension=>[dimension]),full].map(grain=>[JSON.stringify(grain),grain])).values()];
}
