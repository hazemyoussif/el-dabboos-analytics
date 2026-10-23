-- Scheduling evidence only; metric freshness remains in accepted recipe clocks.
CREATE TABLE mart.command_delta_checks (
 tenant_id text NOT NULL,month date NOT NULL,kind text NOT NULL DEFAULT 'delta' CHECK(kind IN('delta','allocations')),checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,month,kind,checked_at),CHECK(date_trunc('month',month)::date=month)
);
ALTER TABLE mart.command_delta_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.command_delta_checks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.command_delta_checks
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.command_delta_checks TO dabboos_ingestor;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.command_delta_checks
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
