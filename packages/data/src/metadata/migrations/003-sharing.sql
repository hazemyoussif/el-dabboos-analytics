CREATE TABLE dashboard_records_new (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_user_id TEXT NOT NULL REFERENCES users(id),
 scope TEXT NOT NULL CHECK(scope IN ('private','tenant','restricted')),spec_json TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1),created_by TEXT NOT NULL REFERENCES users(id),updated_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(tenant_id,id)
);
INSERT INTO dashboard_records_new (id,tenant_id,owner_user_id,scope,spec_json,version,created_by,updated_by,created_at,updated_at)
 SELECT id,tenant_id,owner_user_id,scope,spec_json,version,created_by,updated_by,created_at,updated_at FROM dashboard_records;
DROP TABLE dashboard_records;
ALTER TABLE dashboard_records_new RENAME TO dashboard_records;
CREATE INDEX dashboard_records_tenant_access ON dashboard_records(tenant_id,scope,owner_user_id,updated_at);
CREATE TABLE dashboard_grants (
 tenant_id TEXT NOT NULL,dashboard_id TEXT NOT NULL,subject_type TEXT NOT NULL CHECK(subject_type IN ('role','membership')),
 subject_id TEXT NOT NULL,access TEXT NOT NULL CHECK(access='view'),role_id TEXT REFERENCES roles(id),membership_id TEXT,
 PRIMARY KEY(tenant_id,dashboard_id,subject_type,subject_id),
 FOREIGN KEY(tenant_id,dashboard_id) REFERENCES dashboard_records(tenant_id,id),
 FOREIGN KEY(tenant_id,membership_id) REFERENCES memberships(tenant_id,id),
 CHECK((subject_type='role' AND role_id=subject_id AND role_id IS NOT NULL AND membership_id IS NULL) OR
 (subject_type='membership' AND membership_id=subject_id AND membership_id IS NOT NULL AND role_id IS NULL))
);
CREATE INDEX dashboard_grants_subject ON dashboard_grants(tenant_id,subject_type,subject_id,dashboard_id);
CREATE TRIGGER dashboard_grant_role BEFORE INSERT ON dashboard_grants WHEN NEW.subject_type='role' AND NOT EXISTS
 (SELECT 1 FROM roles WHERE id=NEW.role_id AND scope='tenant' AND (protected=1 OR tenant_id=NEW.tenant_id)) BEGIN SELECT RAISE(ABORT,'invalid grant role'); END;
CREATE TRIGGER dashboard_grant_visibility BEFORE INSERT ON dashboard_grants WHEN NOT EXISTS
 (SELECT 1 FROM dashboard_records WHERE tenant_id=NEW.tenant_id AND id=NEW.dashboard_id AND scope='restricted') BEGIN SELECT RAISE(ABORT,'invalid grant visibility'); END;
