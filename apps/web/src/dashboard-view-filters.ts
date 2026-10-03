import type { DashboardFilterOverrides } from '@el-dabboos/application';
import { executeDashboard } from './api/client.ts';
import type { WorkspaceController } from './hooks/useWorkspace.ts';

export interface DashboardViewFilterState { revision: number; requestId?: number; overrides: DashboardFilterOverrides; busy: boolean }
export const emptyViewFilters = (): DashboardViewFilterState => ({ revision: -1, overrides: {}, busy: false });
/** Reopening the same record also changes revision; locale/theme do not. */
export const currentViewFilters = (state: DashboardViewFilterState, revision: number): DashboardViewFilterState => state.revision === revision ? state : emptyViewFilters();
type ExecutionWorkspace = Pick<WorkspaceController, 'dashboard' | 'profile' | 'navigationRevision' | 'beginRequest' | 'isCurrent' | 'session' | 'setExecution' | 'setError'>;
/** The controller has no document mutation, history or persistence capability. */
export async function executeViewFilters(workspace: ExecutionWorkspace, next: DashboardFilterOverrides, setState: (state: DashboardViewFilterState) => void, execute = executeDashboard): Promise<void> {
  if (!workspace.dashboard || !workspace.profile) return;
  const revision = workspace.navigationRevision;
  const id = workspace.beginRequest();
  setState({ revision, requestId: id, overrides: next, busy: true }); workspace.setError(null);
  try {
    const result = await execute(workspace.session(), workspace.dashboard, next);
    if (workspace.isCurrent(id)) workspace.setExecution(result);
  } catch (cause) {
    if (workspace.isCurrent(id)) { workspace.setExecution(null); workspace.setError(cause instanceof Error ? cause.message : String(cause)); }
  } finally { if (workspace.isCurrent(id)) setState({ revision, overrides: next, busy: false }); }
}
