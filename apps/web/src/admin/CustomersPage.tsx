import type { CustomerAccount } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, pageLabel } from './controls.tsx';
import { customerFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, CustomerPageData } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
export function CustomersPage({ session, platformPermissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<CustomerAccount | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const allowed = platformPermissions;
    const canManage = allowed.includes('platform:customers:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<CustomerPageData>(session, (cursor) => request<CustomerPageData>(session, '/api/platform/customers' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET'), {}, () => setEditing(null));
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = customerFormRequest(new FormData(event.currentTarget), record);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Customers', 'العملاء')} allowed={allowed.includes('platform:customers:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}><p>{label('Platform authority manages metadata. Analytics requires a separate tenant membership.', 'صلاحيات المنصة لإدارة البيانات الوصفية. التحليلات تتطلب عضوية مستقلة بمساحة العمل.')}</p>{canManage && !busy && <button type="button" onClick={() => setEditing('new')}>{label('Create', 'إنشاء')}</button>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.name}</th><td>{item.status}</td><td>{item.version}<p>{item.tenantCount} {label('tenants', 'مساحات')}</p></td><td>{canManage && <button type="button" disabled={busy} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<label>{label('Name', 'الاسم')}<input name="name" required maxLength={200} defaultValue={editingRecord ? editingRecord.name : ''}/></label>}
   {editingRecord && <label>{label('Status', 'الحالة')}<select name="status" defaultValue={editingRecord.status}>{(['active', 'suspended']).map(status => <option key={status}>{status}</option>)}</select></label>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
