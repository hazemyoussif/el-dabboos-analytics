import type { DatabaseSync } from 'node:sqlite';
import { tenantProfiles, tenantPermissions, platformPermissions, accessMetricDomains } from '@el-dabboos/domain';
/** Explicit synthetic operational bootstrap. Never called by a repository constructor or production mode. */
export function seedDemoAdministration(db: DatabaseSync): void {
    const timestamp = '2026-10-04T00:00:00.000Z';
    db.prepare('INSERT INTO customers(id,name,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('demo-customer', 'Synthetic demo customer', 'active', 1, timestamp, timestamp);
    for (const profile of Object.values(tenantProfiles))
        db.prepare(`INSERT INTO tenants(id,customer_id,name,status,country_code,default_locale,arabic_dialect,reporting_currency,time_zone,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(profile.id, 'demo-customer', profile.id, 'active', profile.countryCode, profile.defaultLocale, profile.arabicDialect, profile.reportingCurrency, profile.timeZone, 1, timestamp, timestamp);
    seedProtectedAccessRoles(db, timestamp);
    db.prepare('INSERT INTO roles(id,name,description,scope,tenant_id,protected,system_key,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('demo-sales-viewer', 'Sales Viewer', 'Synthetic tenant custom role', 'tenant', 'demo-iq', 0, null, 1, timestamp, timestamp);
    for (const permission of ['dashboard:view', 'analytics:query'])
        db.prepare('INSERT INTO role_permissions(role_id,permission) VALUES (?,?)').run('demo-sales-viewer', permission);
    for (const domain of ['sales', 'crm'])
        db.prepare('INSERT INTO role_metric_domains(role_id,domain) VALUES (?,?)').run('demo-sales-viewer', domain);
    const users = [['demo-iq-admin', 'Iraq Admin'], ['demo-iq-analyst', 'Iraq Analyst'], ['demo-iq-baghdad-manager', 'Baghdad Manager'], ['demo-eg-analyst', 'Egypt Analyst'], ['demo-regional-analyst', 'Regional Analyst'], ['demo-iq-sales-analyst', 'Iraq Sales Analyst'], ['demo-platform-admin', 'Platform Admin'], ['demo-agent-manager', 'Baghdad Agent Manager'], ['demo-agent', 'Individual Baghdad Agent'], ['demo-custom-user', 'Custom-role tenant user'], ['demo-eg-admin', 'Egypt Admin']] as const;
    for (const [id, name] of users) {
        db.prepare('INSERT INTO users(id,display_name,preferred_locale,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, name, 'en', 'active', 1, timestamp, timestamp);
        db.prepare('INSERT INTO identities(id,user_id,provider,provider_subject,status) VALUES (?,?,?,?,?)').run(`synthetic:${id}`, id, 'synthetic', id, 'active');
    }
    const memberships = [['iq-admin', 'demo-iq-admin', 'demo-iq', 'admin'], ['iq-analyst', 'demo-iq-analyst', 'demo-iq', 'analyst'], ['iq-baghdad', 'demo-iq-baghdad-manager', 'demo-iq', 'manager'], ['eg-analyst', 'demo-eg-analyst', 'demo-eg', 'analyst'], ['regional-iq', 'demo-regional-analyst', 'demo-iq', 'analyst'], ['regional-eg', 'demo-regional-analyst', 'demo-eg', 'analyst'], ['iq-sales', 'demo-iq-sales-analyst', 'demo-iq', 'sales-analyst'], ['iq-agent-manager', 'demo-agent-manager', 'demo-iq', 'agent-manager'], ['iq-agent', 'demo-agent', 'demo-iq', 'demo-sales-viewer'], ['iq-custom', 'demo-custom-user', 'demo-iq', 'demo-sales-viewer'], ['eg-admin', 'demo-eg-admin', 'demo-eg', 'admin']] as const;
    for (const [id, user, tenant, role] of memberships) {
        db.prepare('INSERT INTO memberships(id,tenant_id,user_id,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, tenant, user, 'active', 1, timestamp, timestamp);
        db.prepare('INSERT INTO membership_roles(membership_id,role_id,tenant_id) VALUES (?,?,?)').run(id, role, tenant);
        if (['iq-baghdad', 'iq-agent-manager', 'iq-agent'].includes(id))
            db.prepare('INSERT INTO membership_scopes(membership_id,tenant_id,dimension,value) VALUES (?,?,?,?)').run(id, tenant, 'branch', 'baghdad');
    }
    db.prepare('INSERT INTO membership_scopes(membership_id,tenant_id,dimension,value) VALUES (?,?,?,?)').run('iq-agent', 'demo-iq', 'salesperson', 'salesperson_1');
    db.prepare('INSERT INTO platform_assignments(user_id,status,version,created_at,updated_at) VALUES (?,?,?,?,?)').run('demo-platform-admin', 'active', 1, timestamp, timestamp);
    db.prepare('INSERT INTO platform_assignment_roles(user_id,role_id) VALUES (?,?)').run('demo-platform-admin', 'platform-admin');
    db.prepare('INSERT INTO bootstrap_state(id,reference,completed_at) VALUES (?,?,?)').run('completed', 'explicit-synthetic-demo', timestamp);
}
/** Protected templates are an explicit deployment/bootstrap capability, never tenant CRUD. */
export function seedProtectedAccessRoles(db: DatabaseSync, timestamp: string): void {
    for (const [id, name, scope, key, permissions, domains] of protectedAccessRoles()) {
        db.prepare('INSERT INTO roles(id,name,description,scope,tenant_id,protected,system_key,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, name, 'Synthetic protected template', scope, null, 1, key, 1, timestamp, timestamp);
        for (const permission of permissions)
            db.prepare('INSERT INTO role_permissions(role_id,permission) VALUES (?,?)').run(id, permission);
        for (const domain of domains)
            db.prepare('INSERT INTO role_metric_domains(role_id,domain) VALUES (?,?)').run(id, domain);
    }
}

export function protectedAccessRoles() {
    const analyst = ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'analytics:query', 'ai:generate', 'ai:edit'];
    return  [
        ['admin', 'Tenant Admin', 'tenant', 'tenant_admin', tenantPermissions, accessMetricDomains],
        ['analyst', 'Analyst', 'tenant', 'analyst', analyst, accessMetricDomains],
        ['manager', 'Manager', 'tenant', 'manager', ['dashboard:view', 'dashboard:create', 'dashboard:edit', 'analytics:query'], accessMetricDomains],
        ['sales-analyst', 'Sales Analyst', 'tenant', 'sales_analyst', analyst, ['sales', 'crm']],
        ['agent-manager', 'Agent Manager', 'tenant', 'agent_manager', ['dashboard:view', 'analytics:query'], ['sales', 'crm']],
        ['viewer', 'Viewer', 'tenant', 'viewer', ['dashboard:view', 'analytics:query'], []],
        ['platform-admin', 'Platform Admin', 'platform', 'platform_admin', platformPermissions, []],
        ['support-admin', 'Support Admin', 'platform', 'support_admin', platformPermissions.filter(permission => permission.endsWith(':view')), []],
    ] as const;
}
