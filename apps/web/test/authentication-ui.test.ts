import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
test('login screen uses native labelled credential fields in English and Arabic with no registration', async () => {
    const server = await createServer({ root: fileURLToPath(new URL('../',import.meta.url)),server: { middlewareMode:true },appType:'custom' });
    try {
    const { LoginForm } = await server.ssrLoadModule('/src/auth/LoginForm.tsx');
    for (const locale of ['en','ar'] as const) {
        const html=renderToStaticMarkup(createElement(LoginForm,{ locale,onAuthenticated: () => {},notice: 'Session ended' }));
        assert.ok(html.includes('type="password"')); assert.ok(html.includes('autoComplete="current-password"'));
        assert.ok(html.includes('htmlFor="auth-email"') || html.includes('for="auth-email"'));
        assert.ok(html.includes('role="status"')); assert.ok(!html.includes('Sign up'));
    }
    } finally { await server.close(); }
});
test('authenticated account shows real product name and sign-out actions rather than demo selection', async () => {
    const server = await createServer({ root: fileURLToPath(new URL('../',import.meta.url)),server: { middlewareMode:true },appType:'custom' });
    try {
    const { AccountControls } = await server.ssrLoadModule('/src/auth/AccountControls.tsx');
    const html=renderToStaticMarkup(createElement(AccountControls,{ user: { id: 'trusted-user',displayName: 'Trusted user',preferredLocale: 'en' },locale: 'en',userId: 'trusted-user',demoUsers: [],onIdentity: () => {} }));
    assert.ok(html.includes('Trusted user')); assert.ok(html.includes('Sign out all sessions')); assert.ok(!html.includes('Demo identity'));
    } finally { await server.close(); }
});
test('only original reserved bootstrap placeholders localize; arbitrary and edited names remain intact', async () => {
    const server = await createServer({ root: fileURLToPath(new URL('../',import.meta.url)),server: { middlewareMode:true },appType:'custom' });
    try {
        const { AccountControls } = await server.ssrLoadModule('/src/auth/AccountControls.tsx');
        for (const locale of ['en','ar'] as const) {
            for (const user of [
                { id: 'staging-tenant-admin',displayName: 'Pending tenant administrator',expected: locale === 'ar' ? 'مسؤول مساحة العمل قيد الإعداد' : 'Pending tenant administrator' },
                { id: 'other-user',displayName: 'Pending tenant administrator',expected: 'Pending tenant administrator' },
                { id: 'staging-tenant-admin',displayName: 'Malik',expected: 'Malik' },
            ]) {
                const html = renderToStaticMarkup(createElement(AccountControls,{ user: { ...user,preferredLocale: 'ar' },locale,userId: user.id,demoUsers: [],onIdentity: () => {} }));
                assert.ok(html.includes(`title="${user.expected}"`));
                assert.ok(html.includes(`>${user.expected}</span>`));
            }
        }
    } finally { await server.close(); }
});
