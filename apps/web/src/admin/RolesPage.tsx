import { accessMetricDomains, tenantPermissions } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, pageLabel } from './controls.tsx';
import { roleFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, RolePageData, RoleSummary } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
export function RolesPage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<RoleSummary | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const allowed = permissions;
    const canManage = allowed.includes('roles:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<RolePageData>(session, (cursor) => request<RolePageData>(session, tenantBase + '/roles' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET'), {}, () => setEditing(null));
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = roleFormRequest(new FormData(event.currentTarget), record, tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const role = record;
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Roles', 'الأدوار')} allowed={allowed.includes('roles:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}>{canManage && !busy && <button type="button" onClick={() => setEditing('new')}>{label('Create', 'إنشاء')}</button>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.name}<p>{item.description}</p></th><td><><p>{item.protected ? label('System · protected', 'نظام · محمي') : label('Custom', 'مخصص')} · {item.membershipCount} {label('memberships', 'عضويات')}</p><p>{item.permissions.join(', ')}</p><p>{item.metricDomains.join(', ')}</p></></td><td>{item.version}</td><td>{canManage && !item.protected && <button type="button" disabled={busy} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}{canManage && !item.protected && <button type="button" disabled={busy || item.membershipCount > 0} onClick={() => void mutate(tenantBase + '/roles/' + encodeURIComponent(item.id), 'DELETE', { expectedVersion: item.version })}>{label('Delete unassigned role', 'حذف دور غير معين')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<label>{label('Name', 'الاسم')}<input name="name" required maxLength={200} defaultValue={editingRecord ? editingRecord.name : ''}/></label>}
   {<><label>{label('Description', 'الوصف')}<textarea name="description" maxLength={1000} defaultValue={role?.description ?? ''}/></label><fieldset><legend>{label('Permissions', 'الصلاحيات')}</legend>{tenantPermissions.filter(permission => (data.grantablePermissions ?? permissions).includes(permission)).map(permission => <label key={permission}><input type="checkbox" name="permission" value={permission} defaultChecked={role?.permissions.includes(permission)}/>{permission}</label>)}</fieldset><fieldset><legend>{label('Analytics domains', 'مجالات التحليلات')}</legend>{accessMetricDomains.filter(dimension => (data.grantableMetricDomains ?? accessMetricDomains).includes(dimension)).map(dimension => <label key={dimension}><input type="checkbox" name="domain" value={dimension} defaultChecked={role?.metricDomains.includes(dimension)}/>{dimension}</label>)}</fieldset></>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
