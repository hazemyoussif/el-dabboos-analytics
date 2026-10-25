import { SourceSettingsPage } from './SourceSettingsPage.tsx';
import { AiSettingsPage } from './AiSettingsPage.tsx';
import type { Locale } from '@el-dabboos/domain';
import { Building2, Users, Contact, Shield, SlidersHorizontal, LayoutDashboard, Settings } from 'lucide-react';
import { CustomersPage } from './CustomersPage.tsx';
import { DashboardAccessPage } from './DashboardAccessPage.tsx';
import { DataAccessPage } from './DataAccessPage.tsx';
import { MembershipsPage } from './MembershipsPage.tsx';
import type { AdministrationPageProps } from './page-contracts.ts';
import { PlatformUsersPage } from './PlatformUsersPage.tsx';
import { RolesPage } from './RolesPage.tsx';
import { TenantsPage } from './TenantsPage.tsx';
import { WorkspacePage } from './WorkspacePage.tsx';
export type AdminPage = 'platform-customers' | 'platform-tenants' | 'platform-users' | 'users' | 'roles' | 'data-access' | 'dashboard-access' | 'tenant' | 'ai-settings' | 'source-settings';
const administrationIcons = {
    'platform-customers': Contact, 'platform-tenants': Building2, 'platform-users': Users,
    users: Users, roles: Shield, 'data-access': SlidersHorizontal, 'dashboard-access': LayoutDashboard, tenant: Settings, 'ai-settings': Settings, 'source-settings': Settings,
};
export const adminPages: readonly {
    page: AdminPage;
    permission: string;
    en: string;
    ar: string;
}[] = [
    { page: 'platform-customers', permission: 'platform:customers:view', en: 'Customers', ar: 'العملاء' }, { page: 'platform-tenants', permission: 'platform:tenants:view', en: 'Tenants', ar: 'مساحات العمل' }, { page: 'platform-users', permission: 'platform:users:view', en: 'Users / Access', ar: 'المستخدمون / الوصول' },
    { page: 'source-settings', permission: 'tenant:manage', en: 'Source settings', ar: 'إعدادات المصدر' },
    { page: 'ai-settings', permission: 'tenant:manage', en: 'AI settings', ar: 'إعدادات AI' },
    { page: 'users', permission: 'users:view', en: 'Users', ar: 'المستخدمون' }, { page: 'roles', permission: 'roles:view', en: 'Roles', ar: 'الأدوار' }, { page: 'data-access', permission: 'data_scopes:view', en: 'Data Access', ar: 'الوصول للبيانات' }, { page: 'dashboard-access', permission: 'dashboard_access:view', en: 'Dashboard Access', ar: 'الوصول للوحات' }, { page: 'tenant', permission: 'tenant:view', en: 'Tenant', ar: 'مساحة العمل' },
];
export function AdministrationNavigation({ permissions, platformPermissions, page, onPage, locale }: {
    permissions: readonly string[];
    platformPermissions: readonly string[];
    page: AdminPage | null;
    onPage: (page: AdminPage) => void;
    locale: Locale;
}) {
    return <>{[true, false].map(platform => {
            const allowed = adminPages.filter(entry => entry.page.startsWith('platform-') === platform && (platform ? platformPermissions : permissions).includes(entry.permission));
            const title = platform ? (locale === 'ar' ? 'إدارة المنصة' : 'Platform Administration') : (locale === 'ar' ? 'الإدارة' : 'Administration');
            return allowed.length ? <nav className="sidebar-section administration-navigation" key={String(platform)} aria-label={title}><h3 className="section-caption">{title}</h3>{allowed.map(entry => {
                const Icon = administrationIcons[entry.page];
                return <button type="button" key={entry.page} title={entry[locale]} aria-label={entry[locale]} aria-current={page === entry.page ? 'page' : undefined} onClick={() => onPage(entry.page)}><Icon aria-hidden="true"/><span className="nav-label">{entry[locale]}</span></button>;
            })}</nav> : null;
        })}</>;
}
export function Administration(props: AdministrationPageProps & {
    page: AdminPage;
}) {
    switch (props.page) {
        case 'source-settings': return <SourceSettingsPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'ai-settings': return <AiSettingsPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'roles': return <RolesPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'users': return <MembershipsPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'data-access': return <DataAccessPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'dashboard-access': return <DashboardAccessPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'tenant': return <WorkspacePage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'platform-customers': return <CustomersPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'platform-tenants': return <TenantsPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
        case 'platform-users': return <PlatformUsersPage key={props.session.userId + ':' + props.session.tenantId + ':' + props.session.locale} {...props}/>;
    }
}
