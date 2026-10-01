import type { DashboardDocument } from './dashboard-lifecycle.ts';
import { documentIsDirty } from './dashboard-lifecycle.ts';

export type ProductPanel = 'none' | 'new' | 'create-ai' | 'choose-template' | 'edit-ai';
export type DashboardStatus = 'template' | 'unsaved' | 'saved' | 'modified';
export const showCreationPanel = (panel: ProductPanel): boolean => panel === 'new' || panel === 'create-ai' || panel === 'choose-template';
export const showAiCreation = (panel: ProductPanel): boolean => panel === 'create-ai';
export const showAiEditor = (panel: ProductPanel): boolean => panel === 'edit-ai';
export function dashboardStatus(document: DashboardDocument | null): DashboardStatus | null {
  if (!document) return null;
  if (document.kind === 'template') return 'template';
  if (document.kind === 'draft') return 'unsaved';
  return documentIsDirty(document) ? 'modified' : 'saved';
}
export function dashboardActions(document: DashboardDocument | null, editing: boolean, canGenerate: boolean, canEditAi: boolean) {
  const status = dashboardStatus(document);
  return {
    useTemplate: status === 'template',
    editManual: !!document?.spec && status !== 'template' && !editing,
    editAi: !!document?.spec && status !== 'template' && !editing && canEditAi,
    save: !!document?.spec && (status === 'unsaved' || status === 'modified'),
    saveAs: !!document?.spec && (status === 'saved' || status === 'modified'),
    discard: status === 'unsaved' || status === 'modified',
    createAi: canGenerate,
  };
}
export function mayEnterCreation(dirty: boolean, confirm: () => boolean): boolean { return !dirty || confirm(); }
