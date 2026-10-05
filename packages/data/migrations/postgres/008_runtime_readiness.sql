-- Read-only schema version verification; source availability is not dashboard readiness.
GRANT USAGE ON SCHEMA mart_admin TO dabboos_runtime;
GRANT SELECT ON mart_admin.mart_schema_migrations TO dabboos_runtime;
