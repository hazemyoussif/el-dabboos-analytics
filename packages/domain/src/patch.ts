import type { DashboardPatch, DashboardSpec } from './contracts.ts';
import { validateDashboardPatch, validateDashboardSpec } from './validation.ts';

/** Applies a bounded edit atomically; the original spec remains untouched on error. */
export function applyDashboardPatch(current: DashboardSpec, patch: DashboardPatch): DashboardSpec {
  validateDashboardSpec(current);
  validateDashboardPatch(patch);
  const next: DashboardSpec = structuredClone(current);
  for (const operation of patch.operations) {
    if (!operation || typeof operation !== 'object') throw new Error('Invalid patch operation');
    switch (operation.op) {
      case 'add':
        if (next.widgets.some(w => w.id === operation.widget.id)) throw new Error('Duplicate widget');
        next.widgets.push(operation.widget);
        break;
      case 'remove': {
        const index = next.widgets.findIndex(w => w.id === operation.widgetId);
        if (index < 0) throw new Error('Unknown widget');
        next.widgets.splice(index, 1);
        break;
      }
      case 'replace': {
        const index = next.widgets.findIndex(w => w.id === operation.widgetId);
        if (index < 0 || next.widgets.some(w => w.id === operation.widget.id && w.id !== operation.widgetId)) throw new Error('Invalid replacement');
        next.widgets[index] = operation.widget;
        break;
      }
      case 'set_title': next.title = operation.title; break;
      case 'set_filters': next.filters = operation.filters; break;
      default: throw new Error('Unsupported patch operation');
    }
  }
  validateDashboardSpec(next);
  return next;
}
