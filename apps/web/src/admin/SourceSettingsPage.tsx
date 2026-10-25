import { request } from '../api/client.ts';
import { AdministrationFrame, pageLabel } from './controls.tsx';
import type { AdministrationPageProps } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
import { SourceSettingsForm } from './SourceSettingsForm.tsx';
import type { SourceSettingsPageData } from './SourceSettingsForm.tsx';

export function SourceSettingsPage({ session, permissions }: AdministrationPageProps) {
  const label = pageLabel(session.locale), allowed = permissions.includes('tenant:manage');
  const path = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin/source-settings`;
  const state = useAdministrationRequest<SourceSettingsPageData | null>(session, () => allowed ? request(session, path, 'GET') : Promise.resolve(null), null, () => {});
  return <AdministrationFrame locale={session.locale} title={label('Source settings', 'إعدادات المصدر')} allowed={allowed} busy={state.busy} error={state.error} notice={state.notice} load={state.load}>
    {state.data && <SourceSettingsForm key={state.data.record?.version ?? 'new'} data={state.data} session={session} busy={state.busy} save={body => state.mutate(path, 'PUT', body)} />}
  </AdministrationFrame>;
}
