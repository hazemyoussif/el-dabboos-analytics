import { useState } from 'react';
import type { Locale, TenantProfile } from '@el-dabbous/domain';
import type { WorkspaceController } from './useWorkspace.ts';
import type { ReturnTypeBuilder } from './useDashboardBuilder.ts';
import type { ReturnTypePlanner } from './useDashboardPlanner.ts';
import { dashboardActions, dashboardStatus, mayEnterCreation, switchDashboardEditor } from '../product-flow.ts';
import type { ProductPanel } from '../product-flow.ts';

export function useDashboardProductFlow(workspace: WorkspaceController, builder: ReturnTypeBuilder, planner: ReturnTypePlanner) {
  const [panel, setPanel] = useState<ProductPanel>('none');
  const actions = dashboardActions(workspace.document, !!builder.history, workspace.permissions.includes('ai:generate'), workspace.permissions.includes('ai:edit'));
  const status = dashboardStatus(workspace.document);
  const close = () => setPanel('none');
  const launchNew = () => setPanel('new');
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
  const save = async (asNew = false) => { if (await workspace.save(asNew)) { builder.exit(); close(); } };
  const discard = () => { builder.reset(); close(); void workspace.discard(); };
  const switchIdentity = (nextUserId: string) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.loadWorkspace(nextUserId, undefined, false);
  };
  const selectTenant = (selected: TenantProfile) => {
    if (!workspace.confirmAbandon()) return;
    builder.reset(); planner.reset(); close(); void workspace.loadWorkspace(workspace.userId, selected.id, false);
  };
  return { panel, status, actions, close, launchNew, enterCreation, blank, createAi, useTemplate, openTemplate, openSaved,
    editManual, editAi, applyAiEdit, view, save, discard, switchIdentity, selectTenant };
}
