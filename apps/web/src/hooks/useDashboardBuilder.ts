import { useState } from 'react';
import type { Locale } from '@el-dabbous/domain';
import { executeDashboard } from '../api/client.ts';
import { blankDashboardDraft, commitBuilderCommand, redoBuilder, startBuilder, undoBuilder, withLocale } from '../builder/model.ts';
import type { BuilderCommand, BuilderHistory, BuilderTransition } from '../builder/model.ts';
import type { WorkspaceController } from './useWorkspace.ts';

export function useDashboardBuilder(workspace: WorkspaceController) {
  const [history, setHistory] = useState<BuilderHistory | null>(null);
  const [busy, setBusy] = useState(false);
  const reset = () => { setHistory(null); setBusy(false); };
  const setLocale = (locale: Locale) => setHistory(current => current ? {
    past: current.past.map(document => withLocale(document, locale)),
    present: withLocale(current.present, locale), future: current.future.map(document => withLocale(document, locale)),
  } : null);
  const executeTransition = (transition: BuilderTransition) => {
    if (transition.history === history) return;
    setHistory(transition.history);
    const next = transition.history.present;
    if (next.kind === 'empty') {
      workspace.beginRequest(); workspace.setDashboard(null); workspace.setExecution(null); setBusy(false); return;
    }
    workspace.setDashboard(next.spec);
    if (!transition.execute || !workspace.profile) return;
    const id = workspace.beginRequest();
    setBusy(true); workspace.setError(null);
    void executeDashboard(workspace.session(), next.spec)
      .then(result => { if (workspace.isCurrent(id)) workspace.setExecution(result); })
      .catch(cause => { if (workspace.isCurrent(id)) { workspace.setExecution(null); workspace.setError(cause instanceof Error ? cause.message : String(cause)); } })
      .finally(() => { if (workspace.isCurrent(id)) setBusy(false); });
  };
  const command = (value: BuilderCommand) => {
    if (!history) return;
    try { executeTransition(commitBuilderCommand(history, value)); }
    catch (cause) { workspace.setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const startManual = () => {
    if (!workspace.profile) return;
    workspace.beginRequest(); workspace.setError(null); workspace.setLoading(false); workspace.setMode('manual');
    workspace.setDashboard(null); workspace.setExecution(null);
    setHistory(startBuilder(blankDashboardDraft(workspace.profile, workspace.locale)));
  };
  const enter = () => { if (workspace.dashboard) { setHistory(startBuilder({ kind: 'dashboard', spec: workspace.dashboard })); workspace.setError(null); } };
  const exit = () => { setHistory(null); setBusy(false); };
  const undo = () => { if (history) executeTransition(undoBuilder(history)); };
  const redo = () => { if (history) executeTransition(redoBuilder(history)); };
  return { history, busy, reset, setLocale, executeTransition, command, startManual, enter, exit, undo, redo };
}
