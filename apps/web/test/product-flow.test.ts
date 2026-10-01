import assert from 'node:assert/strict';
import test from 'node:test';
import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';
import { editDocument, generatedDocument, newManualDocument, openTemplateDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
import { dashboardActions, dashboardStatus, mayEnterCreation, showAiCreation, showAiEditor, showCreationPanel } from '../src/product-flow.ts';

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
