import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardSection } from '../src/product/DashboardSection.ts';
import { applyDashboardPatch } from '@el-dabboos/domain';
import { commitBuilderCommand, startBuilder } from '../src/builder/model.ts';
import { documentIsDirty } from '../src/dashboard-lifecycle.ts';
import type { ProductPanel } from '../src/product-flow.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { DashboardRecord, DashboardSpec } from '@el-dabboos/domain';
import { editDocument, generatedDocument, newManualDocument, openTemplateDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
import { dashboardActions, dashboardStatus, switchDashboardEditor, mayEnterCreation, showAiCreation, showAiEditor, showCreationPanel } from '../src/product-flow.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'portable', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const record: DashboardRecord = { id: 'stored-ai', tenantId: 'demo-iq', ownerUserId: 'owner', scope: 'private', spec, version: 1,
  createdBy: 'owner', updatedBy: 'owner', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
test('AI creation and editing UI require their explicit product mode', () => {
  assert.equal(showCreationPanel('none'), false);
  assert.equal(showAiCreation('none'), false);
  assert.equal(showAiCreation('new'), false);
  assert.equal(showAiCreation('create-ai'), true);
  assert.equal(showAiEditor('none'), false);
  assert.equal(showAiEditor('edit-ai'), true);
});
test('blank and AI creation are unsaved; template use creates a user draft', () => {
  assert.equal(dashboardStatus(newManualDocument()), 'unsaved');
  assert.equal(dashboardStatus(generatedDocument(spec)), 'unsaved');
  const template = openTemplateDocument('sales', spec);
  assert.equal(dashboardStatus(template), 'template');
  const used = editDocument(template, template.spec);
  assert.equal(dashboardStatus(used), 'unsaved');
  assert.equal(template.spec.title.en, 'Sales');
});
test('clean saved dashboard shows contextual edit and Save As, then dirty dashboard exposes Save and Discard', () => {
  const saved = savedDocument(record);
  const clean = dashboardActions(saved, false, true, true);
  assert.equal(dashboardStatus(saved), 'saved');
  assert.equal(clean.save, false); assert.equal(clean.discard, false);
  assert.equal(clean.editManual, true); assert.equal(clean.editAi, true); assert.equal(clean.saveAs, true);
  const changed = structuredClone(spec); changed.title.en = 'Edited';
  const dirty = editDocument(saved, changed);
  const actions = dashboardActions(dirty, false, true, true);
  assert.equal(dashboardStatus(dirty), 'modified');
  assert.equal(actions.save, true); assert.equal(actions.discard, true);
  assert.equal(dashboardStatus(saved), 'saved');
});
test('saved AI-created record is Saved, and switching creation modes requires confirmation for dirty work', () => {
  assert.equal(dashboardStatus(savedDocument(record)), 'saved');
  let confirmed = 0;
  assert.equal(mayEnterCreation(true, () => { confirmed++; return false; }), false);
  assert.equal(confirmed, 1);
  assert.equal(mayEnterCreation(false, () => { confirmed++; return false; }), true);
  assert.equal(confirmed, 1);
});

test('valid custom working drafts expose AI editing in manual mode while permissions and empty drafts remain guarded', () => {
  const custom = { ...spec, layout: { columns: 12 as const, items: [{ widgetId: 'widget-1', x: 2, y: 3, w: 5, h: 3 }] },
    widgets: [{ ...spec.widgets[0]!, id: 'widget-1' }] };
  const draft = editDocument(newManualDocument(), custom);
  assert.equal(dashboardActions(draft, false, true, true).editAi, true);
  assert.equal(dashboardActions(draft, true, true, true).editAi, true);
  assert.equal(dashboardActions(draft, true, true, false).editAi, false);
  assert.equal(dashboardActions(newManualDocument(), true, true, true).editAi, false);
  assert.equal(dashboardActions(openTemplateDocument('template', custom), false, true, true).editAi, false);
});

test('manual to AI and back retain the latest draft without persistence, including custom layout', () => {
  const custom: DashboardSpec = { ...spec, layout: { columns: 12, items: [{ widgetId: 'widget-1', x: 2, y: 3, w: 5, h: 3 }] },
    widgets: [{ ...spec.widgets[0]!, id: 'widget-1' }] };
  let document = editDocument(newManualDocument(), custom);
  let history: ReturnType<typeof startBuilder> | null = startBuilder({ kind: 'dashboard', spec: custom });
  const layout = structuredClone(custom.layout); layout.items![0]!.x = 4;
  const transition = commitBuilderCommand(history, { type: 'layout', layout });
  history = transition.history;
  if (history.present.kind !== 'dashboard') throw new Error('Expected dashboard');
  document = editDocument(document, history.present.spec);
  const manualSpec = structuredClone(document.spec);
  let panel: ProductPanel = 'none';
  const builder = { enter: () => { history = startBuilder({ kind: 'dashboard', spec: document.spec! }); }, exit: () => { history = null; } };
  switchDashboardEditor('ai', builder, value => { panel = value; });
  assert.equal(panel, 'edit-ai'); assert.equal(history, null);
  assert.deepEqual(document.spec, manualSpec); assert.equal(documentIsDirty(document), true);
  const edited = applyDashboardPatch(document.spec!, { schemaVersion: 2, operations: [{ op: 'replace', widgetId: 'widget-1', widget: {
    ...custom.widgets[0]!, series: [{ id: 'series-1', metric: 'gross_profit' }],
  } }] });
  document = editDocument(document, edited);
  switchDashboardEditor('manual', builder, value => { panel = value; });
  assert.equal(panel, 'none');
  assert.deepEqual(history!.present, { kind: 'dashboard', spec: edited });
  assert.deepEqual(document.spec!.layout, layout); assert.equal(documentIsDirty(document), true);
  assert.equal(document.kind, 'draft'); // No DashboardRecord was created by either transition.
});
test('rendered AI editor precedes metadata and a tall canvas, immediately following header actions', () => {
  const html = renderToStaticMarkup(createElement(DashboardSection, {
    header: createElement('header', null, 'Dashboard actions'),
    aiEditor: createElement('input', { 'aria-label': 'AI edit instruction' }),
    metadata: createElement('div', null, 'Dashboard metadata'),
    canvas: createElement('div', { style: { height: 4000 } }, 'Dashboard canvas'),
  }));
  assert.ok(html.indexOf('Dashboard actions') < html.indexOf('AI edit instruction'));
  assert.ok(html.indexOf('AI edit instruction') < html.indexOf('Dashboard metadata'));
  assert.ok(html.indexOf('Dashboard metadata') < html.indexOf('Dashboard canvas'));
});
