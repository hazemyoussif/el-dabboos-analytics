-- Separate immutable evidence under the existing Finance definition/approval lineage.
CREATE TABLE mart.finance_snapshot_evidence (
 tenant_id text NOT NULL,snapshot_id text NOT NULL,snapshot_date date NOT NULL,
 anchor_dataset text NOT NULL,definition_version text NOT NULL,reporting_currency text NOT NULL,
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,customer_count integer NOT NULL CHECK(customer_count>0),
 totals jsonb NOT NULL,PRIMARY KEY(tenant_id,snapshot_id),
 FOREIGN KEY(tenant_id,anchor_dataset) REFERENCES mart.mapping_releases
);
CREATE TABLE mart.finance_snapshot_customers (
 tenant_id text NOT NULL,snapshot_id text NOT NULL,customer_id text NOT NULL,label text,
 actual_values jsonb NOT NULL,expected_values jsonb NOT NULL CHECK(actual_values=expected_values),
 PRIMARY KEY(tenant_id,snapshot_id,customer_id),
 FOREIGN KEY(tenant_id,snapshot_id) REFERENCES mart.finance_snapshot_evidence
);
CREATE TABLE mart.finance_snapshot_publications (
 tenant_id text NOT NULL,snapshot_date date NOT NULL,snapshot_id text NOT NULL,
 PRIMARY KEY(tenant_id,snapshot_date),UNIQUE(tenant_id,snapshot_id),
 FOREIGN KEY(tenant_id,snapshot_id) REFERENCES mart.finance_snapshot_evidence
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['finance_snapshot_evidence','finance_snapshot_customers','finance_snapshot_publications'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime,dabboos_ingestor',relation_name);
 END LOOP;
END $$;
CREATE POLICY published_only ON mart.finance_snapshot_customers AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.finance_snapshot_publications publication WHERE publication.tenant_id=finance_snapshot_customers.tenant_id AND publication.snapshot_id=finance_snapshot_customers.snapshot_id));
CREATE POLICY published_only ON mart.finance_snapshot_evidence AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.finance_snapshot_publications publication WHERE publication.tenant_id=finance_snapshot_evidence.tenant_id AND publication.snapshot_id=finance_snapshot_evidence.snapshot_id));
CREATE FUNCTION mart.guard_finance_snapshot_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE evidence mart.finance_snapshot_evidence; measure text; total numeric; BEGIN
 SELECT * INTO STRICT evidence FROM mart.finance_snapshot_evidence WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id;
 IF evidence.snapshot_date<>NEW.snapshot_date OR NOT EXISTS(
  SELECT 1 FROM mart.analytics_anchor_capabilities anchor JOIN mart.analytics_baselines baseline USING(tenant_id)
  WHERE anchor.tenant_id=NEW.tenant_id AND anchor.dataset_id=evidence.anchor_dataset
  AND baseline.definition_version=evidence.definition_version AND baseline.reporting_currency=evidence.reporting_currency
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(anchor.capabilities->'releases') release,jsonb_array_elements(release->'capabilities') capability
   WHERE capability->>'metric'='net_aged_receivable' AND capability->'dimensions' ? 'customer')) THEN
  RAISE EXCEPTION 'Unchanged certified customer Finance lineage required';
 END IF;
 IF (SELECT count(*) FROM mart.finance_snapshot_customers WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id)<>evidence.customer_count THEN
  RAISE EXCEPTION 'Complete exact customer snapshot required';
 END IF;
 FOREACH measure IN ARRAY ARRAY['net_aged_receivable','aged_at_date','aged_1_30','aged_31_60','aged_61_90','aged_91_120','aged_over_120','total_overdue_receivable','gross_open_receivable_components','credit_balances'] LOOP
  SELECT sum((actual_values->>measure)::numeric) INTO total FROM mart.finance_snapshot_customers WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id;
  IF total IS NULL OR total IS DISTINCT FROM (evidence.totals->>measure)::numeric THEN RAISE EXCEPTION 'Exact Finance summary required'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_publication_guard BEFORE INSERT ON mart.finance_snapshot_publications FOR EACH ROW EXECUTE FUNCTION mart.guard_finance_snapshot_publication();
REVOKE ALL ON FUNCTION mart.guard_finance_snapshot_publication() FROM PUBLIC;
