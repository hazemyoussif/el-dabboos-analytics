CREATE SCHEMA control;
REVOKE ALL ON SCHEMA control FROM PUBLIC;
SET LOCAL search_path=control,pg_catalog;
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
CREATE TABLE users (
 id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 200), display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 200),
 preferred_locale TEXT NOT NULL CHECK(preferred_locale IN ('en','ar')), status TEXT NOT NULL CHECK(status IN ('invited','active','suspended')),
 version INTEGER NOT NULL CHECK(version>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE identities (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL, provider_subject TEXT NOT NULL,
 login_hint TEXT, status TEXT NOT NULL CHECK(status IN ('active','disabled')), UNIQUE(provider,provider_subject)
);
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
CREATE TABLE memberships (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL CHECK(status IN ('active','suspended')), version INTEGER NOT NULL CHECK(version>=1),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tenant_id,user_id),UNIQUE(tenant_id,id)
);
CREATE TABLE membership_roles (
 membership_id TEXT NOT NULL,role_id TEXT NOT NULL REFERENCES roles(id),tenant_id TEXT NOT NULL,
 PRIMARY KEY(membership_id,role_id),FOREIGN KEY(tenant_id,membership_id) REFERENCES memberships(tenant_id,id)
);
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
CREATE TABLE admin_audit_events (
 event_id TEXT PRIMARY KEY,actor_user_id TEXT NOT NULL REFERENCES users(id),tenant_id TEXT REFERENCES tenants(id),customer_id TEXT REFERENCES customers(id),
 target_id TEXT NOT NULL CHECK(length(target_id) BETWEEN 1 AND 200),action TEXT NOT NULL,result TEXT NOT NULL CHECK(result IN ('allowed','denied','error')),occurred_at TEXT NOT NULL
);
CREATE TABLE bootstrap_state (id TEXT PRIMARY KEY CHECK(id='completed'),reference TEXT NOT NULL,completed_at TEXT NOT NULL);
CREATE TABLE dashboard_records (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_user_id TEXT NOT NULL REFERENCES users(id),
 scope TEXT NOT NULL CHECK(scope IN ('private','tenant','restricted')),spec_json TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1),created_by TEXT NOT NULL REFERENCES users(id),updated_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(tenant_id,id)
);
CREATE TABLE dashboard_grants (
 tenant_id TEXT NOT NULL,dashboard_id TEXT NOT NULL,subject_type TEXT NOT NULL CHECK(subject_type IN ('role','membership')),
 subject_id TEXT NOT NULL,access TEXT NOT NULL CHECK(access='view'),role_id TEXT REFERENCES roles(id),membership_id TEXT,
 PRIMARY KEY(tenant_id,dashboard_id,subject_type,subject_id),
 FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_records(tenant_id,id),
 FOREIGN KEY(tenant_id,membership_id) REFERENCES memberships(tenant_id,id),
 CHECK((subject_type='role' AND role_id=subject_id AND role_id IS NOT NULL AND membership_id IS NULL) OR
 (subject_type='membership' AND membership_id=subject_id AND membership_id IS NOT NULL AND role_id IS NULL))
);
CREATE TABLE tenant_assignment_candidates (
 tenant_id TEXT NOT NULL REFERENCES tenants(id),user_id TEXT NOT NULL REFERENCES users(id),
 PRIMARY KEY(tenant_id,user_id)
);
CREATE TABLE dashboard_folders (
 id TEXT NOT NULL, tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(tenant_id,user_id,id)
);
CREATE TABLE dashboard_library_preferences (
 tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, folder_id TEXT,
 favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0,1)), PRIMARY KEY(tenant_id,user_id,dashboard_id),
 FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_records(tenant_id,id),
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(tenant_id,user_id,folder_id) REFERENCES dashboard_folders(tenant_id,user_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX tenants_customer ON tenants(customer_id,id);
CREATE INDEX identities_user ON identities(user_id);
CREATE INDEX dashboard_records_tenant_access ON dashboard_records(tenant_id,scope,owner_user_id,updated_at);
CREATE INDEX dashboard_grants_subject ON dashboard_grants(tenant_id,subject_type,subject_id,dashboard_id);
CREATE INDEX membership_roles_role ON membership_roles(role_id,membership_id);
CREATE INDEX dashboard_library_folder ON dashboard_library_preferences(tenant_id,user_id,folder_id);
