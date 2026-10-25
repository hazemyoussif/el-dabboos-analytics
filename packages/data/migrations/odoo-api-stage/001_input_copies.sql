-- Separate Analytics-owned input DB. Never execute against Odoo, control or mart.
CREATE SCHEMA api_catalog;
CREATE TABLE api_catalog.version(version integer PRIMARY KEY CHECK(version=1));
INSERT INTO api_catalog.version VALUES(1);
CREATE TABLE api_catalog.captures (
 schema_name text PRIMARY KEY CHECK(schema_name~'^api_[a-f0-9]{32}$'),
 tenant_id text NOT NULL,source_id text NOT NULL,source_as_of timestamptz NOT NULL,
 manifest jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT USAGE ON SCHEMA api_catalog TO odoo_api_stage_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA api_catalog TO odoo_api_stage_reader;
