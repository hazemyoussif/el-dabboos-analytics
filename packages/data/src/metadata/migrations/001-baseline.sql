CREATE TABLE dashboard_records (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, owner_user_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('private','tenant')), spec_json TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1), created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX dashboard_records_tenant_access ON dashboard_records(tenant_id,scope,owner_user_id,updated_at);
CREATE TABLE dashboard_folders (
 id TEXT NOT NULL, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(tenant_id,user_id,id)
);
CREATE TABLE dashboard_library_preferences (
 tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, folder_id TEXT,
 favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0,1)), PRIMARY KEY(tenant_id,user_id,dashboard_id)
);
CREATE INDEX dashboard_library_folder ON dashboard_library_preferences(tenant_id,user_id,folder_id);
