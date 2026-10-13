CREATE TABLE workspace_ai_settings (
 tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
 settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
 encrypted_api_key TEXT,
 version INTEGER NOT NULL CHECK(version > 0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);

DROP TRIGGER audit_action;
CREATE TRIGGER audit_action BEFORE INSERT ON admin_audit_events WHEN NEW.action NOT IN ('ai.settings_changed','customer.created','customer.updated','tenant.created','tenant.updated','tenant.suspended','user.updated','user.suspended','identity.disabled','membership.created','membership.candidate_provisioned','membership.updated','membership.suspended','membership.roles_changed','membership.scope_changed','role.created','role.updated','role.deleted','dashboard.access_changed','invitation.created','invitation.revoked','invitation.accepted','platform.access_changed') BEGIN SELECT RAISE(ABORT,'invalid audit action'); END;
