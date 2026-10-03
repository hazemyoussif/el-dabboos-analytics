import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { tenantPermissions, accessMetricDomains, scopeDimensions } from '@el-dabboos/domain';
import type { CustomerAccount, ManagedTenant, ManagedMembership, TenantAccessRole, ProductUser, DashboardAccessState, Locale } from '@el-dabboos/domain';
import { ApiClientError, request } from '../api/client.ts';
import type { ApiSession } from '../api/client.ts';
export type AdminPage = 'platform-customers' | 'platform-tenants' | 'platform-users' | 'users' | 'roles' | 'data-access' | 'dashboard-access' | 'tenant';
export const adminPages: readonly {
    page: AdminPage;
    permission: string;
    en: string;
    ar: string;
}[] = [
    { page: 'platform-customers', permission: 'platform:customers:view', en: 'Customers', ar: 'العملاء' }, { page: 'platform-tenants', permission: 'platform:tenants:view', en: 'Tenants', ar: 'مساحات العمل' }, { page: 'platform-users', permission: 'platform:users:view', en: 'Users / Access', ar: 'المستخدمون / الوصول' },
    { page: 'users', permission: 'users:view', en: 'Users', ar: 'المستخدمون' }, { page: 'roles', permission: 'roles:view', en: 'Roles', ar: 'الأدوار' }, { page: 'data-access', permission: 'data_scopes:view', en: 'Data Access', ar: 'الوصول للبيانات' }, { page: 'dashboard-access', permission: 'dashboard_access:view', en: 'Dashboard Access', ar: 'الوصول للوحات' }, { page: 'tenant', permission: 'tenant:view', en: 'Tenant', ar: 'مساحة العمل' },
];
export function AdministrationNavigation({ permissions, platformPermissions, page, onPage, locale }: {
    permissions: readonly string[];
    platformPermissions: readonly string[];
    page: AdminPage | null;
    onPage: (p: AdminPage) => void;
    locale: Locale;
}) {
    return <>{[true, false].map(platform => { const allowed = adminPages.filter(p => p.page.startsWith('platform-') === platform && (platform ? platformPermissions : permissions).includes(p.permission)); return allowed.length ? <nav className="sidebar-section" key={String(platform)} aria-label={platform ? (locale === 'ar' ? 'إدارة المنصة' : 'Platform Administration') : (locale === 'ar' ? 'الإدارة' : 'Administration')}><h3>{platform ? (locale === 'ar' ? 'إدارة المنصة' : 'Platform Administration') : (locale === 'ar' ? 'الإدارة' : 'Administration')}</h3>{allowed.map(p => <button type="button" key={p.page} aria-current={page === p.page ? 'page' : undefined} onClick={() => onPage(p.page)}>{p[locale]}</button>)}</nav> : null; })}</>;
}
type Membership = ManagedMembership & {
    user: {
        id: string;
        displayName: string;
        status: string;
    };
    identities: {
        id: string;
        provider: string;
        status: string;
        loginHint?: string;
    }[];
    roles: {
        id: string;
        name: string;
    }[];
};
type Role = TenantAccessRole & {
    membershipCount: number;
};
type Dashboard = DashboardAccessState & {
    id: string;
    title: {
        en: string;
        ar: string;
    };
    ownerUserId: string;
};
type PlatformUser = ProductUser & {
    identities: Membership['identities'];
    platformAssignment: {
        roleIds: readonly string[];
        status: string;
    } | null;
};
type Item = CustomerAccount | ManagedTenant | ProductUser | PlatformUser | Membership | Role | Dashboard;
interface Data {
    analyticsReady?: boolean;
    items?: Item[];
    nextCursor?: string;
    tenant?: ManagedTenant;
    customer?: {
        id: string;
        name: string;
    };
    grantablePermissions?: string[];
    grantableMetricDomains?: string[];
}
const asText = (f: FormData, name: string) => String(f.get(name) ?? '');
const many = (f: FormData, name: string) => f.getAll(name).map(String);
const pathFor = (page: AdminPage, tenantId: string) => page === 'platform-customers' ? '/api/platform/customers' : page === 'platform-users' ? '/api/platform/users' : page === 'platform-tenants' ? '' : `/api/tenants/${encodeURIComponent(tenantId)}/admin/${page === 'users' ? 'memberships' : page === 'data-access' ? 'membership-scopes' : page === 'dashboard-access' ? 'dashboard-access' : page}`;
export function Administration({ page, session, permissions, platformPermissions }: {
    page: AdminPage;
    session: ApiSession;
    permissions: readonly string[];
    platformPermissions: readonly string[];
}) {
    const locale = session.locale, ar = locale === 'ar', label = (en: string, arabic: string) => ar ? arabic : en;
    const platform = page.startsWith('platform-');
    const allowed = platform ? platformPermissions : permissions;
    const config = adminPages.find(p => p.page === page)!;
    const [data, setData] = useState<Data>({}), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [editing, setEditing] = useState<Item | 'new' | null>(null), [roles, setRoles] = useState<Role[]>([]), [members, setMembers] = useState<Membership[]>([]), [customers, setCustomers] = useState<CustomerAccount[]>([]), [customerId, setCustomerId] = useState(''), [candidates, setCandidates] = useState<ProductUser[]>([]), [values, setValues] = useState<Record<string, {
        id: string;
        label: string;
    }[]>>({}), [scopeError, setScopeError] = useState('');
    const revision = useRef(0);
    const tenantBase = `/api/tenants/${encodeURIComponent(session.tenantId)}/admin`;
    const load = async (cursor?: string) => {
        const id = ++revision.current;
        setBusy(true);
        setError('');
        setEditing(null);
        setData({});
        setValues({});
        setScopeError('');
        try {
            let path = pathFor(page, session.tenantId);
            if (page === 'platform-tenants') {
                if (!allowed.includes('platform:customers:view'))
                    throw Error(label('Customer read permission is required to choose an owner.', 'يلزم إذن عرض العملاء لاختيار المالك.'));
                const response = await request<{
                    items: CustomerAccount[];
                }>(session, '/api/platform/customers', 'GET');
                if (id !== revision.current)
                    return;
                setCustomers(response.items);
                const selected = customerId || response.items[0]?.id || '';
                if (!selected) {
                    setData({ items: [] });
                    return;
                }
                setCustomerId(selected);
                path = `/api/platform/customers/${encodeURIComponent(selected)}/tenants`;
            }
            const result = await request<Data>(session, path + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''), 'GET');
            if (id !== revision.current)
                return;
            setData(result);
            if (permissions.includes('roles:view') && !platform) {
                const r = await request<{
                    items: Role[];
                }>(session, `${tenantBase}/roles`, 'GET');
                if (id === revision.current)
                    setRoles(r.items);
            }
            if (permissions.includes('users:view') && !platform) {
                const r = await request<{
                    items: Membership[];
                }>(session, `${tenantBase}/memberships`, 'GET');
                if (id === revision.current)
                    setMembers(r.items);
                if (page === 'users') {
                    const c = await request<{
                        items: ProductUser[];
                    }>(session, `${tenantBase}/candidates`, 'GET');
                    if (id === revision.current)
                        setCandidates(c.items);
                }
            }
            if (page === 'data-access') {
                try {
                    const entries = await Promise.all(scopeDimensions.map(async (d) => { const r = await request<{
                        values: {
                            id: string;
                            label: string;
                        }[];
                    }>(session, `${tenantBase}/scope-values/${d}`, 'GET'); return [d, r.values] as const; }));
                    if (id === revision.current)
                        setValues(Object.fromEntries(entries));
                }
                catch (e) {
                    if (id === revision.current)
                        setScopeError(e instanceof Error ? e.message : String(e));
                }
            }
        }
        catch (e) {
            if (id === revision.current) {
                setData({});
                setError(e instanceof Error ? e.message : String(e));
            }
        }
        finally {
            if (id === revision.current)
                setBusy(false);
        }
    };
    useEffect(() => { setRoles([]); setMembers([]); setCandidates([]); setCustomers([]); setCustomerId(''); setNotice(''); void load(); return () => { revision.current++; }; }, [page, session.userId, session.tenantId, locale]);
    const mutate = async (path: string, method: string, body: unknown) => { setBusy(true); setError(''); try {
        await request(session, path, method, body);
        setNotice(label('Saved.', 'تم الحفظ.'));
        await load();
    }
    catch (e) {
        if (e instanceof ApiClientError && (e.status === 403 || e.status === 404)) {
            setData({});
            setEditing(null);
        }
        setError(e instanceof Error ? e.message : String(e));
    }
    finally {
        setBusy(false);
    } };
    const managePermission = page === 'roles' ? 'roles:manage' : page === 'users' ? 'users:manage' : page === 'data-access' ? 'data_scopes:manage' : page === 'dashboard-access' ? 'dashboard_access:manage' : page === 'tenant' ? 'tenant:manage' : `platform:${page === 'platform-customers' ? 'customers' : page === 'platform-tenants' ? 'tenants' : 'users'}:manage`;
    const canManage = allowed.includes(managePermission);
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing)
            return;
        const f = new FormData(event.currentTarget), r = editing === 'new' ? null : editing, id = r && 'id' in r ? r.id : '';
        const expectedVersion = r?.version;
        if (page === 'roles')
            return void mutate(`${tenantBase}/roles${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PUT' : 'POST', { name: asText(f, 'name'), description: asText(f, 'description'), permissions: many(f, 'permission'), metricDomains: many(f, 'domain'), ...(id ? { expectedVersion } : {}) });
        if (page === 'users')
            return void mutate(id ? `${tenantBase}/memberships/${encodeURIComponent(id)}/roles` : `${tenantBase}/memberships`, id ? 'PUT' : 'POST', id ? { expectedVersion, roleIds: many(f, 'role') } : { userId: asText(f, 'userId'), roleIds: many(f, 'role'), dataScopes: [] });
        if (page === 'data-access')
            return void mutate(`${tenantBase}/memberships/${encodeURIComponent(id)}/scopes`, 'PUT', { expectedVersion, dataScopes: scopeDimensions.flatMap(d => { const selected = many(f, d); return selected.length ? [{ dimension: d, values: selected }] : []; }) });
        if (page === 'dashboard-access') {
            const scope = asText(f, 'scope');
            const grants = scope === 'restricted' ? [...many(f, 'role').map(subjectId => ({ subjectType: 'role', subjectId, access: 'view' })), ...many(f, 'membership').map(subjectId => ({ subjectType: 'membership', subjectId, access: 'view' }))] : [];
            return void mutate(`${tenantBase}/dashboards/${encodeURIComponent(id)}/access`, 'PUT', { expectedVersion, scope, grants });
        }
        if (page === 'tenant')
            return void mutate(`${tenantBase}/tenant`, 'PUT', { expectedVersion, name: asText(f, 'name'), defaultLocale: asText(f, 'defaultLocale') });
        if (page === 'platform-customers')
            return void mutate(`/api/platform/customers${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PUT' : 'POST', { name: asText(f, 'name'), ...(id ? { expectedVersion, status: asText(f, 'status') } : {}) });
        if (page === 'platform-tenants') {
            const iq = asText(f, 'market') === 'IQ';
            const configuration = { countryCode: iq ? 'IQ' : 'EG', arabicDialect: iq ? 'iq' : 'eg', reportingCurrency: iq ? 'IQD' : 'EGP', timeZone: iq ? 'Asia/Baghdad' : 'Africa/Cairo', defaultLocale: asText(f, 'defaultLocale') };
            return void mutate(id ? `/api/platform/tenants/${encodeURIComponent(id)}` : `/api/platform/customers/${encodeURIComponent(customerId)}/tenants`, id ? 'PUT' : 'POST', { name: asText(f, 'name'), configuration, ...(id ? { expectedVersion, status: asText(f, 'status') } : {}) });
        }
        if (page === 'platform-users')
            return void mutate(`/api/platform/users/${encodeURIComponent(id)}`, 'PUT', { expectedVersion, displayName: asText(f, 'displayName'), preferredLocale: asText(f, 'defaultLocale'), status: asText(f, 'status') });
    };
    const roleChecks = (selected: readonly string[]) => roles.map(role => <label key={role.id}><input type="checkbox" name="role" value={role.id} defaultChecked={selected.includes(role.id)}/>{role.name}</label>);
    const r = editing === 'new' || !editing ? null : editing;
    const role = r && 'metricDomains' in r ? r as Role : null;
    const membership = r && 'dataScopes' in r ? r as Membership : null;
    const dash = r && 'grants' in r ? r as Dashboard : null;
    const tenant = r && 'configuration' in r ? r as ManagedTenant : null;
    const u = r && 'displayName' in r ? r as ProductUser : null;
    if (!allowed.includes(config.permission))
        return <section role="alert">{label('Access unavailable.', 'الوصول غير متاح.')}</section>;
    return <section className="administration" dir={ar ? 'rtl' : 'ltr'} aria-label={config[locale]}><h2>{config[locale]}</h2>
  {page === 'data-access' && <p>{label('Roles define what users can do. Data Access defines which business data they can see.', 'الأدوار تحدد ما يمكن للمستخدم فعله. الوصول للبيانات يحدد بيانات الأعمال التي يراها.')}</p>}
  {platform && <p>{label('Platform authority manages metadata. Analytics requires a separate tenant membership.', 'صلاحيات المنصة لإدارة البيانات الوصفية. التحليلات تتطلب عضوية مستقلة بمساحة العمل.')}</p>}
  {error && <p role="alert">{error} <button type="button" onClick={() => void load()}>{label('Reload and review', 'إعادة التحميل والمراجعة')}</button></p>}{notice && <p role="status">{notice}</p>}{scopeError && <p role="alert">{scopeError}</p>}{busy && <p role="status">{label('Loading…', 'جارٍ التحميل…')}</p>}
  {page === 'platform-tenants' && <label>{label('Customer', 'العميل')}<select value={customerId} onChange={e => { setCustomerId(e.target.value); setData({}); setEditing(null); void request<Data>(session, `/api/platform/customers/${encodeURIComponent(e.target.value)}/tenants`, 'GET').then(setData).catch(e => setError(String(e))); }}>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
  {canManage && !busy && (['roles', 'platform-customers', 'platform-tenants'].includes(page) || page === 'users' && permissions.includes('roles:manage') && candidates.length > 0) && <button type="button" onClick={() => setEditing('new')}>{label('Create', 'إنشاء')}</button>}
  {page === 'users' && !candidates.length && <p>{label('New members require an operationally provisioned tenant candidate. Invitation email is not configured.', 'إضافة الأعضاء تتطلب مرشحاً مجهزاً تشغيلياً لمساحة العمل. بريد الدعوات غير مهيأ.')}</p>}
  {data.tenant && <p>{label('Analytics readiness', 'جاهزية التحليلات')}: {data.analyticsReady ? label('Ready', 'جاهزة') : label('DATA_NOT_READY', 'البيانات غير جاهزة')}</p>}
  {data.tenant && <dl>{Object.entries({ name: data.tenant.name, customer: data.customer?.name, status: data.tenant.status, ...data.tenant.configuration }).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
  {data.tenant && canManage && <button type="button" onClick={() => setEditing(data.tenant!)}>{label('Edit', 'تعديل')}</button>}
  {!!data.items?.length && <div className="admin-table-scroll"><table><thead><tr><th>{label('Name', 'الاسم')}</th><th>{label('Status / Access', 'الحالة / الوصول')}</th><th>{label('Version', 'الإصدار')}</th><th>{label('Actions', 'الإجراءات')}</th></tr></thead><tbody>{data.items.map(item => {
                const m = 'dataScopes' in item ? item as Membership : null, role = 'metricDomains' in item ? item as Role : null, d = 'grants' in item ? item as Dashboard : null;
                const id = 'id' in item ? item.id : '';
                const name = m ? m.user.displayName : role ? role.name : d ? d.title[locale] : 'displayName' in item ? item.displayName : 'name' in item ? item.name : id;
                return <tr key={id}><th scope="row">{name}{role && <p>{role.description}</p>}</th><td>{m ? <><p>{label('Global user', 'المستخدم العام')}: {m.user.status}</p><p>{label('Authentication', 'المصادقة')}: {m.identities.map(i => `${i.provider}: ${i.status}${i.loginHint ? ` (${i.loginHint})` : ''}`).join(', ') || label('Unavailable', 'غير متاح')}</p><p>{label('Membership', 'العضوية')}: {m.status}</p><p>{m.roles.map(r => r.name).join(', ')}</p><p>{m.dataScopes.map(s => `${s.dimension}: ${s.values.join(', ')}`).join('; ') || label('Unscoped', 'بلا قيود بيانات')}</p></> : role ? <><p>{role.protected ? label('System · protected', 'نظام · محمي') : label('Custom', 'مخصص')} · {role.membershipCount} {label('memberships', 'عضويات')}</p><p>{role.permissions.join(', ')}</p><p>{role.metricDomains.join(', ')}</p></> : d ? <><p>{d.scope}</p><p>{d.grants.map(g => `${g.subjectType}: ${g.subjectId}`).join(', ')}</p></> : 'status' in item ? item.status : ''}</td><td>{item.version}{'analyticsReady' in item && <p>{item.analyticsReady ? 'Ready' : 'DATA_NOT_READY'}</p>}{'tenantCount' in item && <p>{String(item.tenantCount)} {label('tenants', 'مساحات')}</p>}{'identities' in item && !m && <><p>{item.identities.map(i => `${i.provider}: ${i.status}`).join(', ')}</p>{'platformAssignment' in item && <p>{item.platformAssignment?.roleIds.join(', ')} · {item.platformAssignment?.status}</p>}</>}</td><td>{canManage && !role?.protected && <button type="button" disabled={busy || page === 'data-access' && !!scopeError || page === 'users' && !permissions.includes('roles:manage') || page === 'dashboard-access' && (!permissions.includes('roles:view') || !permissions.includes('users:view') || !permissions.includes('dashboard:share'))} onClick={() => setEditing(item)}>{label('Edit', 'تعديل')}</button>}{canManage && m && page === 'users' && <button type="button" disabled={busy} onClick={() => void mutate(`${tenantBase}/memberships/${encodeURIComponent(m.id)}/suspend`, 'POST', { expectedVersion: m.version, status: m.status === 'active' ? 'suspended' : 'active' })}>{m.status === 'active' ? label('Suspend membership', 'تعليق العضوية') : label('Reactivate membership', 'إعادة تفعيل العضوية')}</button>}{canManage && page === 'platform-users' && 'identities' in item && item.identities.filter(i => i.status === 'active').map(i => <button key={i.id} type="button" disabled={busy} onClick={() => void mutate(`/api/platform/identities/${encodeURIComponent(i.id)}/disable`, 'POST', {})}>{label('Disable identity', 'تعطيل الهوية')}: {i.provider}</button>)}{canManage && role && !role.protected && <button type="button" disabled={busy || role.membershipCount > 0} onClick={() => void mutate(`${tenantBase}/roles/${encodeURIComponent(role.id)}`, 'DELETE', { expectedVersion: role.version })}>{label('Delete unassigned role', 'حذف دور غير معين')}</button>}</td></tr>;
            })}</tbody></table></div>}
  {!busy && data.items?.length === 0 && <p>{label('No records available.', 'لا توجد سجلات متاحة.')}</p>}{data.nextCursor && <button type="button" disabled={busy} onClick={() => void load(data.nextCursor)}>{label('Next page', 'الصفحة التالية')}</button>}
  {editing && <form className="admin-form" onSubmit={save} key={r && 'id' in r ? r.id : 'new'}><h3>{label('Review changes, then Save', 'راجع التغييرات ثم احفظ')}</h3><fieldset disabled={busy}>
   {['roles', 'tenant', 'platform-customers', 'platform-tenants'].includes(page) && <label>{label('Name', 'الاسم')}<input name="name" required maxLength={200} defaultValue={r && 'name' in r ? r.name : ''}/></label>}
   {page === 'roles' && <><label>{label('Description', 'الوصف')}<textarea name="description" maxLength={1000} defaultValue={role?.description ?? ''}/></label><fieldset><legend>{label('Permissions', 'الصلاحيات')}</legend>{tenantPermissions.filter(p => (data.grantablePermissions ?? permissions).includes(p)).map(p => <label key={p}><input type="checkbox" name="permission" value={p} defaultChecked={role?.permissions.includes(p)}/>{p}</label>)}</fieldset><fieldset><legend>{label('Analytics domains', 'مجالات التحليلات')}</legend>{accessMetricDomains.filter(d => (data.grantableMetricDomains ?? accessMetricDomains).includes(d)).map(d => <label key={d}><input type="checkbox" name="domain" value={d} defaultChecked={role?.metricDomains.includes(d)}/>{d}</label>)}</fieldset></>}
   {page === 'users' && <>{!r && <label>{label('Provisioned candidate', 'مرشح مجهز')}<select name="userId" required>{candidates.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select></label>}<fieldset><legend>{label('Roles', 'الأدوار')}</legend>{roleChecks(membership?.roleIds ?? [])}</fieldset></>}
   {page === 'data-access' && scopeDimensions.map(d => <fieldset key={d}><legend>{d}</legend>{[...(values[d] ?? []), ...(membership?.dataScopes.find(s => s.dimension === d)?.values ?? []).filter(id => !values[d]?.some(v => v.id === id)).map(id => ({ id, label: `${id} (${label('stale — requires review', 'قديم — يتطلب مراجعة')})` }))].map(v => <label key={v.id}><input type="checkbox" name={d} value={v.id} defaultChecked={membership?.dataScopes.find(s => s.dimension === d)?.values.includes(v.id)}/>{v.label}</label>)}</fieldset>)}
   {page === 'dashboard-access' && <><label>{label('Visibility', 'الظهور')}<select name="scope" defaultValue={dash?.scope ?? 'private'}>{['private', 'tenant', 'restricted'].map(s => <option key={s}>{s}</option>)}</select></label><fieldset><legend>{label('Role view grants (preferred)', 'منح العرض للأدوار (مفضل)')}</legend>{roleChecks(dash?.grants.filter(g => g.subjectType === 'role').map(g => g.subjectId) ?? [])}</fieldset><details><summary>{label('Membership exceptions', 'استثناءات العضويات')}</summary>{members.map(m => <label key={m.id}><input type="checkbox" name="membership" value={m.id} defaultChecked={dash?.grants.some(g => g.subjectType === 'membership' && g.subjectId === m.id)}/>{m.user.displayName} · {m.status}</label>)}{dash?.grants.filter(g => g.subjectType === 'membership' && !members.some(m => m.id === g.subjectId)).map(g => <label key={g.subjectId}><input type="checkbox" name="membership" value={g.subjectId} defaultChecked/>{g.subjectId} · {label('Existing exception', 'استثناء موجود')}</label>)}</details></>}
   {['tenant', 'platform-tenants', 'platform-users'].includes(page) && <label>{label('Default locale', 'اللغة الافتراضية')}<select name="defaultLocale" defaultValue={tenant?.configuration.defaultLocale ?? u?.preferredLocale ?? 'en'}><option value="en">English</option><option value="ar">العربية</option></select></label>}
   {page === 'platform-tenants' && <label>{label('Approved market / currency / timezone', 'السوق / العملة / المنطقة الزمنية المعتمدة')}<select name="market" defaultValue={tenant?.configuration.countryCode ?? 'IQ'} disabled={!!tenant && tenant.status !== 'provisioning'}><option value="IQ">IQ · IQD · Asia/Baghdad</option><option value="EG">EG · EGP · Africa/Cairo</option></select>{tenant && tenant.status !== 'provisioning' && <input type="hidden" name="market" value={tenant.configuration.countryCode}/>}</label>}
   {page === 'platform-users' && <label>{label('Display name', 'الاسم المعروض')}<input name="displayName" required maxLength={200} defaultValue={u?.displayName}/></label>}
   {platform && r && 'status' in r && <label>{label('Status', 'الحالة')}<select name="status" defaultValue={r.status}>{(page === 'platform-customers' ? ['active', 'suspended'] : page === 'platform-tenants' ? ['provisioning', 'active', 'suspended'] : ['invited', 'active', 'suspended']).map(s => <option key={s}>{s}</option>)}</select></label>}
   <button type="submit" disabled={page === 'data-access' && !!scopeError}>{label('Save', 'حفظ')}</button><button type="button" onClick={() => setEditing(null)}>{label('Cancel', 'إلغاء')}</button>
  </fieldset></form>}
 </section>;
}
