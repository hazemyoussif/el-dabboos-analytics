import type { ReactNode } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import type { AdminPage } from './Administration.tsx';
import { Administration, AdministrationNavigation } from './Administration.tsx';
export function WorkspaceAdministrationNavigation({ workspace, page, onPage, closeDrawer }: {
    workspace: WorkspaceController;
    page: AdminPage | null;
    onPage: (page: AdminPage | null) => void;
    closeDrawer: () => void;
}) {
    return <><AdministrationNavigation locale={workspace.locale} permissions={workspace.permissions} platformPermissions={workspace.platformPermissions} page={page} onPage={page => {
            if (workspace.confirmAbandon()) {
                onPage(page);
                closeDrawer();
            }
        }}/>{page && workspace.profile && <button className="sidebar-browse" type="button" title={workspace.locale === 'ar' ? 'التحليلات' : 'Analytics'} aria-label={workspace.locale === 'ar' ? 'التحليلات' : 'Analytics'} onClick={() => { onPage(null); closeDrawer(); }}><ChartNoAxesCombined aria-hidden="true"/><span className="nav-label">{workspace.locale === 'ar' ? 'التحليلات' : 'Analytics'}</span></button>}</>;
}
export function WorkspaceAdministration({ workspace, page }: {
    workspace: WorkspaceController;
    page: AdminPage;
}) {
    const tenantId = workspace.profile?.id ?? '';
    return <Administration key={`${workspace.userId}-${tenantId}-${page}`} page={page} session={{ userId: workspace.userId, tenantId, locale: workspace.locale }} permissions={workspace.permissions} platformPermissions={workspace.platformPermissions}/>;
}
/** Navigation prerequisites are shared by desktop and mobile shell composition. */
export function workspaceNavigationPermissions(workspace: WorkspaceController) {
    return { canCreate: !!workspace.profile && workspace.permissions.includes('dashboard:create'), canBrowse: !!workspace.profile && workspace.permissions.includes('dashboard:view') };
}
export function initialAdministrationPage(workspace: WorkspaceController): AdminPage | null { return workspace.platformPermissions.length && !workspace.profile ? 'platform-customers' : null; }
/** The selected workspace surface owns mounting/unmounting analytics versus administration. */
export function WorkspaceContent({ workspace, page, children }: {
    workspace: WorkspaceController;
    page: AdminPage | null;
    children: ReactNode;
}) {
    return page ? <WorkspaceAdministration workspace={workspace} page={page}/> : children;
}
