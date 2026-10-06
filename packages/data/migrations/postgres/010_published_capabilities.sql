-- Only safe aggregate proof coverage, never source recipes, case payloads or group keys.
CREATE FUNCTION mart.published_reconciliation_coverage(requested_tenant text,requested_dataset text)
RETURNS TABLE(measure_id text,"grouping" text,period_from text,period_to text,exact boolean,case_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT evidence.specification->>'measureId',evidence.specification->>'grouping',
  evidence.specification->>'from',evidence.specification->>'to',
  bool_and(evidence.status='passed' AND evidence.group_completeness
   AND (evidence.specification->>'expectedValue')::numeric=(evidence.specification->>'actualValue')::numeric
   AND (evidence.specification->>'expectedCount')::numeric=(evidence.specification->>'actualCount')::numeric
   AND evidence.specification->'tolerance'->>'status'='approved'
   AND (evidence.specification->'tolerance'->>'absoluteValue')::numeric=0
   AND (evidence.specification->'tolerance'->>'absoluteCount')::numeric=0),count(*)
 FROM mart.mapping_releases mapping JOIN mart.serving_bindings binding USING(tenant_id,dataset_id)
 JOIN mart.reconciliation_evidence evidence ON evidence.tenant_id=mapping.tenant_id AND evidence.dataset_id=mapping.dataset_id
  AND evidence.case_id=ANY(mapping.approval_case_ids)
 WHERE requested_tenant=nullif(current_setting('mart.tenant_id',true),'')
  AND mapping.tenant_id=requested_tenant AND mapping.dataset_id=requested_dataset
  AND mapping.approval_status='approved'
  AND mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
  AND mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids)
 GROUP BY 1,2,3,4
$$;
REVOKE ALL ON FUNCTION mart.published_reconciliation_coverage(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.published_reconciliation_coverage(text,text) TO dabboos_runtime;
