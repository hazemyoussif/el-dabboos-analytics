CREATE TABLE customers (
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200), name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 status TEXT NOT NULL CHECK(status IN ('active','suspended')), version INTEGER NOT NULL CHECK(version>=1),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE tenants (
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200), customer_id TEXT NOT NULL REFERENCES customers(id),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 200), status TEXT NOT NULL CHECK(status IN ('provisioning','active','suspended')),
 country_code TEXT NOT NULL, default_locale TEXT NOT NULL CHECK(default_locale IN ('en','ar')), arabic_dialect TEXT NOT NULL,
 reporting_currency TEXT NOT NULL, time_zone TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK((country_code='IQ' AND arabic_dialect='iq' AND reporting_currency='IQD' AND time_zone='Asia/Baghdad') OR
 (country_code='EG' AND arabic_dialect='eg' AND reporting_currency='EGP' AND time_zone='Africa/Cairo'))
);
CREATE INDEX tenants_customer ON tenants(customer_id,id);
CREATE TRIGGER tenants_immutable BEFORE UPDATE OF id,customer_id ON tenants BEGIN SELECT RAISE(ABORT,'immutable tenant ownership'); END;
CREATE TABLE users (
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200), display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 200),
 preferred_locale TEXT NOT NULL CHECK(preferred_locale IN ('en','ar')), status TEXT NOT NULL CHECK(status IN ('invited','active','suspended')),
 version INTEGER NOT NULL CHECK(version>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE identities (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL, provider_subject TEXT NOT NULL,
 login_hint TEXT, status TEXT NOT NULL CHECK(status IN ('active','disabled')), UNIQUE(provider,provider_subject)
);
CREATE INDEX identities_user ON identities(user_id);
CREATE TRIGGER identities_immutable BEFORE UPDATE OF id,user_id,provider,provider_subject ON identities BEGIN SELECT RAISE(ABORT,'immutable identity'); END;
CREATE TABLE roles (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('platform','tenant')),
 tenant_id TEXT REFERENCES tenants(id), protected INTEGER NOT NULL CHECK(protected IN (0,1)), system_key TEXT,
 version INTEGER NOT NULL CHECK(version>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK((scope='platform' AND protected=1 AND tenant_id IS NULL AND system_key IN ('platform_admin','support_admin')) OR
 (scope='tenant' AND ((protected=0 AND tenant_id IS NOT NULL AND system_key IS NULL) OR
 (protected=1 AND tenant_id IS NULL AND system_key IN ('tenant_admin','manager','agent_manager','analyst','viewer','sales_analyst'))))), UNIQUE(scope,system_key)
);
CREATE TABLE role_permissions (role_id TEXT NOT NULL REFERENCES roles(id),permission TEXT NOT NULL,PRIMARY KEY(role_id,permission));
CREATE TABLE role_metric_domains (role_id TEXT NOT NULL REFERENCES roles(id),domain TEXT NOT NULL CHECK(domain IN ('sales','crm','finance','inventory','purchasing','customers','maintenance')),PRIMARY KEY(role_id,domain));
CREATE TRIGGER domain_plane BEFORE INSERT ON role_metric_domains WHEN (SELECT scope FROM roles WHERE id=NEW.role_id)!='tenant' BEGIN SELECT RAISE(ABORT,'invalid domain plane'); END;
CREATE TABLE memberships (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL CHECK(status IN ('active','suspended')), version INTEGER NOT NULL CHECK(version>=1),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tenant_id,user_id),UNIQUE(tenant_id,id)
);
CREATE TRIGGER memberships_immutable BEFORE UPDATE OF id,tenant_id,user_id ON memberships BEGIN SELECT RAISE(ABORT,'immutable membership'); END;
CREATE TABLE membership_roles (
 membership_id TEXT NOT NULL,role_id TEXT NOT NULL REFERENCES roles(id),tenant_id TEXT NOT NULL,
 PRIMARY KEY(membership_id,role_id),FOREIGN KEY(tenant_id,membership_id) REFERENCES memberships(tenant_id,id)
);
CREATE INDEX membership_roles_role ON membership_roles(role_id,membership_id);
CREATE TRIGGER membership_role_plane BEFORE INSERT ON membership_roles WHEN NOT EXISTS
 (SELECT 1 FROM roles WHERE id=NEW.role_id AND scope='tenant' AND (protected=1 OR tenant_id=NEW.tenant_id)) BEGIN SELECT RAISE(ABORT,'invalid membership role'); END;
CREATE TABLE membership_scopes (
 membership_id TEXT NOT NULL,tenant_id TEXT NOT NULL,dimension TEXT NOT NULL CHECK(dimension IN ('region','branch','salesperson')),
 value TEXT NOT NULL CHECK(length(value) BETWEEN 1 AND 200),PRIMARY KEY(membership_id,dimension,value),
 FOREIGN KEY(tenant_id,membership_id) REFERENCES memberships(tenant_id,id)
);
CREATE TABLE platform_assignments (
 user_id TEXT PRIMARY KEY REFERENCES users(id),status TEXT NOT NULL CHECK(status IN ('active','suspended')),
 version INTEGER NOT NULL CHECK(version>=1),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE platform_assignment_roles (user_id TEXT NOT NULL REFERENCES platform_assignments(user_id),role_id TEXT NOT NULL REFERENCES roles(id),PRIMARY KEY(user_id,role_id));
CREATE TRIGGER platform_role_plane BEFORE INSERT ON platform_assignment_roles WHEN NOT EXISTS
 (SELECT 1 FROM roles WHERE id=NEW.role_id AND scope='platform') BEGIN SELECT RAISE(ABORT,'invalid platform role'); END;
CREATE TABLE admin_audit_events (
 event_id TEXT PRIMARY KEY,actor_user_id TEXT NOT NULL REFERENCES users(id),tenant_id TEXT REFERENCES tenants(id),customer_id TEXT REFERENCES customers(id),
 target_id TEXT NOT NULL CHECK(length(target_id) BETWEEN 1 AND 200),action TEXT NOT NULL,result TEXT NOT NULL CHECK(result IN ('allowed','denied','error')),occurred_at TEXT NOT NULL
);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON admin_audit_events BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON admin_audit_events BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
CREATE TABLE bootstrap_state (id TEXT PRIMARY KEY CHECK(id='completed'),reference TEXT NOT NULL,completed_at TEXT NOT NULL);

CREATE TRIGGER permission_plane BEFORE INSERT ON role_permissions WHEN NOT EXISTS
 (SELECT 1 FROM roles WHERE id=NEW.role_id AND ((scope='tenant' AND NEW.permission IN ('dashboard:view','dashboard:create','dashboard:edit','dashboard:share','analytics:query','ai:generate','ai:edit','tenant:view','tenant:manage','users:view','users:manage','users:invite','roles:view','roles:manage','data_scopes:view','data_scopes:manage','dashboard_access:view','dashboard_access:manage')) OR
 (scope='platform' AND NEW.permission IN ('platform:customers:view','platform:customers:manage','platform:tenants:view','platform:tenants:manage','platform:users:view','platform:users:manage')))) BEGIN SELECT RAISE(ABORT,'invalid permission plane'); END;
CREATE TRIGGER audit_action BEFORE INSERT ON admin_audit_events WHEN NEW.action NOT IN ('customer.created','customer.updated','tenant.created','tenant.updated','tenant.suspended','user.updated','user.suspended','identity.disabled','membership.created','membership.candidate_provisioned','membership.updated','membership.suspended','membership.roles_changed','membership.scope_changed','role.created','role.updated','role.deleted','dashboard.access_changed','invitation.created','invitation.revoked','invitation.accepted','platform.access_changed') BEGIN SELECT RAISE(ABORT,'invalid audit action'); END;
