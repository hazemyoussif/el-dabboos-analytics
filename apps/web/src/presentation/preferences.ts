import type { PreferenceStore } from '../ui-preferences.ts';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
const themeKey = 'el-dabbous.ui-theme';
const sidebarKey = 'el-dabbous.sidebar-collapsed';
export function preferredTheme(store: PreferenceStore | null): ThemePreference {
  try { const value = store?.getItem(themeKey); return value === 'light' || value === 'dark' ? value : 'system'; } catch { return 'system'; }
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme { return preference === 'system' ? systemDark ? 'dark' : 'light' : preference; }
export function storeTheme(store: PreferenceStore | null, preference: ThemePreference): void { try { store?.setItem(themeKey, preference); } catch { /* In-memory preferences still work. */ } }
export function preferredSidebarCollapsed(store: PreferenceStore | null): boolean { try { return store?.getItem(sidebarKey) === 'true'; } catch { return false; } }
export function storeSidebarCollapsed(store: PreferenceStore | null, collapsed: boolean): void { try { store?.setItem(sidebarKey, String(collapsed)); } catch { /* In-memory preferences still work. */ } }
export function browserPreferenceStore(): PreferenceStore | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
