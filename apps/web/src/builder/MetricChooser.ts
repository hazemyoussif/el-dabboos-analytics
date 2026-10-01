import { createElement } from 'react';
import type { DimensionId, Locale, WidgetType } from '@el-dabbous/domain';
import { copy } from '../i18n.ts';
import { visualizationLabel } from './visualizations.ts';
import { metricDropCopy } from './metric-drop.ts';
import type { MetricDropAction } from './metric-drop.ts';

export function MetricChooser({ locale, label, options, actions, kpi, busy, dimensions, dimension, onDimension, onCreate, onAction, onClose }: {
  locale: Locale; label: string; options: readonly { type: WidgetType; id?: string }[]; actions: readonly MetricDropAction[];
  kpi: boolean; busy: boolean; dimensions?: readonly DimensionId[]; dimension?: DimensionId; onDimension?: (dimension?: DimensionId) => void; onCreate: (type: WidgetType | 'donut' | 'horizontal') => void; onAction: (action: MetricDropAction) => void; onClose: () => void;
}) {
  const t = metricDropCopy[locale];
  return createElement('section', { className: 'metric-chooser', dir: locale === 'ar' ? 'rtl' : 'ltr', 'aria-label': t.choose },
    createElement('strong', null, label),
    actions.length ? createElement('div', { className: 'metric-choice-actions' }, ...actions.map(action =>
      createElement('button', { key: action, disabled: busy, onClick: () => onAction(action) }, action === 'replace-primary' && kpi ? t.replace : t[action]))) : null,
    createElement('span', null, t.create),
    dimensions && onDimension ? createElement('label', null, locale === 'ar' ? 'البعد' : 'Dimension', createElement('select', { value: dimension ?? '', disabled: busy, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onDimension(event.target.value as DimensionId || undefined) }, createElement('option', { value: '' }, locale === 'ar' ? 'اقتراح تلقائي' : 'Automatic recommendation'), ...dimensions.map(value => createElement('option', { key: value, value }, copy[locale].dimensions[value])))) : null,
    createElement('div', { className: 'metric-choice-actions' }, ...options.map(option =>
      createElement('button', { key: option.id ?? option.type, disabled: busy, onClick: () => onCreate((option.id ?? option.type) as WidgetType | 'donut' | 'horizontal') }, visualizationLabel({ id: option.id ?? option.type }, locale)))),
    createElement('button', { className: 'metric-choice-close', onClick: onClose }, t.cancel));
}
