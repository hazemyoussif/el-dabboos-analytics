import type { ProductUser } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, MembershipDetails, pageLabel, RoleSelection } from './controls.tsx';
import { membershipFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, MembershipPageData, MembershipSummary, RoleSummary } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
interface MembershipsPageData extends MembershipPageData {
    supportingRoles: RoleSummary[];
    candidates: ProductUser[];
}
export function MembershipsPage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<MembershipSummary | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const allowed = permissions;
    const canManage = allowed.includes('users:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<MembershipsPageData>(session, (cursor) => (async () => {
        const result = await request<MembershipPageData>(session, tenantBase + '/memberships' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET');
        const supportingRoles = permissions.includes('roles:view') ? (await request<{
            items: RoleSummary[];
        }>(session, tenantBase + '/roles', 'GET')).items : [];
        const candidates = permissions.includes('users:view') ? (await request<{
            items: ProductUser[];
        }>(session, tenantBase + '/candidates', 'GET')).items : [];
        return { ...result, supportingRoles, candidates };
    })(), { supportingRoles: [], candidates: [] }, () => setEditing(null));
    const roles = data.supportingRoles;
    const candidates = data.candidates;
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = membershipFormRequest(new FormData(event.currentTarget), record, tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const membership = record;
    const editingRecord = record;
    const roleChecks = (selected: readonly string[]) => <RoleSelection roles={roles} selected={selected}/>;
    return <AdministrationFrame locale={locale} title={label('Users', 'المستخدمون')} allowed={allowed.includes('users:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}>{canManage && !busy && permissions.includes('roles:manage') && candidates.length > 0 && <button type="button" onClick={() => setEditing('new')}>{label('Create', 'إنشاء')}</button>}{!candidates.length && <p>{label('New members require an operationally provisioned tenant candidate. Invitation email is not configured.', 'إضافة الأعضاء تتطلب مرشحاً مجهزاً تشغيلياً لمساحة العمل. بريد الدعوات غير مهيأ.')}</p>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.user.displayName}</th><td><MembershipDetails membership={item} locale={locale}/></td><td>{item.version}</td><td>{canManage && <button type="button" disabled={busy || !permissions.includes('roles:manage')} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}{canManage && <button type="button" disabled={busy} onClick={() => void mutate(tenantBase + '/memberships/' + encodeURIComponent(item.id) + '/suspend', 'POST', { expectedVersion: item.version, status: item.status === 'active' ? 'suspended' : 'active' })}>{item.status === 'active' ? label('Suspend membership', 'تعليق العضوية') : label('Reactivate membership', 'إعادة تفعيل العضوية')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<>{!editingRecord && <label>{label('Provisioned candidate', 'مرشح مجهز')}<select name="userId" required>{candidates.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>}<fieldset><legend>{label('Roles', 'الأدوار')}</legend>{roleChecks(membership?.roleIds ?? [])}</fieldset></>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
