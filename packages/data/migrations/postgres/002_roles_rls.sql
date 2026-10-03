-- Dedicated groups are provisioned by the database administrator before migrations.
GRANT USAGE ON SCHEMA mart TO dabboos_ingestor, dabboos_runtime;
GRANT SELECT ON mart.measure_definitions TO dabboos_ingestor, dabboos_runtime;
GRANT SELECT ON mart.mapping_releases, mart.serving_bindings TO dabboos_ingestor, dabboos_runtime;
GRANT SELECT, INSERT ON mart.fact_revisions, mart.batch_facts, mart.snapshot_owners,
  mart.data_quality_rejects, mart.reconciliation_evidence, mart.reconciliation_batches TO dabboos_ingestor;
GRANT SELECT, INSERT, UPDATE ON mart.fact_heads, mart.ingestion_batches TO dabboos_ingestor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA mart TO dabboos_ingestor;
-- Invoker view requires SELECT on its dependencies; RLS constrains them as well.
GRANT SELECT ON mart.fact_heads, mart.fact_revisions, mart.ingestion_batches, mart.canonical_facts TO dabboos_runtime;
ALTER VIEW mart.canonical_facts SET (security_invoker = true, security_barrier = true);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mapping_releases','ingestion_batches','fact_revisions','fact_heads',
    'snapshot_owners','batch_facts','data_quality_rejects','reconciliation_evidence','reconciliation_batches','serving_bindings']
  LOOP
    EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING (tenant_id = nullif(current_setting(''mart.tenant_id'', true), '''')) WITH CHECK (tenant_id = nullif(current_setting(''mart.tenant_id'', true), ''''))', t);
  END LOOP;
END $$;
