import { widgetTypes } from '@el-dabboos/domain';
import type { MetricId, ProductMetric, WidgetType } from '@el-dabboos/domain';
import { metricAvailable } from './metric-drop.ts';
import type { MetricCatalog } from './metric-drop.ts';
export type BuilderDragItem = { kind: 'widget'; widgetType: WidgetType } | { kind: 'metric'; metricId: MetricId };
export const BUILDER_DRAG_MIME = 'application/x-el-dabboos-builder';
const prefix = 'el-dabboos-builder:';
export function parseBuilderDragItem(raw: string, catalog: MetricCatalog, registry: readonly ProductMetric[]): BuilderDragItem | null {
  if (raw.length > 384) return null;
  try {
    const value: unknown = JSON.parse(raw.startsWith(prefix) ? raw.slice(prefix.length) : raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2) return null;
    if ('kind' in value && value.kind === 'widget' && 'widgetType' in value && typeof value.widgetType === 'string' && widgetTypes.includes(value.widgetType as WidgetType))
      return { kind: 'widget', widgetType: value.widgetType as WidgetType };
    if ('kind' in value && value.kind === 'metric' && 'metricId' in value && typeof value.metricId === 'string' && metricAvailable(value.metricId, catalog, registry))
      return { kind: 'metric', metricId: value.metricId };
  } catch { /* Untrusted data is not a builder command. */ }
  return null;
}
export function writeBuilderDragItem(data: Pick<DataTransfer, 'setData' | 'effectAllowed'>, item: BuilderDragItem) {
  const raw = JSON.stringify(item); data.setData(BUILDER_DRAG_MIME, raw); data.setData('text/plain', prefix + raw); data.effectAllowed = 'copy';
}
export function readBuilderDragItem(data: Pick<DataTransfer, 'getData'> | null, catalog: MetricCatalog, registry: readonly ProductMetric[]) {
  if (!data) return null;
  const raw = data.getData(BUILDER_DRAG_MIME);
  const fallback = data.getData('text/plain');
  return raw ? parseBuilderDragItem(raw, catalog, registry) : fallback.startsWith(prefix) ? parseBuilderDragItem(fallback, catalog, registry) : null;
}
/** Consume even rejected metric drops so they never reach the canvas/RGL handler. */
export function consumeMetricDrop(event: { preventDefault: () => void; stopPropagation: () => void; dataTransfer: Pick<DataTransfer, 'getData'> | null },
  read: (data: Pick<DataTransfer, 'getData'> | null) => BuilderDragItem | null, apply: (metric: MetricId) => void) {
  event.preventDefault(); event.stopPropagation();
  const item = read(event.dataTransfer);
  if (item?.kind === 'metric') apply(item.metricId);
}
