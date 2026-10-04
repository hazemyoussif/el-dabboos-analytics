import { administrationLabel } from './copy.ts';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, pageLabel } from './controls.tsx';
import { userFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, PlatformUserSummary, UserPageData } from './page-contracts.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
export function PlatformUsersPage({ session, platformPermissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<PlatformUserSummary | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const allowed = platformPermissions;
    const canManage = allowed.includes('platform:users:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<UserPageData>(session, (cursor) => request<UserPageData>(session, '/api/platform/users' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET'), {}, () => setEditing(null));
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = userFormRequest(new FormData(event.currentTarget), record);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const user = record;
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Users / Access', 'المستخدمون / الوصول')} allowed={allowed.includes('platform:users:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}><p>{label('Platform authority manages metadata. Analytics requires a separate tenant membership.', 'صلاحيات المنصة لإدارة البيانات الوصفية. التحليلات تتطلب عضوية مستقلة بمساحة العمل.')}</p>{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.displayName}</th><td>{administrationLabel(item.status, locale)}</td><td>{item.version}<p>{item.identities.map(identity => `${identity.provider}: ${administrationLabel(identity.status, locale)}`).join(', ')}</p><p>{item.platformAssignment?.roleIds.join(', ')} · {item.platformAssignment && administrationLabel(item.platformAssignment.status, locale)}</p></td><td>{canManage && <button type="button" disabled={busy} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}{canManage && item.identities.filter(identity => identity.status === 'active').map(identity => <button key={identity.id} type="button" disabled={busy} onClick={() => void mutate('/api/platform/identities/' + encodeURIComponent(identity.id) + '/disable', 'POST', {})}>{label('Disable identity', 'تعطيل الهوية')}: {identity.provider}</button>)}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {<label>{label('Default locale', 'اللغة الافتراضية')}<select name="defaultLocale" defaultValue={user?.preferredLocale ?? 'en'}><option value="en">English</option><option value="ar">العربية</option></select></label>}
   {<label>{label('Display name', 'الاسم المعروض')}<input name="displayName" required maxLength={200} defaultValue={user?.displayName}/></label>}
   {editingRecord && <label>{label('Status', 'الحالة')}<select name="status" defaultValue={editingRecord.status}>{(['invited', 'active', 'suspended']).map(status => <option key={status} value={status}>{administrationLabel(status, locale)}</option>)}</select></label>}
   <button type="submit">{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
