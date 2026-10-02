import { semanticCatalog, timeDimensions } from '@el-dabboos/domain';
import type { DashboardSeries, DimensionId, WidgetPresentation, WidgetType } from '@el-dabboos/domain';
import type { RequestedPresentation } from './generation-plan.ts';

/** Deterministic defaults only. Explicit intent is retained for canonical semantic validation. */
export function resolveGenerationWidget(input: { dimension?: DimensionId; series: DashboardSeries[]; requestedPresentation?: RequestedPresentation }):
  { type: WidgetType; dimension?: DimensionId; series: DashboardSeries[]; presentation?: WidgetPresentation } {
  const { dimension, requestedPresentation = {} } = input;
  const time = dimension !== undefined && timeDimensions.includes(dimension);
  const units = input.series.map(series => series.analysis?.percentageContribution ? 'percentage:%'
    : `${semanticCatalog[series.metric]?.type}:${semanticCatalog[series.metric]?.presentation.unit ?? ''}`);
  const defaultType: WidgetType = input.series.length === 1 && dimension === undefined ? 'kpi'
    : dimension === undefined || new Set(units).size > 1 ? 'table' : time ? 'line' : 'bar';
  const { type = defaultType, ...explicit } = requestedPresentation;
  const presentation: WidgetPresentation = {
    ...(type === 'bar' ? { orientation: time ? 'vertical' : 'horizontal' } : {}),
    ...(['line', 'area', 'combo'].includes(type) ? { curve: 'straight' } : {}),
    ...(type === 'pie' ? { pieVariant: 'pie' } : {}),
    ...(!['kpi', 'table'].includes(type) ? { legend: input.series.length > 1 ? 'show' : 'auto' } : {}),
    ...explicit,
  };
  const series = input.series.map((series, index) => ({ ...series,
    ...(type === 'combo' ? { presentation: { mark: index === 0 ? 'bar' as const : 'line' as const } } : {}),
  }));
  return { type, ...(dimension !== undefined ? { dimension } : {}), series,
    ...(Object.keys(presentation).length ? { presentation } : {}) };
}
