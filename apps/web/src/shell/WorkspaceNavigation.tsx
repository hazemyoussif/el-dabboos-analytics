import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Locale } from '@el-dabbous/domain';
import { ChartNoAxesCombined, LibraryBig, Menu, PanelLeftClose, PanelLeftOpen, Plus, X, Monitor, Moon, Sun } from 'lucide-react';
import { browserPreferenceStore, preferredSidebarCollapsed, storeSidebarCollapsed } from '../presentation/preferences.ts';
import type { ThemePreference } from '../presentation/preferences.ts';
import { useTheme } from '../presentation/ThemeProvider.tsx';
import { presentationCopy } from '../presentation/copy.ts';
import { copy } from '../i18n.ts';
export function WorkspaceNavigation({ locale, children, onNew, onTemplates, drawerOpen, onDrawerClose }: { locale: Locale; children: ReactNode; onNew: () => void; onTemplates: () => void; drawerOpen: boolean; onDrawerClose: () => void }) {
  const [collapsed, setCollapsed] = useState(() => preferredSidebarCollapsed(browserPreferenceStore()));
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1100px)').matches);
  const [compactOverride, setCompactOverride] = useState<boolean | null>(null);
  const isCollapsed = compact ? compactOverride ?? true : collapsed;
  useEffect(() => { const media = window.matchMedia('(min-width: 768px) and (max-width: 1100px)'); const update = () => { setCompact(media.matches); setCompactOverride(null); }; media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const { preference, setPreference } = useTheme(); const t = presentationCopy[locale]; const app = copy[locale];
  const toggle = () => { const value = !isCollapsed; if (compact) setCompactOverride(value); setCollapsed(value); storeSidebarCollapsed(browserPreferenceStore(), value); };
  useEffect(() => {
    const el = dialog.current;
    if (drawerOpen && el && !el.open) el.showModal(); else el?.close();
  }, [drawerOpen]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const close = () => { if (media.matches) onDrawerClose(); };
    media.addEventListener('change', close); return () => media.removeEventListener('change', close);
  }, [onDrawerClose]);
  const containFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')).filter(control => control.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const contents = (drawer = false) => <>
    <div className="sidebar-header"><div className="brand"><div className="brand-mark"><ChartNoAxesCombined aria-hidden="true" /></div><div className="nav-label"><strong>{app.product}</strong><span>{app.studio}</span></div></div><button className="sidebar-toggle button-icon button-ghost" title={drawer ? t.close : isCollapsed ? t.expand : t.collapse} aria-label={drawer ? t.close : isCollapsed ? t.expand : t.collapse} onClick={drawer ? onDrawerClose : toggle}>{drawer ? <X /> : isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button></div>
    <button className="sidebar-new primary-button" title={app.newDashboard} onClick={() => { onNew(); onDrawerClose(); }}><Plus aria-hidden="true" /><span className="nav-label">{app.newDashboard}</span></button>
    <div className="sidebar-scroll">{children}<div className="sidebar-section"><button className="sidebar-browse" title={t.browse} onClick={() => { onTemplates(); onDrawerClose(); }}><LibraryBig aria-hidden="true" /><span className="nav-label">{t.browse}</span></button></div></div>
    <div className="sidebar-foot"><div className="workspace-status"><span className="status-dot" /><span className="nav-label">{locale === 'ar' ? 'بيانات تجريبية اصطناعية' : 'Synthetic demo data'}</span></div><label className="theme-control" title={t.theme}>{preference === 'system' ? <Monitor aria-hidden="true" /> : preference === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}<span className="sr-only">{t.theme}</span><select aria-label={t.theme} value={preference} onChange={event => setPreference(event.target.value as ThemePreference)}>{(['system','light','dark'] as const).map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label></div>
  </>;
  return <><aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`} aria-label={t.navigation}>{contents()}</aside><dialog className="navigation-drawer" ref={dialog} aria-label={t.navigation} onKeyDown={containFocus} onCancel={event => { event.preventDefault(); onDrawerClose(); }} onClick={event => { if (event.target === event.currentTarget) onDrawerClose(); }}><div className="sidebar drawer-sidebar">{contents(true)}</div></dialog></>;
}
export function NavigationTrigger({ locale, onClick }: { locale: Locale; onClick: () => void }) { return <button className="mobile-menu button-icon button-ghost" aria-label={presentationCopy[locale].menu} onClick={onClick}><Menu aria-hidden="true" /></button>; }
