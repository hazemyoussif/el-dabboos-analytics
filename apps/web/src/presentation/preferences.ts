import type { PreferenceStore } from '../ui-preferences.ts';
import { preferenceKeys, readPreference } from './preference-storage.ts';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export function preferredTheme(store: PreferenceStore | null): ThemePreference {
  const value = readPreference(store, 'theme', value => ['system', 'light', 'dark'].includes(value));
  return value === 'light' || value === 'dark' ? value : 'system';
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme { return preference === 'system' ? systemDark ? 'dark' : 'light' : preference; }
export function storeTheme(store: PreferenceStore | null, preference: ThemePreference): void { try { store?.setItem(preferenceKeys.theme, preference); } catch { /* In-memory preferences still work. */ } }
export function preferredSidebarCollapsed(store: PreferenceStore | null): boolean { return readPreference(store, 'sidebar', value => value === 'true' || value === 'false') === 'true'; }
export function storeSidebarCollapsed(store: PreferenceStore | null, collapsed: boolean): void { try { store?.setItem(preferenceKeys.sidebar, String(collapsed)); } catch { /* In-memory preferences still work. */ } }
export function browserPreferenceStore(): PreferenceStore | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
