CREATE TABLE control.tenant_source_settings (
 tenant_id TEXT PRIMARY KEY REFERENCES control.tenants(id),
 settings_json TEXT NOT NULL CHECK(jsonb_typeof(settings_json::jsonb) = 'object'),
 version INTEGER NOT NULL CHECK(version > 0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
GRANT SELECT,INSERT,UPDATE ON control.tenant_source_settings TO control_app;

ALTER TABLE control.admin_audit_events DROP CONSTRAINT audit_action;
ALTER TABLE control.admin_audit_events ADD CONSTRAINT audit_action CHECK(action IN ('source.settings_drafted','ai.settings_changed','customer.created','customer.updated','tenant.created','tenant.updated','tenant.suspended','user.updated','user.suspended','identity.disabled','membership.created','membership.candidate_provisioned','membership.updated','membership.suspended','membership.roles_changed','membership.scope_changed','role.created','role.updated','role.deleted','dashboard.access_changed','invitation.created','invitation.revoked','invitation.accepted','platform.access_changed'));
