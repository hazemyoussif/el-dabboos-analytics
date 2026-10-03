import { useState } from 'react';
import { dashboardFilterSelection } from '@el-dabboos/application';
import type { DashboardFilterOverrides } from '@el-dabboos/application';
import { currentViewFilters, emptyViewFilters, executeViewFilters } from '../dashboard-view-filters.ts';
import type { WorkspaceController } from './useWorkspace.ts';

/** A navigation-scoped execution state, never part of the working document or builder history. */
export function useDashboardViewFilters(workspace: WorkspaceController) {
  const [state, setState] = useState(emptyViewFilters);
  const current = currentViewFilters(state, workspace.navigationRevision);
  const overrides = current.overrides;
  const active = Object.keys(overrides).length > 0;
  const busy = current.busy && workspace.isCurrent(current.requestId ?? -1);
  const apply = (next: DashboardFilterOverrides) => { void executeViewFilters(workspace, next, setState); };
  return { overrides, active, busy,
    selection: dashboardFilterSelection(workspace.dashboard?.filters ?? {}, overrides),
    change: (change: DashboardFilterOverrides) => apply({ ...overrides, ...change }),
    reset: () => apply({}),
    clearForEdit: () => { if (active || busy) return executeViewFilters(workspace, {}, setState); },
  };
}
