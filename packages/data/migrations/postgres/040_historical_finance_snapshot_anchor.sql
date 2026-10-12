-- Finance snapshots may anchor to the activated historical aging release for their exact month.
-- Legacy stored customer-capability anchors remain accepted for already-published environments.
CREATE OR REPLACE FUNCTION mart.guard_finance_snapshot_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE evidence mart.finance_snapshot_evidence; measure text; total numeric; BEGIN
 SELECT * INTO STRICT evidence FROM mart.finance_snapshot_evidence WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id;
 IF evidence.snapshot_date<>NEW.snapshot_date OR NOT EXISTS(
  SELECT 1 FROM mart.analytics_baselines baseline
  WHERE baseline.tenant_id=NEW.tenant_id
    AND baseline.definition_version=evidence.definition_version
    AND baseline.reporting_currency=evidence.reporting_currency
 ) OR NOT (
  EXISTS(
   SELECT 1 FROM mart.analytics_anchor_capabilities anchor
   WHERE anchor.tenant_id=NEW.tenant_id AND anchor.dataset_id=evidence.anchor_dataset
   AND EXISTS(
    SELECT 1 FROM jsonb_array_elements(anchor.capabilities->'releases') release,jsonb_array_elements(release->'capabilities') capability
    WHERE capability->>'metric'='net_aged_receivable' AND capability->'dimensions' ? 'customer'
   )
  )
  OR EXISTS(
   SELECT 1
   FROM mart.historical_serving_bindings binding
   JOIN mart.historical_release_members member USING(tenant_id,reference)
   JOIN mart.mapping_releases mapping
     ON mapping.tenant_id=member.tenant_id AND mapping.dataset_id=member.dataset_id
   WHERE binding.tenant_id=NEW.tenant_id
     AND member.dataset_id=evidence.anchor_dataset
     AND member.kind='aging'
     AND member.period_to=evidence.snapshot_date
     AND mapping.approval_status='approved'
  )
 ) THEN
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
REVOKE ALL ON FUNCTION mart.guard_finance_snapshot_publication() FROM PUBLIC;
