import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defaultTenantSourceSettings } from '@el-dabboos/domain';
import { sourceSettingsHandoff } from '../src/admin/source-settings-model.ts';

test('tenant source forms are bilingual, explicit drafts, and check/export only saved values', async () => {
  const server = await createServer({ configFile: false, envDir: '/tmp/el-dabboos-no-env-files', plugins: [react()], optimizeDeps: { noDiscovery: true }, root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { SourceSettingsForm } = await server.ssrLoadModule('/src/admin/SourceSettingsForm.tsx');
    const { SourceCheckResult } = await server.ssrLoadModule('/src/admin/SourceSettingsCheck.tsx');
    const { AdministrationNavigation } = await server.ssrLoadModule('/src/admin/Administration.tsx');
    for (const locale of ['en', 'ar'] as const) {
      const session = { userId: 'synthetic-admin', tenantId: 'demo-iq', locale };
      const settings = { ...defaultTenantSourceSettings(), sourceId: 'synthetic-source', connectionRef: 'synthetic-connection' };
      const render = (record: object | null) => renderToStaticMarkup(createElement(SourceSettingsForm, { session, busy: false, data: { defaults: settings, record, connections: [], mode: 'draft' }, save: async () => {} }));
      const unsaved = render(null);
      assert.ok(unsaved.includes(locale === 'ar' ? 'حفظ المسودة' : 'Save draft'));
      assert.match(unsaved, /disabled="">(?:Check saved draft|فحص المسودة المحفوظة)/);
      assert.ok(!unsaved.includes('type="password"'));
      const saved = render({ tenantId: 'demo-iq', settings, version: 2, createdAt: 'before', updatedAt: 'after' });
      assert.ok(saved.includes(locale === 'ar' ? 'تصدير المسودة المحفوظة' : 'Export saved draft'));
      const result = renderToStaticMarkup(createElement(SourceCheckResult, { session, result: { compatible: false, issues: [{ code: 'missing_field', field: 'business_line.id' }], testedVersion: 2, checkedAt: '2026-01-01T00:00:00.000Z', activation: 'not_activated' } }));
      assert.ok(result.includes('business_line.id')); assert.ok(result.includes(locale === 'ar' ? 'فشل فحص التوافق' : 'Compatibility check failed'));
      const navigation = (permissions: string[]) => renderToStaticMarkup(createElement(AdministrationNavigation, { permissions, platformPermissions: [], page: 'source-settings', onPage: () => {}, locale }));
      assert.ok(navigation(['tenant:manage']).includes(locale === 'ar' ? 'إعدادات المصدر' : 'Source settings'));
      assert.ok(!navigation(['analytics:execute']).includes(locale === 'ar' ? 'إعدادات المصدر' : 'Source settings'));
    }
  } finally { await server.close(); }
});
test('handoff exports only the saved draft identity and makes activation status explicit', () => {
  const record = { tenantId: 'demo-iq', settings: { ...defaultTenantSourceSettings(), sourceId: 'synthetic', connectionRef: 'synthetic' }, version: 3, createdAt: 'before', updatedAt: 'after' };
  const handoff = sourceSettingsHandoff(record);
  assert.equal(handoff.mode, 'draft'); assert.equal(handoff.version, 3);
  handoff.settings.mapping.orders.date = 'modified';
  assert.equal(record.settings.mapping.orders.date, 'date_order');
  assert.deepEqual(Object.keys(handoff).sort(), ['mode', 'schemaVersion', 'settings', 'tenantId', 'updatedAt', 'version']);
});
