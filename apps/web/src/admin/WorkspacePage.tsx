import { administrationLabel } from './copy.ts';
import type { ManagedTenant } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, pageLabel } from './controls.tsx';
import { workspaceFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, WorkspacePageData } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
export function WorkspacePage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<ManagedTenant | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const allowed = permissions;
    const canManage = allowed.includes('tenant:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<WorkspacePageData>(session, (cursor) => request<WorkspacePageData>(session, tenantBase + '/tenant' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET'), {}, () => setEditing(null));
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = workspaceFormRequest(new FormData(event.currentTarget), record, tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const tenant = record;
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Tenant', 'مساحة العمل')} allowed={allowed.includes('tenant:view')} busy={busy} error={error} notice={notice} load={load}>{data.tenant && <><p>{label('Analytics readiness', 'جاهزية التحليلات')}: {data.analyticsReady ? label('Ready', 'جاهزة') : label('DATA_NOT_READY', 'البيانات غير جاهزة')}</p><dl>{Object.entries({ name: data.tenant.name, customer: data.customer?.name, status: data.tenant.status, ...data.tenant.configuration }).map(([key, value]) => <div key={key}><dt>{administrationLabel(key, locale)}</dt><dd><bdi>{administrationLabel(String(value ?? ''), locale)}</bdi></dd></div>)}</dl>{canManage && <button type="button" onClick={() => setEditing(data.tenant!)}>{label('Edit', 'تعديل')}</button>}</>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<label>{label('Name', 'الاسم')}<input name="name" required maxLength={200} defaultValue={editingRecord ? editingRecord.name : ''}/></label>}
   {<label>{label('Default locale', 'اللغة الافتراضية')}<select name="defaultLocale" defaultValue={tenant?.configuration.defaultLocale ?? 'en'}><option value="en">English</option><option value="ar">العربية</option></select></label>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
