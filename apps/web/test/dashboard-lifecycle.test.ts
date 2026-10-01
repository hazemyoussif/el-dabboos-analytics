import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabbous/domain';
import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';
import { discardSavedChanges, documentIsDirty, editDocument, generatedDocument, newManualDocument, openTemplateDocument, persistDocument, savedDocument } from '../src/dashboard-lifecycle.ts';
import { preferredDemoUser, preferredLocale, preferredTenant, storeDemoUser, storeLocale, storeTenant } from '../src/ui-preferences.ts';

const spec: DashboardSpec = { schemaVersion: 2, id: 'portable', title: { en: 'Sales', ar: 'المبيعات' }, locale: 'en',
  filters: {}, layout: { columns: 1 }, widgets: [{ id: 'revenue', type: 'kpi', series: [{ id: 'revenue', metric: 'revenue' }] }] };
const record: DashboardRecord = { id: 'record-1', tenantId: 'demo-iq', ownerUserId: 'alice', scope: 'private', spec, version: 1,
  createdBy: 'alice', updatedBy: 'alice', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
test('locale and last tenant preferences restore only valid values and memberships', () => {
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  storeLocale(store, 'ar'); storeTenant(store, 'demo-eg');
  assert.equal(preferredLocale(store), 'ar');
  assert.equal(preferredTenant(store, [tenantProfiles['demo-iq'], tenantProfiles['demo-eg']], 'demo-iq')?.id, 'demo-eg');
  assert.equal(preferredTenant(store, [tenantProfiles['demo-iq']], 'demo-iq')?.id, 'demo-iq');
  values.set('el-dabbous.ui-locale', 'invalid');
  assert.equal(preferredLocale(store), null);
});
test('template editing makes a new draft without mutating the template', () => {
  const template = openTemplateDocument('sales-performance', spec);
  assert.equal(documentIsDirty(template), false);
  const edited = structuredClone(spec); edited.title.en = 'Changed';
  const draft = editDocument(template, edited);
  assert.equal(draft.kind, 'draft');
  assert.equal(documentIsDirty(draft), true);
  assert.equal(template.spec.title.en, 'Sales');
});
test('manual and AI creation remain unsaved; saved edits dirty and discard restores baseline', () => {
  assert.equal(documentIsDirty(newManualDocument()), true);
  assert.equal(documentIsDirty(generatedDocument(spec)), true);
  const saved = savedDocument(record);
  assert.equal(documentIsDirty(saved), false);
  const edited = structuredClone(spec); edited.title.en = 'Updated';
  const dirty = editDocument(saved, edited);
  assert.equal(documentIsDirty(dirty), true);
  const restored = discardSavedChanges(dirty);
  assert.equal(restored?.kind, 'saved');
  assert.equal(restored?.spec?.title.en, 'Sales');
  assert.equal(documentIsDirty(restored), false);
  assert.equal(record.spec.title.en, 'Sales');
});

test('UI locale preference leaves an opened saved spec unchanged and clean', () => {
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const opened = savedDocument(record);
  const before = JSON.stringify(opened.spec);
  storeLocale(store, 'ar');
  assert.equal(preferredLocale(store), 'ar');
  assert.equal(JSON.stringify(opened.spec), before);
  assert.equal(documentIsDirty(opened), false);
});
test('Save creates a record and Save on an edited record uses its expected version', async () => {
  const calls: string[] = [];
  const actions = {
    create: async (value: DashboardSpec) => { calls.push('create'); return { ...record, spec: structuredClone(value) }; },
    update: async (id: string, value: DashboardSpec, version: number) => {
      calls.push(`update:${id}:${version}`); return { ...record, spec: structuredClone(value), version: version + 1 };
    },
  };
  const created = await persistDocument(generatedDocument(spec), false, actions);
  assert.equal(created.kind, 'saved');
  assert.equal(documentIsDirty(created), false);
  const modified = structuredClone(spec); modified.title.en = 'Changed';
  const dirty = editDocument(created, modified);
  assert.equal(documentIsDirty(dirty), true);
  const updated = await persistDocument(dirty, false, actions);
  assert.deepEqual(calls, ['create', 'update:record-1:1']);
  assert.equal(updated.kind, 'saved');
  if (updated.kind === 'saved') assert.equal(updated.record.version, 2);
  assert.equal(documentIsDirty(updated), false);
});
test('Save As creates a separate record; AI edits remain in the working copy until Save', async () => {
  let creates = 0; let updates = 0;
  const actions = {
    create: async (value: DashboardSpec) => ({ ...record, id: `new-${++creates}`, spec: structuredClone(value) }),
    update: async () => { updates++; return record; },
  };
  const changed = structuredClone(spec); changed.title.en = 'AI update';
  const working = editDocument(savedDocument(record), changed);
  assert.equal(creates, 0); assert.equal(updates, 0);
  assert.equal(record.spec.title.en, 'Sales');
  const savedAs = await persistDocument(working, true, actions);
  assert.equal(creates, 1); assert.equal(updates, 0);
  assert.equal(savedAs.kind, 'saved');
  if (savedAs.kind === 'saved') { assert.equal(savedAs.record.id, 'new-1'); assert.equal(savedAs.record.spec.title.en, 'AI update'); }
  assert.equal(record.spec.title.en, 'Sales');
});

test('demo identity selection survives refresh only as a revalidated session preference', () => {
  const values = new Map<string, string>();
  const session = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  storeDemoUser(session, 'demo-regional-analyst');
  assert.equal(preferredDemoUser(session), 'demo-regional-analyst');
  values.set('el-dabbous.demo-user', 'untrusted user');
  assert.equal(preferredDemoUser(session), null);
});
