import type { Locale, TenantProfile } from '@el-dabbous/domain';

const localeKey = 'el-dabbous.ui-locale';
const tenantKey = 'el-dabbous.last-tenant';
const demoUserKey = 'el-dabbous.demo-user';
export interface PreferenceStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function preferredLocale(store: PreferenceStore | null): Locale | null {
  try { const value = store?.getItem(localeKey); return value === 'en' || value === 'ar' ? value : null; } catch { return null; }
}
export function preferredTenant(store: PreferenceStore | null, profiles: readonly TenantProfile[], defaultTenantId: string): TenantProfile | null {
  let value: string | null = null;
  try { value = store?.getItem(tenantKey) ?? null; } catch { /* Storage can be unavailable. */ }
  return profiles.find(profile => profile.id === value) ?? profiles.find(profile => profile.id === defaultTenantId) ?? profiles[0] ?? null;
}
export function storeLocale(store: PreferenceStore | null, locale: Locale): void {
  try { store?.setItem(localeKey, locale); } catch { /* Keep the in-memory preference. */ }
}
export function storeTenant(store: PreferenceStore | null, tenantId: string): void {
  try { store?.setItem(tenantKey, tenantId); } catch { /* Keep the in-memory preference. */ }
}

/** The demo selector is a session preference; the server still validates the identity and memberships. */
export function preferredDemoUser(store: PreferenceStore | null): string | null {
  try { const value = store?.getItem(demoUserKey); return value && /^demo-[a-z0-9-]+$/.test(value) ? value : null; }
  catch { return null; }
}
export function storeDemoUser(store: PreferenceStore | null, userId: string): void {
  try { store?.setItem(demoUserKey, userId); } catch { /* Keep the current demo identity in memory. */ }
}
