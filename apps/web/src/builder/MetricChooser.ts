import { createElement } from 'react';
import type { Locale, WidgetType } from '@el-dabbous/domain';
import { metricDropCopy } from './metric-drop.ts';
import type { MetricDropAction } from './metric-drop.ts';

export function MetricChooser({ locale, label, options, actions, kpi, busy, onCreate, onAction, onClose }: {
  locale: Locale; label: string; options: readonly { type: WidgetType }[]; actions: readonly MetricDropAction[];
  kpi: boolean; busy: boolean; onCreate: (type: WidgetType) => void; onAction: (action: MetricDropAction) => void; onClose: () => void;
}) {
  const t = metricDropCopy[locale];
  return createElement('section', { className: 'metric-chooser', dir: locale === 'ar' ? 'rtl' : 'ltr', 'aria-label': t.choose },
    createElement('strong', null, label),
    actions.length ? createElement('div', { className: 'metric-choice-actions' }, ...actions.map(action =>
      createElement('button', { key: action, disabled: busy, onClick: () => onAction(action) }, action === 'replace-primary' && kpi ? t.replace : t[action]))) : null,
    createElement('span', null, t.create),
    createElement('div', { className: 'metric-choice-actions' }, ...options.map(option =>
      createElement('button', { key: option.type, disabled: busy, onClick: () => onCreate(option.type) }, t[option.type]))),
    createElement('button', { className: 'metric-choice-close', onClick: onClose }, t.cancel));
}
