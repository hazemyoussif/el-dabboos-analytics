SET LOCAL search_path=control,pg_catalog;
CREATE TABLE analyst_conversations (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), user_id TEXT NOT NULL REFERENCES users(id),
 version INTEGER NOT NULL CHECK(version>0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL, document TEXT NOT NULL
);
CREATE INDEX analyst_conversation_owner ON analyst_conversations(tenant_id,user_id,updated_at);
CREATE TABLE analyst_question_audit (
 message_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
 timestamp TEXT NOT NULL, document TEXT NOT NULL
);
CREATE INDEX analyst_audit_retention ON analyst_question_audit(timestamp);

GRANT SELECT,INSERT,UPDATE,DELETE ON analyst_conversations TO control_app;
GRANT SELECT,INSERT,DELETE ON analyst_question_audit TO control_app;
