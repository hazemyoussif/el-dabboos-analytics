import type { DashboardLibraryPreference, DashboardRecord, Locale } from '@el-dabboos/domain';
import type { AccessibleTemplate } from './api/client.ts';
export type LibraryView = 'all' | 'favorites' | 'mine' | 'shared' | `folder:${string}`;
export type LibrarySort = 'updated' | 'az' | 'za' | 'oldest' | 'newest';
export function filterLibrary(records: readonly DashboardRecord[], preferences: readonly DashboardLibraryPreference[], userId: string, view: LibraryView, search: string, sort: LibrarySort, locale: Locale): DashboardRecord[] {
  const query = search.trim().toLocaleLowerCase();
  const filtered = records.filter(record => {
    const p = preferences.find(p => p.dashboardId === record.id);
    return (view === 'all' || view === 'favorites' && p?.favorite || view === 'mine' && record.ownerUserId === userId || view === 'shared' && record.scope === 'tenant' && record.ownerUserId !== userId || view.startsWith('folder:') && p?.folderId === view.slice(7)) &&
      (!query || Object.values(record.spec.title).some(title => title.toLocaleLowerCase().includes(query)));
  });
  return filtered.sort((a,b) => {
    const value = sort === 'az' || sort === 'za' ? a.spec.title[locale].localeCompare(b.spec.title[locale], locale) * (sort === 'za' ? -1 : 1) : sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) : a.createdAt.localeCompare(b.createdAt) * (sort === 'oldest' ? 1 : -1);
    return value || a.id.localeCompare(b.id);
  });
}
export function filterTemplates(templates: readonly AccessibleTemplate[], domain: string, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return templates.filter(t => (domain === 'all' || t.domain === domain) && (!query || [...Object.values(t.name), ...t.tags].some(value => value.toLocaleLowerCase().includes(query))));
}
export function namedSpec<T extends { title: { en: string; ar: string } }>(spec: T, locale: Locale, primary: string, secondary: string): T {
  const name = primary.trim();
  if (!name || name.length > 120 || secondary.trim().length > 120) throw new Error('A dashboard name of 1–120 characters is required.');
  return { ...spec, title: locale === 'en' ? { en: name, ar: secondary.trim() || name } : { ar: name, en: secondary.trim() || name } };
}
