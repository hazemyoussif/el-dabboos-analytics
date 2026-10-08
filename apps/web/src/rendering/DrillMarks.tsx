import type { KeyboardEvent, ReactNode } from 'react';
import { Rectangle } from 'recharts';
import type { WidgetExecution } from '@el-dabboos/application';
import { drillActionLabel } from '../DrillDetails.tsx';
import { seriesLabel } from './shared.ts';
import type { RenderSeriesProps } from './shared.ts';

export const chartDrillHint = (locale: RenderSeriesProps['locale']) => locale === 'ar' ? 'اختر قيمة لعرض تفاصيلها' : 'Select a value to view its details';
type DrillProps = RenderSeriesProps & { entry: WidgetExecution };
interface MarkGeometry { x?: number; y?: number; width?: number; height?: number; cx?: number; cy?: number; index?: number; payload?: { _row?: number }; fill?: string; stroke?: string; radius?: number | [number, number, number, number] }

/** Marks and precise-value tables use the same admission/context callbacks. */
function markAction(props: DrillProps, seriesId: string, index: number | undefined) {
  const row = index === undefined ? undefined : props.entry.alignedRows[index];
  const value = row?.series[seriesId]?.value;
  if (!row || value == null || !props.onDrill || !props.canDrill?.(seriesId, row.key)) return null;
  const label = `${drillActionLabel(props.locale)}: ${props.keyLabel?.(row.key) ?? ''} · ${seriesLabel(props, props.widget.series.findIndex(series => series.id === seriesId))} · ${props.formatSeries(seriesId, value)}`;
  return { label, open: (opener: Element) => props.onDrill?.(seriesId, row.key, opener) };
}
function InteractiveMark({ action, children }: { action: ReturnType<typeof markAction>; children: ReactNode }) {
  if (!action) return <g>{children}</g>;
  function activate(event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); action?.open(event.currentTarget); }
  }
  return <g role="button" tabIndex={0} className="chart-drill-mark" aria-label={action.label} onClick={event => { event.stopPropagation(); action.open(event.currentTarget); }} onKeyDown={activate}>
    <title>{action.label}</title>{children}
  </g>;
}
export function DrillBarMark({ mark, props, seriesId }: { mark: unknown; props: DrillProps; seriesId: string }) {
  const geometry = mark as MarkGeometry;
  const action = markAction(props, seriesId, geometry.payload?._row ?? geometry.index);
  return <InteractiveMark action={action}><Rectangle className="chart-drill-visible" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} fill={geometry.fill} radius={geometry.radius}/></InteractiveMark>;
}
export function DrillPointMark({ mark, props, seriesId, color }: { mark: unknown; props: DrillProps; seriesId: string; color: string }) {
  const geometry = mark as MarkGeometry;
  const action = markAction(props, seriesId, geometry.payload?._row ?? geometry.index);
  if (!action || geometry.cx === undefined || geometry.cy === undefined) return <g/>;
  return <InteractiveMark action={action}><circle className="chart-drill-hit" cx={geometry.cx} cy={geometry.cy} r={10} fill="transparent"/><circle className="chart-drill-visible" cx={geometry.cx} cy={geometry.cy} r={3} fill={color}/></InteractiveMark>;
}
