import { administrationError, administrationLabel } from './copy.ts';
import type { ScopeDimension } from '@el-dabboos/domain';
import { scopeDimensions } from '@el-dabboos/domain';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { request } from '../api/client.ts';
import { AdministrationFrame, AdministrationTable, MembershipDetails, pageLabel } from './controls.tsx';
import { scopeFormRequest } from './form-requests.ts';
import type { AdministrationPageProps, MembershipPageData, MembershipSummary } from './page-contracts.ts';
import { scopeOptionsWithRetainedValues } from './selection-retention.ts';
import { useAdministrationRequest } from './useAdministrationRequest.ts';
interface ScopePageData extends MembershipPageData {
    values: Partial<Record<ScopeDimension, {
        id: string;
        label: string;
    }[]>>;
    scopeError: string;
}
export function DataAccessPage({ session, permissions }: AdministrationPageProps) {
    const [editing, setEditing] = useState<MembershipSummary | 'new' | null>(null);
    const label = pageLabel(session.locale), locale = session.locale;
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const allowed = permissions;
    const canManage = allowed.includes('data_scopes:manage');
    const { data, error, notice, busy, load, mutate } = useAdministrationRequest<ScopePageData>(session, (cursor) => (async () => {
        const result = await request<MembershipPageData>(session, tenantBase + '/membership-scopes' + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET');
        let values: ScopePageData['values'] = {}, scopeError = '';
        try {
            const entries = await Promise.all(scopeDimensions.map(async (dimension) => {
                const response = await request<{
                    values: {
                        id: string;
                        label: string;
                    }[];
                }>(session, tenantBase + '/scope-values/' + dimension, 'GET');
                return [dimension, response.values];
            }));
            values = Object.fromEntries(entries);
        }
        catch (error) {
            scopeError = administrationError(error, locale);
        }
        return { ...result, values, scopeError };
    })(), { values: {}, scopeError: '' }, () => setEditing(null));
    const { values, scopeError } = data;
    const record = editing === 'new' ? null : editing;
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const writeRequest = scopeFormRequest(new FormData(event.currentTarget), record, tenantBase);
        void mutate(writeRequest.path, writeRequest.method, writeRequest.body);
    };
    const membership = record;
    const editingRecord = record;
    return <AdministrationFrame locale={locale} title={label('Data Access', 'الوصول للبيانات')} allowed={allowed.includes('data_scopes:view')} busy={busy} error={error} notice={notice} load={load} nextCursor={data.nextCursor} empty={data.items?.length === 0}><p>{label('Roles define what users can do. Data Access defines which business data they can see.', 'الأدوار تحدد ما يمكن للمستخدم فعله. الوصول للبيانات يحدد بيانات الأعمال التي يراها.')}</p><p>{label('Values within one dimension use OR; different dimensions combine with AND.', 'القيم داخل البعد الواحد تُجمع بمنطق «أو»؛ والأبعاد المختلفة تُجمع بمنطق «و».')}</p>{scopeError && <p role="alert">{scopeError}</p>}{!!data.items?.length && <AdministrationTable locale={locale}>{data.items.map(item => <tr key={item.id}><th scope="row">{item.user.displayName}</th><td><MembershipDetails membership={item} locale={locale}/></td><td>{item.version}</td><td>{canManage && <button type="button" disabled={busy || !!scopeError} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}</td></tr>)}</AdministrationTable>}{editing && <form className="admin-form" onSubmit={save} key={editingRecord ? editingRecord.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {scopeDimensions.map(dimension => <fieldset key={dimension}><legend>{administrationLabel(dimension, locale)}</legend>{scopeOptionsWithRetainedValues(values[dimension] ?? [], membership?.dataScopes ?? [], dimension, label('stale — requires review', 'قديم — يتطلب مراجعة')).map(value => <label key={value.id}><input type="checkbox" name={dimension} value={value.id} defaultChecked={membership?.dataScopes.find(dataScope => dataScope.dimension === dimension)?.values.includes(value.id)}/>{value.label}</label>)}</fieldset>)}
   <button type="submit" disabled={!!scopeError}>{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}</AdministrationFrame>;
}
