import { administrationLabel } from './copy.ts';
import type { CustomerAccount, ManagedTenant } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, pageLabel } from './controls.tsx';
import { tenantFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, TenantPageData } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
interface TenantsPageData extends TenantPageData {
    customers: CustomerAccount[];
    selectedCustomerId: string;
}
export function TenantsPage({ session, platformPermissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<ManagedTenant | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const allowed = platformPermissions;
    const canManage = allowed.includes('platform:tenants:manage');
    const [customerId, setCustomerId] = useState('');
    const { data, error, notice, busy, load, mutate, invalidate } = useAdministrationRequest<TenantsPageData>(session, (cursor) => (async () => {
        if (!allowed.includes('platform:customers:view'))
            throw Error(label('Customer read permission is required to choose an owner.', 'يلزم إذن عرض العملاء لاختيار المالك.'));
        const response = await request<{
            items: CustomerAccount[];
        }>(session, '/api/platform/customers', 'GET');
        const selectedCustomerId = customerId || response.items[0]?.id || '';
        if (!selectedCustomerId)
            return { items: [], customers: response.items, selectedCustomerId };
        const result = await request<TenantPageData>(session, '/api/platform/customers/' + encodeURIComponent(selectedCustomerId) + '/tenants' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET');
        return { ...result, customers: response.items, selectedCustomerId };
    })(), { customers: [], selectedCustomerId: '' }, () => setEditing(null), customerId);
    const customers = data.customers;
    const selectedCustomerId = data.selectedCustomerId;
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = tenantFormRequest(new FormData(event.currentTarget), record, selectedCustomerId);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const tenant = record;
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Tenants', 'مساحات العمل')} allowed={allowed.includes('platform:tenants:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}><p>{label('Platform authority manages metadata. Analytics requires a separate tenant membership.', 'صلاحيات المنصة لإدارة البيانات الوصفية. التحليلات تتطلب عضوية مستقلة بمساحة العمل.')}</p><label>{label('Customer', 'العميل')}<select value={selectedCustomerId} onChange={event => { invalidate(); setCustomerId(event.target.value); }}>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>{canManage && !busy && <button type="button" onClick={() => setEditing('new')}>{label('Create', 'إنشاء')}</button>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.name}</th><td>{administrationLabel(item.status, locale)}</td><td>{item.version}<p>{item.analyticsReady ? label('Ready', 'جاهزة') : label('DATA_NOT_READY', 'البيانات غير جاهزة')}</p></td><td>{canManage && <button type="button" disabled={busy} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<label>{label('Name', 'الاسم')}<input name="name" required maxLength={200} defaultValue={editingRecord ? editingRecord.name : ''}/></label>}
   {<label>{label('Default locale', 'اللغة الافتراضية')}<select name="defaultLocale" defaultValue={tenant?.configuration.defaultLocale ?? 'en'}><option value="en">English</option><option value="ar">العربية</option></select></label>}
   {<label>{label('Approved market / currency / timezone', 'السوق / العملة / المنطقة الزمنية المعتمدة')}<select name="market" defaultValue={tenant?.configuration.countryCode ?? 'IQ'} disabled={!!tenant && tenant.status !== 'provisioning'}><option value="IQ">IQ · IQD · Asia/Baghdad</option><option value="EG">EG · EGP · Africa/Cairo</option></select>{tenant && tenant.status !== 'provisioning' && <input type="hidden" name="market" value={tenant.configuration.countryCode}/>}</label>}
   {editingRecord && <label>{label('Status', 'الحالة')}<select name="status" defaultValue={editingRecord.status}>{(['provisioning', 'active', 'suspended']).map(status => <option key={status} value={status}>{administrationLabel(status, locale)}</option>)}</select></label>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
