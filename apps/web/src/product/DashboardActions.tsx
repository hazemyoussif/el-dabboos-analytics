import { Copy, MoreHorizontal, Pencil, Save, Sparkles, Undo2, Eye, Plus, LayoutTemplate } from 'lucide-react';
import type { Locale } from '@el-dabboos/domain';
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
    {!status && <button type="button" onClick={onNew}><Plus aria-hidden="true" />{t.newDashboard}</button>}
    {editing && <button type="button" disabled={loading} onClick={onView}><Eye aria-hidden="true" />{t.view}</button>}
    {actions.useTemplate && <button type="button" className="primary-button" disabled={!canCreate || loading} onClick={onUseTemplate}><LayoutTemplate aria-hidden="true" />{t.useTemplate}</button>}
    {actions.editManual && <button type="button" className={status === 'saved' ? 'primary-button' : undefined} disabled={loading || !(canEdit || status === 'unsaved')} onClick={onEdit}><Pencil aria-hidden="true" />{t.edit}</button>}
    {actions.editAi && <button type="button" disabled={loading} onClick={onEditAi}><Sparkles aria-hidden="true" />{t.editWithAi}</button>}
    {actions.save && <button type="button" className="primary-button" disabled={loading || !(status === 'modified' ? canEdit : canCreate)} onClick={onSave}><Save aria-hidden="true" />{t.save}</button>}
    {status && <details className="secondary-actions"><summary aria-label={locale === 'ar' ? 'إجراءات اللوحة' : 'Dashboard actions'}><MoreHorizontal aria-hidden="true" /></summary><div className="action-popover">
      <button type="button" onClick={onNew}><Plus aria-hidden="true" />{t.newDashboard}</button>
      {props.onRename && status !== 'template' && <button type="button" disabled={loading || !(canEdit || status === 'unsaved')} onClick={props.onRename}><Pencil aria-hidden="true" />{libraryCopy[locale].rename}</button>}
      {actions.saveAs && <button type="button" disabled={loading || !canCreate} onClick={onSaveAs}><Copy aria-hidden="true" />{t.saveAs}</button>}
      {actions.discard && <button type="button" className="button-danger" disabled={loading} onClick={onDiscard}><Undo2 aria-hidden="true" />{t.discard}</button>}
    </div></details>}
  </div>;
}
