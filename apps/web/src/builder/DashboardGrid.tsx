import ReactGridLayout, { noCompactor, useContainerWidth } from 'react-grid-layout';
import { resolveDashboardLayout } from '@el-dabbous/domain';
import type { DashboardLayout, DashboardSpec, DashboardWidget, Locale } from '@el-dabbous/domain';
import type { ReactNode } from 'react';
import 'react-grid-layout/css/styles.css';
import { fromGridItems, toGridItems } from './grid-map.ts';

interface Props {
  spec: DashboardSpec;
  locale: Locale;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onLayoutCommit?: (layout: DashboardLayout) => void;
  renderWidget: (widget: DashboardWidget) => ReactNode;
}
export function DashboardGrid({ spec, locale, editable = false, selectedId, onSelect, onLayoutCommit, renderWidget }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const portable = resolveDashboardLayout(spec);
  const items = portable.items ?? [];
  const ordered = [...spec.widgets].sort((a, b) => {
    const one = items.find(item => item.widgetId === a.id)!;
    const two = items.find(item => item.widgetId === b.id)!;
    return one.y - two.y || one.x - two.x;
  });
  const content = (widget: DashboardWidget) => <div key={widget.id} className={`canvas-item ${selectedId === widget.id ? 'canvas-selected' : ''}`}>
    {editable && <div className="canvas-controls"><span className="widget-drag-handle" aria-label={locale === 'ar' ? 'اسحب لنقل البطاقة' : 'Drag to move widget'}>⠿</span><button type="button" onClick={() => onSelect?.(widget.id)}>{locale === 'ar' ? 'تحرير البطاقة' : 'Edit widget'}</button></div>}
    {renderWidget(widget)}
  </div>;
  return <div ref={containerRef} className={`dashboard-canvas ${editable ? 'canvas-editable' : ''}`}>
    {mounted && width <= 800 ? <div className="canvas-stack">{ordered.map(content)}</div> : mounted && <ReactGridLayout
      width={width} layout={toGridItems(items)} gridConfig={{ cols: 12, rowHeight: 74, margin: [14, 14] }}
      compactor={noCompactor} dragConfig={{ enabled: editable, handle: '.widget-drag-handle', cancel: 'button,input,select,textarea' }}
      resizeConfig={{ enabled: editable, handles: ['se'] }}
      onDragStop={layout => onLayoutCommit?.(fromGridItems(layout, portable))}
      onResizeStop={layout => onLayoutCommit?.(fromGridItems(layout, portable))}>
      {spec.widgets.map(content)}
    </ReactGridLayout>}
  </div>;
}
