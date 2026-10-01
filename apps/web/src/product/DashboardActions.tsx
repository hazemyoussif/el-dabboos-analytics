import type { Locale } from '@el-dabbous/domain';
import { libraryCopy } from '../library-copy.ts';
import { copy } from '../i18n.ts';
import type { dashboardActions, DashboardStatus } from '../product-flow.ts';

interface Props {
  locale: Locale; status: DashboardStatus | null; actions: ReturnType<typeof dashboardActions>; editing: boolean; loading: boolean;
  canCreate: boolean; canEdit: boolean; onNew: () => void; onUseTemplate: () => void; onEdit: () => void;
  onEditAi: () => void; onView: () => void; onSave: () => void; onSaveAs: () => void; onDiscard: () => void; onRename?: () => void;
}
export function DashboardActions(props: Props) {
  const { locale, status, actions, editing, loading, canCreate, canEdit, onNew, onUseTemplate, onEdit, onEditAi, onView, onSave, onSaveAs, onDiscard } = props;
  const t = copy[locale];
  return <div className="dashboard-actions">
    <button type="button" onClick={onNew}>{t.newDashboard}</button>
    {editing && <button type="button" onClick={onView}>{t.view}</button>}
    {actions.useTemplate && <button type="button" className="primary-button" disabled={!canCreate || loading} onClick={onUseTemplate}>{t.useTemplate}</button>}
    {actions.editManual && <button type="button" className={status === 'saved' ? 'primary-button' : undefined} disabled={loading || !(canEdit || status === 'unsaved')} onClick={onEdit}>{t.edit}</button>}
    {props.onRename && status !== 'template' && <button type="button" disabled={loading || !(canEdit || status === 'unsaved')} onClick={props.onRename}>{libraryCopy[locale].rename}</button>}
    {actions.editAi && <button type="button" disabled={loading} onClick={onEditAi}>✦ {t.editWithAi}</button>}
    {actions.save && <button type="button" className="primary-button" disabled={loading || !(status === 'modified' ? canEdit : canCreate)} onClick={onSave}>{t.save}</button>}
    {actions.saveAs && <button type="button" disabled={loading || !canCreate} onClick={onSaveAs}>{t.saveAs}</button>}
    {actions.discard && <button type="button" disabled={loading} onClick={onDiscard}>{t.discard}</button>}
  </div>;
}
