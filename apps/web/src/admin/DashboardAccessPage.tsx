import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, pageLabel, RoleSelection } from './controls.tsx';
import { dashboardAccessFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, DashboardPageData, DashboardSummary, MembershipSummary, RoleSummary } from './page-contracts.ts';
import { omittedMembershipGrants } from './selection-retention.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
interface DashboardAccessPageData extends DashboardPageData {
    supportingRoles: RoleSummary[];
    members: MembershipSummary[];
}
export function DashboardAccessPage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<DashboardSummary | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const allowed = permissions;
    const canManage = allowed.includes('dashboard_access:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<DashboardAccessPageData>(session, (cursor) => (async () => {
        const result = await request<DashboardPageData>(session, tenantBase + '/dashboard-access' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET');
        const supportingRoles = permissions.includes('roles:view') ? (await request<{
            items: RoleSummary[];
        }>(session, tenantBase + '/roles', 'GET')).items : [];
        const members = permissions.includes('users:view') ? (await request<{
            items: MembershipSummary[];
        }>(session, tenantBase + '/memberships', 'GET')).items : [];
        return { ...result, supportingRoles, members };
    })(), { supportingRoles: [], members: [] }, () => setEditing(null));
    const roles = data.supportingRoles;
    const members = data.members;
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = dashboardAccessFormRequest(new FormData(event.currentTarget), record, tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const dash = record;
    const editingRecord = record;
    const roleChecks = (selected: readonly string[]) => <RoleSelection roles={roles} selected={selected}/>;
    return <AdministrationFrame locale={locale} title={label('Dashboard Access', 'الوصول للوحات')} allowed={allowed.includes('dashboard_access:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}>{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.title[locale]}</th><td><><p>{item.scope}</p><p>{item.grants.map(grant => `${grant.subjectType}: ${grant.subjectId}`).join(', ')}</p></></td><td>{item.version}</td><td>{canManage && <button type="button" disabled={busy || !permissions.includes('roles:view') || !permissions.includes('users:view') || !permissions.includes('dashboard:share')} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<><label>{label('Visibility', 'الظهور')}<select name="scope" defaultValue={dash?.scope ?? 'private'}>{['private', 'tenant', 'restricted'].map(status => <option key={status}>{status}</option>)}</select></label><fieldset><legend>{label('Role view grants (preferred)', 'منح العرض للأدوار (مفضل)')}</legend>{roleChecks(dash?.grants.filter(grant => grant.subjectType === 'role').map(grant => grant.subjectId) ?? [])}</fieldset><details><summary>{label('Membership exceptions', 'استثناءات العضويات')}</summary>{members.map(membership => <label key={membership.id}><input type="checkbox" name="membership" value={membership.id} defaultChecked={dash?.grants.some(grant => grant.subjectType === 'membership' && grant.subjectId === membership.id)}/>{membership.user.displayName} · {membership.status}</label>)}{omittedMembershipGrants(dash?.grants ?? [], members).map(grant => <label key={grant.subjectId}><input type="checkbox" name="membership" value={grant.subjectId} defaultChecked/>{grant.subjectId} · {label('Existing exception', 'استثناء موجود')}</label>)}</details></>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
