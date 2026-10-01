import ReactGridLayout, { noCompactor, useContainerWidth } from 'react-grid-layout';
import { resolveDashboardLayout, validateDashboardLayout } from '@el-dabbous/domain';
import type { DashboardLayout, DashboardSpec, DashboardWidget, Locale, WidgetType } from '@el-dabbous/domain';
import { useState } from 'react';
import type { ReactNode } from 'react';
import 'react-grid-layout/css/styles.css';
import { dropGridPosition, fromGridItems, toGridItems } from './grid-map.ts';
import { editorMinimums, keyboardLayout, widgetSizes } from './layout-tools.ts';

const editorCompactor = { ...noCompactor, preventCollision: true };

interface Props {
  spec: DashboardSpec;
  locale: Locale;
  editable?: boolean;
  selectedId?: string | null;
  paletteType?: WidgetType | null;
  onSelect?: (id: string) => void;
  onAction?: (id: string, action: 'duplicate' | 'delete' | 'reset') => void;
  onDropWidget?: (type: WidgetType, position: { x: number; y: number }) => void;
  onLayoutCommit?: (layout: DashboardLayout) => void;
  renderWidget: (widget: DashboardWidget) => ReactNode;
}
export function DashboardGrid({ spec, locale, editable = false, selectedId, paletteType, onSelect, onAction, onDropWidget, onLayoutCommit, renderWidget }: Props) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [interacting, setInteracting] = useState(false);
  const [message, setMessage] = useState('');
  const [reset, setReset] = useState(0);
  const ar = locale === 'ar';
  const portable = resolveDashboardLayout(spec);
  const items = portable.items ?? [];
  const narrow = width <= 560;
  const editGrid = editable && !narrow;
  const commit = (layout: DashboardLayout) => {
    setInteracting(false);
    try { validateDashboardLayout(layout, spec.widgets); onLayoutCommit?.(layout); setMessage(''); }
    catch { setReset(value => value + 1); setMessage(ar ? 'تعذر تطبيق الموضع. تحقق من حدود الشبكة.' : 'Position could not be applied. Check grid limits.'); }
  };
  const ordered = [...spec.widgets].sort((a, b) => {
    const one = items.find(item => item.widgetId === a.id)!;
    const two = items.find(item => item.widgetId === b.id)!;
    return one.y - two.y || one.x - two.x;
  });
  const content = (widget: DashboardWidget) => <div key={widget.id} className={`canvas-item ${selectedId === widget.id ? 'canvas-selected' : ''}`}>
    {editable && <div className="canvas-controls">
      {editGrid && <span role="button" tabIndex={0} className="widget-drag-handle" aria-label={ar ? 'نقل البطاقة: الأسهم للنقل، ومع Shift لتغيير الحجم' : 'Move widget: arrows move, Shift + arrows resize'}
        onFocus={() => onSelect?.(widget.id)} onKeyDown={event => {
          if (!event.key.startsWith('Arrow')) return;
          event.preventDefault(); event.stopPropagation();
          const layout = keyboardLayout(spec, widget.id, event.key, event.shiftKey);
          if (layout) commit(layout);
          else setMessage(ar ? 'وصلت إلى حد الشبكة أو بطاقة أخرى.' : 'Grid boundary, minimum size, or another widget reached.');
        }}>⠿</span>}
      <div className="widget-actions"><button type="button" onClick={() => onSelect?.(widget.id)}>{ar ? 'تحرير' : 'Edit'}</button>
        {editGrid && onAction && <details><summary aria-label={ar ? 'إجراءات البطاقة' : 'Widget actions'}>•••</summary><div>
          <button onClick={() => onAction(widget.id, 'duplicate')}>{ar ? 'تكرار' : 'Duplicate'}</button>
          <button onClick={() => onAction(widget.id, 'reset')}>{ar ? 'الحجم الافتراضي' : 'Reset size'}</button>
          <button onClick={() => onAction(widget.id, 'delete')}>{ar ? 'حذف' : 'Delete'}</button>
        </div></details>}
      </div></div>}
    {renderWidget(widget)}
  </div>;
  const gridItems = toGridItems(items).map(item => {
    const widget = spec.widgets.find(widget => widget.id === item.i)!;
    const portableItem = items.find(old => old.widgetId === item.i)!;
    return { ...item, ...(editGrid ? editorMinimums(widget, portableItem) : {}), maxW: 12, maxH: 20 };
  });
  return <div ref={containerRef} className={`dashboard-canvas ${editGrid ? 'canvas-editable' : ''} ${interacting ? 'canvas-interacting' : ''}`}>
    {message && <p className="builder-hint" role="status">{message}</p>}
    {mounted && narrow ? <div className="canvas-stack">{ordered.map(content)}</div> : mounted && <ReactGridLayout
      key={reset} style={editGrid ? { minHeight: 270 } : undefined} width={width} layout={gridItems} gridConfig={{ cols: 12, rowHeight: 74, margin: [14, 14] }}
      compactor={editorCompactor} dragConfig={{ enabled: editGrid, handle: '.widget-drag-handle', cancel: 'button,input,select,textarea,summary' }}
      resizeConfig={{ enabled: editGrid, handles: ['e', 's', 'w', 'se', 'sw', 'ne', 'nw'] }}
      dropConfig={{ enabled: editGrid && !!paletteType, defaultItem: widgetSizes[paletteType ?? 'kpi'], onDragOver: () => paletteType ? widgetSizes[paletteType] : false }}
      onDrop={(_layout, item, event) => {
        if (item && paletteType && event instanceof DragEvent) {
          // Collision prevention can leave RGL's placeholder at an earlier position.
          // Snap the final native drop point using this adapter's grid metrics.
          const rect = containerRef.current?.querySelector('.react-grid-layout')?.getBoundingClientRect();
          if (rect) {
            onDropWidget?.(paletteType, dropGridPosition(width, { x: event.clientX - rect.left, y: event.clientY - rect.top }, widgetSizes[paletteType]));
          }
        }
        setInteracting(false);
      }}
      onDragStart={() => setInteracting(true)} onResizeStart={() => setInteracting(true)}
      onDragStop={layout => commit(fromGridItems(layout, portable))}
      onResizeStop={layout => commit(fromGridItems(layout, portable))}>
      {spec.widgets.map(content)}
    </ReactGridLayout>}
  </div>;
}
