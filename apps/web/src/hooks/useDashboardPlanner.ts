import { useState } from 'react';
import { editDashboard, generateDashboard } from '../api/client.ts';
import type { WorkspaceController } from './useWorkspace.ts';

export function useDashboardPlanner(workspace: WorkspaceController, onGenerated: () => void) {
  const [prompt, setPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const reset = () => { setPrompt(''); setInstruction(''); };
  const generate = async () => {
    if (!workspace.profile || !prompt.trim()) return;
    const id = workspace.beginRequest(); workspace.setError(null); workspace.setLoading(true);
    try {
      const result = await generateDashboard(workspace.session(), prompt);
      if (workspace.isCurrent(id)) {
        workspace.setDashboard(result.dashboard); workspace.setExecution(result.execution); workspace.setMode('generated'); onGenerated();
      }
    } catch (cause) { if (workspace.isCurrent(id)) workspace.setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (workspace.isCurrent(id)) workspace.setLoading(false); }
  };
  const edit = async () => {
    if (!workspace.profile || !workspace.dashboard || !instruction.trim()) return;
    const id = workspace.beginRequest(); workspace.setError(null); workspace.setLoading(true);
    try {
      const result = await editDashboard(workspace.session(), workspace.dashboard, instruction);
      if (workspace.isCurrent(id)) { workspace.setDashboard(result.dashboard); workspace.setExecution(result.execution); setInstruction(''); }
    } catch (cause) { if (workspace.isCurrent(id)) workspace.setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (workspace.isCurrent(id)) workspace.setLoading(false); }
  };
  return { prompt, setPrompt, instruction, setInstruction, reset, generate, edit };
}
