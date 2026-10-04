import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
test('administration navigation separates platform and tenant permissions in English and Arabic', async () => {
    const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
    try {
        const { AdministrationNavigation, Administration } = await server.ssrLoadModule('/src/admin/Administration.tsx');
        for (const locale of ['en', 'ar']) {
            const platform = renderToStaticMarkup(createElement(AdministrationNavigation, { locale, permissions: [], platformPermissions: ['platform:customers:view', 'platform:tenants:view'], page: 'platform-customers', onPage() { } }));
            assert.ok(platform.includes(locale === 'en' ? 'Customers' : 'العملاء'));
            assert.ok(!platform.includes(locale === 'en' ? 'Data Access' : 'الوصول للبيانات'));
            assert.ok(platform.includes('aria-current="page"'));
            assert.ok(platform.includes('class="section-caption"'));
            assert.ok(platform.includes('class="nav-label"'));
            assert.ok(platform.includes('aria-hidden="true"'));
            assert.ok(platform.includes(`aria-label="${locale === 'en' ? 'Customers' : 'العملاء'}"`));
            const tenant = renderToStaticMarkup(createElement(AdministrationNavigation, { locale, permissions: ['roles:view', 'data_scopes:view'], platformPermissions: [], page: null, onPage() { } }));
            assert.ok(tenant.includes(locale === 'en' ? 'Roles' : 'الأدوار'));
            assert.ok(!tenant.includes(locale === 'en' ? 'Platform Administration' : 'إدارة المنصة'));
            const denied = renderToStaticMarkup(createElement(Administration, { page: 'roles', session: { userId: 'u', tenantId: 't', locale }, permissions: [], platformPermissions: [] }));
            assert.ok(denied.includes('role="alert"'));
            assert.ok(!denied.includes('<form'));
        }
    }
    finally {
        await server.close();
    }
});
