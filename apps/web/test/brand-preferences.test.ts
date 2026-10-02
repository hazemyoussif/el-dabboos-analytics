import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantProfiles } from '@el-dabboos/domain';
import { legacyPreferenceKeys as legacy, preferenceKeys as keys } from '../src/presentation/preference-storage.ts';
import { preferredTheme, preferredSidebarCollapsed, storeTheme, storeSidebarCollapsed } from '../src/presentation/preferences.ts';
import { preferredLocale, preferredTenant, preferredDemoUser, storeLocale, storeTenant, storeDemoUser } from '../src/ui-preferences.ts';
import { blankDashboardDraft } from '../src/builder/model.ts';
import { savedDocument, documentIsDirty } from '../src/dashboard-lifecycle.ts';
const store = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial)); const writes: string[] = [];
  return { values, writes, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); } };
};
test('legacy theme and sidebar preferences migrate without altering a saved spec or dirty state', () => {
  const storage = store({ [legacy.theme]: 'dark', [legacy.sidebar]: 'true' });
  const spec = blankDashboardDraft(tenantProfiles['demo-iq'], 'en').base;
  const document = savedDocument({ id: 'unchanged', tenantId: 'demo-iq', ownerUserId: 'alice', scope: 'private', version: 1, spec, createdBy: 'alice', updatedBy: 'alice', createdAt: '2026-01-01', updatedAt: '2026-01-01' });
  const before = JSON.stringify(document);
  assert.equal(preferredTheme(storage), 'dark'); assert.equal(preferredSidebarCollapsed(storage), true);
  assert.equal(storage.values.get(keys.theme), 'dark'); assert.equal(storage.values.get(keys.sidebar), 'true');
  assert.deepEqual(storage.writes, [keys.theme, keys.sidebar]);
  assert.equal(JSON.stringify(document), before); assert.equal(documentIsDirty(document), false);
});
test('canonical preferences win over legacy values, including invalid canonical values', () => {
  const storage = store({ [keys.theme]: 'light', [legacy.theme]: 'dark', [keys.sidebar]: 'false', [legacy.sidebar]: 'true' });
  assert.equal(preferredTheme(storage), 'light'); assert.equal(preferredSidebarCollapsed(storage), false); assert.deepEqual(storage.writes, []);
  storage.values.set(keys.theme, 'invalid'); storage.values.set(keys.sidebar, 'invalid');
  assert.equal(preferredTheme(storage), 'system'); assert.equal(preferredSidebarCollapsed(storage), false); assert.deepEqual(storage.writes, []);
});
test('invalid legacy preferences are ignored and storage failures remain safe', () => {
  const storage = store(Object.fromEntries(Object.values(legacy).map(key => [key, 'invalid'])));
  assert.equal(preferredTheme(storage), 'system'); assert.equal(preferredSidebarCollapsed(storage), false);
  assert.equal(preferredLocale(storage), null); assert.equal(preferredDemoUser(storage), null);
  assert.equal(preferredTenant(storage, [tenantProfiles['demo-iq']], 'demo-iq')?.id, 'demo-iq'); assert.deepEqual(storage.writes, []);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(preferredTheme(blocked), 'system'); assert.equal(preferredSidebarCollapsed(blocked), false); assert.equal(preferredLocale(blocked), null);
  assert.equal(preferredTheme({ getItem: key => key === legacy.theme ? 'dark' : null, setItem() { throw new Error('blocked'); } }), 'dark');
});
test('locale, authorized tenant and demo session preferences also migrate', () => {
  const storage = store({ [legacy.locale]: 'ar', [legacy.tenant]: 'demo-eg', [legacy.demoUser]: 'demo-iq-admin' });
  assert.equal(preferredLocale(storage), 'ar'); assert.equal(preferredTenant(storage, Object.values(tenantProfiles), 'demo-iq')?.id, 'demo-eg'); assert.equal(preferredDemoUser(storage), 'demo-iq-admin');
  assert.deepEqual(storage.writes, [keys.locale, keys.tenant, keys.demoUser]);
  const unauthorized = store({ [legacy.tenant]: 'demo-eg' });
  assert.equal(preferredTenant(unauthorized, [tenantProfiles['demo-iq']], 'demo-iq')?.id, 'demo-iq'); assert.deepEqual(unauthorized.writes, []);
});
test('all future preference writes use canonical keys only', () => {
  const storage = store(); storeTheme(storage, 'system'); storeSidebarCollapsed(storage, true); storeLocale(storage, 'en'); storeTenant(storage, 'demo-iq'); storeDemoUser(storage, 'demo-iq-admin');
  assert.deepEqual(storage.writes, Object.values(keys));
});
