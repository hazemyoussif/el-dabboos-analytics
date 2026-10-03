import type { DashboardPatch, DashboardSpec } from './contracts.ts';
import { placeDashboardWidget, resolveDashboardLayout } from './layout.ts';
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
        if (!next.layout.items) next.layout = resolveDashboardLayout(next);
        next.layout.items!.push(placeDashboardWidget(next.layout.items!, operation.widget));
        next.widgets.push(operation.widget);
        break;
      case 'remove': {
        const index = next.widgets.findIndex(w => w.id === operation.widgetId);
        if (index < 0) throw new Error('Unknown widget');
        next.widgets.splice(index, 1);
        if (next.layout.items) next.layout.items = next.layout.items.filter(item => item.widgetId !== operation.widgetId);
        break;
      }
      case 'replace': {
        const index = next.widgets.findIndex(w => w.id === operation.widgetId);
        if (index < 0 || next.widgets.some(w => w.id === operation.widget.id && w.id !== operation.widgetId)) throw new Error('Invalid replacement');
        next.widgets[index] = operation.widget;
        if (next.layout.items) next.layout.items = next.layout.items.map(item => item.widgetId === operation.widgetId ? { ...item, widgetId: operation.widget.id } : item);
        break;
      }
      case 'set_title': next.title = operation.title; break;
      case 'set_filters': next.filters = operation.filters; break;
      case 'set_presentation':
        if (operation.presentation === null) delete next.presentation;
        else next.presentation = structuredClone(operation.presentation);
        break;
      case 'set_layout': next.layout = operation.layout; break;
      default: throw new Error('Unsupported patch operation');
    }
  }
  validateDashboardSpec(next);
  return next;
}
