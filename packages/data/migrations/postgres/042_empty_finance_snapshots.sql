-- A complete empty customer population is valid only with ten exact zero totals.
-- Keep the nonempty comparison unchanged, including rejection of null/missing operands.
ALTER TABLE mart.finance_snapshot_evidence DROP CONSTRAINT finance_snapshot_evidence_customer_count_check;
ALTER TABLE mart.finance_snapshot_evidence ADD CONSTRAINT finance_snapshot_evidence_customer_count_check CHECK(customer_count>=0);

CREATE OR REPLACE FUNCTION mart.finance_snapshot_exact(selected_tenant text,selected_snapshot text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM mart.finance_snapshot_evidence evidence JOIN mart.analytics_baselines baseline USING(tenant_id)
 WHERE evidence.tenant_id=selected_tenant AND evidence.snapshot_id=selected_snapshot
 AND evidence.definition_version=baseline.definition_version AND evidence.reporting_currency=baseline.reporting_currency
 AND length(btrim(evidence.source_revision))>0
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(baseline.specification) mapping,jsonb_array_elements(mapping->'measures') rule WHERE rule->>'measureId'='net_aged_receivable')
 AND evidence.customer_count=(SELECT count(*) FROM mart.finance_snapshot_customers WHERE tenant_id=selected_tenant AND snapshot_id=selected_snapshot)
 AND mart.finance_values_valid(evidence.totals)
 AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(evidence.totals) total WHERE total.value::numeric IS DISTINCT FROM
  CASE WHEN evidence.customer_count=0 THEN 0::numeric ELSE
   (SELECT sum((actual_values->>total.key)::numeric) FROM mart.finance_snapshot_customers WHERE tenant_id=selected_tenant AND snapshot_id=selected_snapshot) END))
$$;
