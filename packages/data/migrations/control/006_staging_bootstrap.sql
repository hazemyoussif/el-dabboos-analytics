SET LOCAL search_path=control,pg_catalog;
CREATE TABLE deployment_bootstraps (
 bootstrap_id text PRIMARY KEY,manifest_json text NOT NULL,completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER deployment_bootstrap_immutable BEFORE UPDATE OR DELETE ON deployment_bootstraps FOR EACH ROW EXECUTE FUNCTION reject_mutation();
GRANT SELECT,INSERT ON deployment_bootstraps TO control_app;
