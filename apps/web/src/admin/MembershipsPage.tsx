import type { ProductUser } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, MembershipDetails, pageLabel, RoleSelection } from './controls.tsx';
import { membershipFormRequest,workspaceUserFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, MembershipPageData, MembershipSummary, RoleSummary } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
interface MembershipsPageData extends MembershipPageData {
    supportingRoles: RoleSummary[];
    candidates: ProductUser[];
}
export function MembershipsPage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<MembershipSummary | 'new' | 'existing' | null>(null);
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
    const record = typeof editing==='object' ? editing : null;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const form=new FormData(event.currentTarget);
        if(!form.getAll('role').length){
            event.currentTarget.querySelector<HTMLInputElement>('input[name="role"]')?.setCustomValidity(label('Select at least one workspace role.','اختر دوراً واحداً على الأقل لمساحة العمل.'));
            event.currentTarget.reportValidity();return;
        }
        const writeRequest = editing==='new'?workspaceUserFormRequest(form,tenantBase):membershipFormRequest(form,record,tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const membership = record;
    const editingRecord = record;
    const roleChecks = (selected: readonly string[]) => <RoleSelection roles={roles} selected={selected}/>;
    return <AdministrationFrame locale={locale} title={label('Users', 'المستخدمون')} allowed={allowed.includes('users:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}>{canManage && !busy && permissions.includes('roles:manage') && roles.length>0 && <><button type="button" onClick={() => setEditing('new')}>{label('Create user', 'إنشاء مستخدم')}</button>{candidates.length > 0 && <button type="button" onClick={() => setEditing('existing')}>{label('Assign existing user', 'تعيين مستخدم موجود')}</button>}</>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.user.displayName}</th><td><MembershipDetails membership={item} locale={locale}/></td><td>{item.version}</td><td>{canManage && <button type="button" disabled={busy || !permissions.includes('roles:manage')} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}{canManage && <button type="button" disabled={busy} onClick={() => void mutate(tenantBase + '/memberships/' + encodeURIComponent(item.id) + '/suspend', 'POST', { expectedVersion: item.version, status: item.status === 'active' ? 'suspended' : 'active' })}>{item.status === 'active' ? label('Suspend membership', 'تعليق العضوية') : label('Reactivate membership', 'إعادة تفعيل العضوية')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={typeof editing==='string'?editing:editingRecord?.id}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {editing==='new' && <><label>{label('Display name','الاسم المعروض')}<input name="displayName" required maxLength={200}/></label><label>{label('Email','البريد الإلكتروني')}<input name="email" type="email" required maxLength={254}/></label><label>{label('Initial password','كلمة المرور المبدئية')}<input name="password" type="password" required minLength={8} maxLength={1024} autoComplete="new-password"/></label><label>{label('Default locale','اللغة الافتراضية')}<select name="defaultLocale" defaultValue={locale}><option value="en">English</option><option value="ar">العربية</option></select></label></>}
   {editing==='existing' && <label>{label('Existing user','مستخدم موجود')}<select name="userId" required>{candidates.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></label>}
   <fieldset onChange={event=>event.currentTarget.querySelector<HTMLInputElement>('input[name="role"]')?.setCustomValidity('')}><legend>{label('Workspace roles','أدوار مساحة العمل')}</legend>{roleChecks(membership?.roleIds ?? [])}</fieldset>
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
