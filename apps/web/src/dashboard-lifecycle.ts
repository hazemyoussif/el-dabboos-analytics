import type { DashboardRecord, DashboardSpec } from '@el-dabbous/domain';

export type DashboardDocument =
  | { kind: 'template'; templateId: string; spec: DashboardSpec }
  | { kind: 'draft'; origin: 'manual' | 'ai' | 'template'; spec: DashboardSpec | null }
  | { kind: 'saved'; record: DashboardRecord; spec: DashboardSpec | null };
export const openTemplateDocument = (templateId: string, spec: DashboardSpec): DashboardDocument =>
  ({ kind: 'template', templateId, spec: structuredClone(spec) });
export const newManualDocument = (): DashboardDocument => ({ kind: 'draft', origin: 'manual', spec: null });
export const generatedDocument = (spec: DashboardSpec): DashboardDocument => ({ kind: 'draft', origin: 'ai', spec: structuredClone(spec) });
export const savedDocument = (record: DashboardRecord): DashboardDocument =>
  ({ kind: 'saved', record: structuredClone(record), spec: structuredClone(record.spec) });
export function editDocument(document: DashboardDocument, spec: DashboardSpec | null): DashboardDocument {
  if (document.kind === 'template') return { kind: 'draft', origin: 'template', spec: spec ? structuredClone(spec) : null };
  return { ...document, spec: spec ? structuredClone(spec) : null };
}
export const documentIsDirty = (document: DashboardDocument | null): boolean =>
  !!document && (document.kind === 'draft' || (document.kind === 'saved' && JSON.stringify(document.spec) !== JSON.stringify(document.record.spec)));
export const discardSavedChanges = (document: DashboardDocument): DashboardDocument | null =>
  document.kind === 'saved' ? savedDocument(document.record) : null;

export async function persistDocument(document: DashboardDocument, asNew: boolean, actions: {
  create: (spec: DashboardSpec) => Promise<DashboardRecord>;
  update: (id: string, spec: DashboardSpec, expectedVersion: number) => Promise<DashboardRecord>;
}): Promise<DashboardDocument> {
  if (!document.spec) throw new Error('Dashboard draft is incomplete');
  const record = document.kind === 'saved' && !asNew
    ? await actions.update(document.record.id, document.spec, document.record.version)
    : await actions.create(document.spec);
  return savedDocument(record);
}
