import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolveBuildNumber } from '../build-number.ts';
test('workspace AI controls are bilingual, masked and zero-temperature by default without a model preset', async () => {
 const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
 try {
  const { AiSettingsForm } = await server.ssrLoadModule('/src/admin/AiSettingsForm.tsx');
  const { AdministrationNavigation } = await server.ssrLoadModule('/src/admin/Administration.tsx');
  const { BuildVersion } = await server.ssrLoadModule('/src/shell/BuildVersion.tsx');
  for (const locale of ['en', 'ar'] as const) {
   const defaults = { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', modelId: '', maxTokens: 2048, temperature: 0 };
   const session = { userId: 'synthetic-admin', tenantId: 'synthetic-workspace', locale };
   const html = renderToStaticMarkup(createElement(AiSettingsForm, { session, busy: false, data: { record: null, defaults, localBaseUrl: 'http://127.0.0.1:9999/v1', keyStorageAvailable: true }, save: async () => {} }));
   assert.ok(html.includes('type="password"')); assert.match(html, /autocomplete="new-password"/i);
   assert.ok(html.includes('min="0" max="2" step="0.1" value="0"'));
   assert.ok(html.includes(locale === 'ar' ? 'الحد الأقصى لرموز الإخراج' : 'Maximum output tokens'));
   assert.ok(!html.toLowerCase().includes('bonsai')); assert.ok(!html.includes('value="42"')); assert.ok(!html.includes('value="512"'));
   assert.ok(html.includes(locale === 'ar' ? 'نماذج مجانية متوافقة' : 'Free compatible models'));
   const local = renderToStaticMarkup(createElement(AiSettingsForm, { session, busy: false, data: { record: null, defaults: { ...defaults, provider: 'local' }, localBaseUrl: defaults.baseUrl, keyStorageAvailable: true }, save: async () => {} }));
   assert.ok(local.includes(locale === 'ar' ? 'ميزانية رموز التفكير' : 'Thinking budget tokens'));
   const navigation = (permissions: string[]) => renderToStaticMarkup(createElement(AdministrationNavigation, { permissions, platformPermissions: [], page: null, onPage: () => {}, locale }));
   assert.ok(navigation(['tenant:manage']).includes(locale === 'ar' ? 'إعدادات AI' : 'AI settings'));
   assert.ok(!navigation(['ai:generate']).includes(locale === 'ar' ? 'إعدادات AI' : 'AI settings'));
   const footer = renderToStaticMarkup(createElement(BuildVersion, { locale }));
   assert.ok(footer.includes(locale === 'ar' ? 'البناء' : 'Build')); assert.match(footer, /<bdi>\d+<\/bdi>/);
  }
 } finally { await server.close(); }
});
test('release build numbers accept explicit numeric values and reject arbitrary text', () => {
 assert.equal(resolveBuildNumber('285'), '285'); assert.equal(resolveBuildNumber('development'), 'development');
 assert.throws(() => resolveBuildNumber('<script>')); assert.throws(() => resolveBuildNumber('secret=key'));
});
