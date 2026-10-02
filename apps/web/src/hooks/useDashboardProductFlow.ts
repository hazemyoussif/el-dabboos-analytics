import { useState } from 'react';
import type { DashboardSpec, Locale, TenantProfile } from '@el-dabboos/domain';
import type { WorkspaceController } from './useWorkspace.ts';
import type { ReturnTypeBuilder } from './useDashboardBuilder.ts';
import type { ReturnTypePlanner } from './useDashboardPlanner.ts';
import { dashboardActions, dashboardStatus, mayEnterCreation, switchDashboardEditor } from '../product-flow.ts';
import type { ProductPanel } from '../product-flow.ts';

export function useDashboardProductFlow(workspace: WorkspaceController, builder: ReturnTypeBuilder, planner: ReturnTypePlanner) {
  const [nameDialog, setNameDialog] = useState<{ spec: DashboardSpec; operation: 'save' | 'copy' | 'rename' } | null>(null);
  const [panel, setPanel] = useState<ProductPanel>('none');
  const actions = dashboardActions(workspace.document, !!builder.history, workspace.permissions.includes('ai:generate'), workspace.permissions.includes('ai:edit'));
  const status = dashboardStatus(workspace.document);
  const close = () => { setPanel('none'); setNameDialog(null); };
  const launchNew = () => { planner.reset(); setPanel('new'); };
  const enterCreation = (next: 'create-ai' | 'choose-template') => {
    if (next === 'create-ai' && !mayEnterCreation(workspace.dirty, workspace.confirmAbandon)) return;
    planner.reset(); setPanel(next);
  };
  const blank = () => {
    if (!mayEnterCreation(workspace.dirty, workspace.confirmAbandon)) return;
    builder.startManual(); close();
  };
  const createAi = async () => { if (await planner.generate()) close(); };
  const useTemplate = () => {
    if (workspace.document?.kind !== 'template') return;
    workspace.applyWorkingSpec(workspace.document.spec); close();
  };
  const openTemplate = (templateId: string, selected: TenantProfile, locale: Locale) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.openTemplate(templateId, selected, locale);
  };
  const openSaved = (recordId: string) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.openSaved(recordId);
  };
  const editManual = () => switchDashboardEditor('manual', builder, setPanel);
  const editAi = () => switchDashboardEditor('ai', builder, setPanel);
  const applyAiEdit = async () => { if (await planner.edit()) close(); };
  const view = () => { builder.exit(); close(); };
  const save = async (asNew = false) => {
    if (!workspace.dashboard) return;
    if (asNew || workspace.document?.kind !== 'saved') { setNameDialog({ spec: workspace.dashboard, operation: asNew ? 'copy' : 'save' }); return; }
    if (await workspace.save()) { builder.exit(); close(); }
  };
  const rename = () => { if (workspace.dashboard) setNameDialog({ spec: workspace.dashboard, operation: 'rename' }); };
  const confirmName = async (spec: DashboardSpec) => {
    if (!nameDialog) return;
    if (nameDialog.operation === 'rename') {
      if (builder.history?.present.kind === 'dashboard') builder.command({ type: 'patch', patch: { schemaVersion: 2, operations: [{ op: 'set_title', title: spec.title }] } });
      else workspace.applyWorkingSpec(spec);
      setNameDialog(null); return;
    }
    if (await workspace.save(nameDialog.operation === 'copy', spec)) { builder.exit(); close(); }
  };
  const discard = () => { builder.reset(); close(); void workspace.discard(); };
  const switchIdentity = (nextUserId: string) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.loadWorkspace(nextUserId, undefined, false);
  };
  const selectTenant = (selected: TenantProfile) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.loadWorkspace(workspace.userId, selected.id, false);
  };
  return { nameDialog, setNameDialog, rename, confirmName, panel, status, actions, close, launchNew, enterCreation, blank, createAi, useTemplate, openTemplate, openSaved,
    editManual, editAi, applyAiEdit, view, save, discard, switchIdentity, selectTenant };
}
