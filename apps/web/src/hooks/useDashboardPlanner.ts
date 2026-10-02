import { useEffect, useState } from 'react';
import { ApiClientError, editDashboard, generateDashboard } from '../api/client.ts';
import { PlannerActivity, runPlannerOperation } from '../planner-activity.ts';
import type { PlannerActivityState } from '../planner-activity.ts';
import { plannerFailureMessage } from '../planner-copy.ts';
import type { WorkspaceController } from './useWorkspace.ts';

export function useDashboardPlanner(workspace: WorkspaceController, onGenerated: () => void) {
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [state, setState] = useState<PlannerActivityState>({ operation: 'idle', elapsedMs: 0 });
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [activity] = useState(() => new PlannerActivity(setState));
  useEffect(() => () => activity.reset(), [activity, workspace.userId, workspace.profile?.id]);
  const reset = () => { activity.reset(); setPrompt(''); setInstruction(''); setErrorCode(null); };
  const fail = (cause: unknown) => {
    const code = cause instanceof ApiClientError ? cause.code : 'REQUEST_FAILED';
    setErrorCode(code); workspace.setError(plannerFailureMessage(code, cause instanceof ApiClientError ? cause.message : '', workspace.locale));
  };
  const generate = async () => {
    if (!workspace.profile || !prompt.trim() || !activity.isIdle()) return false;
    const id = workspace.beginRequest();
    return runPlannerOperation(activity, 'generating', {
      current: () => workspace.isCurrent(id),
      start: () => { setErrorCode(null); workspace.setError(null); workspace.setLoading(true); },
      request: () => generateDashboard(workspace.session(), prompt),
      apply: result => { workspace.openGenerated(result.dashboard, result.execution); onGenerated(); },
      fail, settle: () => workspace.setLoading(false),
    });
  };
  const edit = async () => {
    const dashboard = workspace.dashboard;
    if (!workspace.profile || !dashboard || !instruction.trim() || !activity.isIdle()) return false;
    const id = workspace.beginRequest();
    return runPlannerOperation(activity, 'editing', {
      current: () => workspace.isCurrent(id),
      start: () => { setErrorCode(null); workspace.setError(null); workspace.setLoading(true); },
      request: () => editDashboard(workspace.session(), dashboard, instruction),
      apply: result => { workspace.applyWorkingSpec(result.dashboard); workspace.setExecution(result.execution); setInstruction(''); onGenerated(); },
      fail, settle: () => workspace.setLoading(false),
    });
  };
  return { prompt, setPrompt, instruction, setInstruction, reset, generate, edit, ...state, errorCode };
}
export type ReturnTypePlanner = ReturnType<typeof useDashboardPlanner>;
