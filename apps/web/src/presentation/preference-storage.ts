import type { PreferenceStore } from '../ui-preferences.ts';

export const preferenceKeys = {
  theme: 'el-dabboos.ui-theme',
  sidebar: 'el-dabboos.sidebar-collapsed',
  locale: 'el-dabboos.ui-locale',
  tenant: 'el-dabboos.last-tenant',
  demoUser: 'el-dabboos.demo-user',
} as const;
export const legacyPreferenceKeys = {
  theme: 'el-dabbous.ui-theme', // Legacy browser preference: backward compatibility only.
  sidebar: 'el-dabbous.sidebar-collapsed', // Legacy browser preference: backward compatibility only.
  locale: 'el-dabbous.ui-locale', // Legacy browser preference: backward compatibility only.
  tenant: 'el-dabbous.last-tenant', // Legacy browser preference: backward compatibility only.
  demoUser: 'el-dabbous.demo-user', // Legacy browser preference: backward compatibility only.
} as const;

/** Canonical values take precedence, including invalid values (which fall back safely).
 * Only valid legacy preferences are copied; blocked writes do not prevent reading them.
 */
export function readPreference(store: PreferenceStore | null, key: keyof typeof preferenceKeys, valid: (value: string) => boolean): string | null {
  try {
    const current = store?.getItem(preferenceKeys[key]);
    if (current != null) return valid(current) ? current : null;
    const legacy = store?.getItem(legacyPreferenceKeys[key]);
    if (legacy == null || !valid(legacy)) return null;
    try { store?.setItem(preferenceKeys[key], legacy); } catch { /* Keep the valid preference in memory. */ }
    return legacy;
  } catch { return null; }
}
