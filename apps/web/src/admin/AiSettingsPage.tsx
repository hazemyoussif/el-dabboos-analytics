import { request } from '../api/client.ts';
import { AdministrationFrame, pageLabel } from './controls.tsx';
import type { AdministrationPageProps } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
import { AiSettingsForm } from './AiSettingsForm.tsx';
import type { AiSettingsPageData } from './AiSettingsForm.tsx';
export function AiSettingsPage({ session, permissions }: AdministrationPageProps) {
  const label = pageLabel(session.locale);
  const path = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin/ai-settings`;
  const allowed = permissions.includes('tenant:manage');
  const state = useAdministrationRequest<AiSettingsPageData | null>(session, () => allowed ? request(session, path, 'GET') : Promise.resolve(null), null, () => {});
  return <AdministrationFrame locale={session.locale} title={label('AI settings', 'إعدادات AI')} allowed={allowed} busy={state.busy} error={state.error} notice={state.notice} load={state.load}>
    {state.data && <AiSettingsForm key={state.data.record?.version ?? 'new'} data={state.data} session={session} busy={state.busy} save={body => state.mutate(path, 'PUT', body)} />}
  </AdministrationFrame>;
}
