import { useEffect, useRef, useState } from 'react';
import type { DashboardFolder, DashboardLibraryPreference } from '@el-dabbous/domain';
import { createDashboardFolder, deleteDashboardFolder, getDashboardLibrary, renameDashboardFolder, setDashboardPreference } from '../api/client.ts';
import type { WorkspaceController } from './useWorkspace.ts';
import type { LibrarySort, LibraryView } from '../library-model.ts';
export function useDashboardLibrary(workspace: WorkspaceController) {
  const scope = `${workspace.userId}:${workspace.profile?.id ?? ''}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const epoch = useRef(0);
  const [data, setData] = useState<{ scope: string; folders: DashboardFolder[]; preferences: DashboardLibraryPreference[] }>({ scope: '', folders: [], preferences: [] });
  const [view, setView] = useState<LibraryView>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<LibrarySort>('updated');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    if (!workspace.profile) return;
    const id = ++epoch.current;
    const result = await getDashboardLibrary(workspace.session());
    if (scope === currentScope.current && id === epoch.current) setData({ scope, ...result });
  };
  useEffect(() => { setView('all'); setSearch(''); setBusy(false); }, [scope]);
  useEffect(() => { void refresh().catch(cause => { if (currentScope.current === scope) workspace.setError(String(cause.message ?? cause)); }); return () => { epoch.current++; }; }, [scope, workspace.savedDashboards]);
  const mutation = async (action: () => Promise<unknown>) => {
    if (busy || !workspace.profile) return;
    setBusy(true);
    try { await action(); if (currentScope.current === scope) await refresh(); return true; }
    catch (cause) { if (currentScope.current === scope) workspace.setError(cause instanceof Error ? cause.message : String(cause)); return false; }
    finally { if (currentScope.current === scope) setBusy(false); }
  };
  const folders = data.scope === scope ? data.folders : [];
  const preferences = data.scope === scope ? data.preferences : [];
  const preference = (id: string) => preferences.find(p => p.dashboardId === id);
  return { folders, preferences, view, setView, search, setSearch, sort, setSort, busy,
    favorite: (id: string) => mutation(() => setDashboardPreference(workspace.session(), id, { favorite: !preference(id)?.favorite, folderId: preference(id)?.folderId })),
    move: (id: string, folderId?: string) => mutation(() => setDashboardPreference(workspace.session(), id, { favorite: preference(id)?.favorite ?? false, folderId })),
    createFolder: (name: string, dashboardId?: string) => mutation(async () => { const folder = await createDashboardFolder(workspace.session(), name); if (dashboardId) await setDashboardPreference(workspace.session(), dashboardId, { favorite: preference(dashboardId)?.favorite ?? false, folderId: folder.id }); }),
    renameFolder: (id: string, name: string) => mutation(() => renameDashboardFolder(workspace.session(), id, name)),
    deleteFolder: (id: string) => mutation(async () => { await deleteDashboardFolder(workspace.session(), id); if (view === `folder:${id}`) setView('all'); }),
  };
}
export type DashboardLibraryController = ReturnType<typeof useDashboardLibrary>;
