import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { browserPreferenceStore, preferredTheme, resolveTheme, storeTheme } from './preferences.ts';
import type { ThemePreference } from './preferences.ts';
import { chartTheme } from '../rendering/chart-theme.ts';
export const ThemeContext = createContext({ preference: 'system' as ThemePreference, theme: chartTheme('light'), setPreference: (value: ThemePreference) => { void value; } });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(() => preferredTheme(browserPreferenceStore()));
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = resolveTheme(preference, systemDark);
  const theme = chartTheme(resolved);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches); update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = resolved; }, [resolved]);
  const setPreference = (value: ThemePreference) => { storeTheme(browserPreferenceStore(), value); setPreferenceState(value); };
  return <ThemeContext.Provider value={{ preference, theme, setPreference }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
export const useChartTheme = () => useTheme().theme;
