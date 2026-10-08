import type { DashboardFilterOverrides } from '@el-dabboos/application';
import type { WorkspaceController } from '../hooks/useWorkspace.ts';
import { executeDashboard } from '../api/client.ts';
type RefreshWorkspace=Pick<WorkspaceController,'dashboard'|'profile'|'session'|'beginRequest'|'isCurrent'|'setExecution'>;
/** Re-execute trusted serving only. Errors preserve the visible report and its viewer filters. */
export async function refreshTrustedView(workspace:RefreshWorkspace,overrides:DashboardFilterOverrides,isOwned:()=>boolean,execute=executeDashboard) {
 if(!workspace.profile||!workspace.dashboard)return;
 const requestId=workspace.beginRequest();
 const execution=await execute(workspace.session(),workspace.dashboard,overrides);
 if(isOwned()&&workspace.isCurrent(requestId))workspace.setExecution(execution);
}
