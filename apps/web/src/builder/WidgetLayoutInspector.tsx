import { useState } from 'react';
import { resolveDashboardLayout } from '@el-dabboos/domain';
import type { DashboardLayout, DashboardSpec, Locale } from '@el-dabboos/domain';
import { editorMinimums, sizePresets, updateWidgetLayout, widgetSizes } from './layout-tools.ts';

export function WidgetLayoutInspector({ spec, id, locale, onChange }: { spec: DashboardSpec; id: string; locale: Locale; onChange: (layout: DashboardLayout) => void }) {
  const [message, setMessage] = useState('');
  const widget = spec.widgets.find(widget => widget.id === id)!;
  const item = resolveDashboardLayout(spec).items!.find(item => item.widgetId === id)!;
  const minima = editorMinimums(widget, item);
  const ar = locale === 'ar';
  const names: Record<string, string> = ar ? { small: 'صغير', medium: 'متوسط', large: 'كبير', half: 'نصف العرض', twoThirds: 'ثلثا العرض', full: 'كامل العرض' } : { small: 'Small', medium: 'Medium', large: 'Large', half: 'Half width', twoThirds: 'Two-thirds', full: 'Full width' };
  const change = (value: Partial<typeof item>, reflow = false) => {
    try { onChange(updateWidgetLayout(spec, id, value, reflow)); setMessage(''); }
    catch { setMessage(ar ? 'الموضع يتداخل مع بطاقة أو يتجاوز حدود الشبكة.' : 'Position overlaps a widget or exceeds grid limits.'); }
  };
  return <section className="layout-inspector"><h4>{ar ? 'الحجم والموضع' : 'Size & position'}</h4>
    <div className="layout-fields">{(['x', 'y', 'w', 'h'] as const).map(field => <label key={field}>{({ x: 'X', y: 'Y', w: ar ? 'العرض' : 'Width', h: ar ? 'الارتفاع' : 'Height' })[field]}
      <input aria-label={`Layout ${field}`} type="number" value={item[field]} min={field === 'w' ? minima.minW : field === 'h' ? minima.minH : 0} max={field === 'x' ? 12 - item.w : field === 'y' ? 200 : field === 'w' ? 12 - item.x : 20}
        onChange={event => { if (event.target.value !== '') change({ [field]: Number(event.target.value) }); }} /></label>)}</div>
    <div className="layout-presets">{sizePresets[widget.type].map(preset => <button key={preset.id} onClick={() => change({ w: preset.w, h: preset.h }, true)}>{names[preset.id]}</button>)}<button onClick={() => change(widgetSizes[widget.type], true)}>{ar ? 'الحجم الافتراضي' : 'Reset size'}</button></div>
    {message && <p role="status" className="builder-hint">{message}</p>}
  </section>;
}
