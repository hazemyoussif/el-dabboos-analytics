import { useRef } from 'react';
import { ExcelExportButton } from '../export/ExcelExportButton.tsx';
import { renderedTableWorkbook } from '../export/row-workbook.ts';
import { administrationLabel } from './copy.ts';
import type { Locale } from '@el-dabboos/domain';
import type { ReactNode } from 'react';
import type { MembershipSummary, RoleSummary } from './page-contracts.ts';
export const pageLabel = (locale: Locale) => (en: string, ar: string) => locale === 'ar' ? ar : en;
export function RoleSelection({ roles, selected }: {
    roles: readonly RoleSummary[];
    selected: readonly string[];
}) { return <>{roles.map(role => <label key={role.id}><input type="checkbox" name="role" value={role.id} defaultChecked={selected.includes(role.id)}/>{role.name}</label>)}</>; }
export function MembershipDetails({ membership, locale }: {
    membership: MembershipSummary;
    locale: Locale;
}) {
    const label = pageLabel(locale);
    return <><p>{label('Global user', 'المستخدم العام')}: {administrationLabel(membership.user.status, locale)}</p><p>{label('Authentication', 'المصادقة')}: {membership.identities.map(identity => `${identity.provider}: ${administrationLabel(identity.status, locale)}${identity.loginHint ? ` (${identity.loginHint})` : ''}`).join(', ') || label('Unavailable', 'غير متاح')}</p><p>{label('Membership', 'العضوية')}: {administrationLabel(membership.status, locale)}</p><p>{membership.roles.map(role => role.name).join(', ')}</p><p>{membership.dataScopes.map(dataScope => `${dataScope.dimension}: ${dataScope.values.join(', ')}`).join('; ') || label('Unscoped', 'بلا قيود بيانات')}</p></>;
}
export function AdministrationTable({ locale, children }: {
    locale: Locale;
    children: ReactNode;
}) { const label = pageLabel(locale); const table = useRef<HTMLTableElement>(null); return <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={label('Administration table','جدول الإدارة')}><ExcelExportButton locale={locale} kind="table" createWorkbook={() => renderedTableWorkbook(table.current!, locale, 3)}/><table ref={table}><thead><tr><th>{label('Name', 'الاسم')}</th><th>{label('Status / Access', 'الحالة / الوصول')}</th><th>{label('Version', 'الإصدار')}</th><th>{label('Actions', 'الإجراءات')}</th></tr></thead><tbody>{children}</tbody></table></div>; }
export function AdministrationFrame({ locale, title, allowed, busy, error, notice, load, nextCursor, empty, children }: {
    locale: Locale;
    title: string;
    allowed: boolean;
    busy: boolean;
    error: string;
    notice: string;
    load: (cursor?: string) => Promise<void>;
    nextCursor?: string;
    empty?: boolean;
    children: ReactNode;
}) {
    const label = pageLabel(locale);
    if (!allowed)
        return <section role="alert">{label('Access unavailable.', 'الوصول غير متاح.')}</section>;
    return <section className="administration" dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={title}><h2>{title}</h2>{error && <p role="alert">{error} <button type="button" onClick={() => void load()}>{label('Reload and review', 'إعادة التحميل والمراجعة')}</button></p>}{notice && <p role="status">{notice}</p>}{busy && <p role="status">{label('Loading…', 'جارٍ التحميل…')}</p>}{children}{!busy && empty && <p>{label('No records available.', 'لا توجد سجلات متاحة.')}</p>}{nextCursor && <button type="button" disabled={busy} onClick={() => void load(nextCursor)}>{label('Next page', 'الصفحة التالية')}</button>}</section>;
}
