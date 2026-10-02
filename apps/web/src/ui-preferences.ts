import type { Locale, TenantProfile } from '@el-dabboos/domain';

import { preferenceKeys, readPreference } from './presentation/preference-storage.ts';
export interface PreferenceStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function preferredLocale(store: PreferenceStore | null): Locale | null {
  const value = readPreference(store, 'locale', value => value === 'en' || value === 'ar');
  return value === 'en' || value === 'ar' ? value : null;
}
export function preferredTenant(store: PreferenceStore | null, profiles: readonly TenantProfile[], defaultTenantId: string): TenantProfile | null {
  const value = readPreference(store, 'tenant', value => profiles.some(profile => profile.id === value));
  return profiles.find(profile => profile.id === value) ?? profiles.find(profile => profile.id === defaultTenantId) ?? profiles[0] ?? null;
}
export function storeLocale(store: PreferenceStore | null, locale: Locale): void {
  try { store?.setItem(preferenceKeys.locale, locale); } catch { /* Keep the in-memory preference. */ }
}
export function storeTenant(store: PreferenceStore | null, tenantId: string): void {
  try { store?.setItem(preferenceKeys.tenant, tenantId); } catch { /* Keep the in-memory preference. */ }
}

/** The demo selector is a session preference; the server still validates the identity and memberships. */
export function preferredDemoUser(store: PreferenceStore | null): string | null {
  return readPreference(store, 'demoUser', value => /^demo-[a-z0-9-]+$/.test(value));
}
export function storeDemoUser(store: PreferenceStore | null, userId: string): void {
  try { store?.setItem(preferenceKeys.demoUser, userId); } catch { /* Keep the current demo identity in memory. */ }
}
