-- Reject unexpected current-mart groups as well as missing/changed approved groups.
CREATE OR REPLACE FUNCTION mart.derived_inputs_exact(tenant text,dataset text,metric text,requested_grouping text,
 period_from date,period_to date,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 WITH recipe AS (
  SELECT CASE metric WHEN 'average_confirmed_order_value' THEN 'order_revenue' WHEN 'average_invoice_value' THEN 'invoiced_revenue' END numerator,
   CASE metric WHEN 'average_confirmed_order_value' THEN 'order_count' WHEN 'average_invoice_value' THEN 'invoice_count' END denominator
 ), selected AS (
  SELECT evidence.* FROM mart.mapping_releases mapping JOIN mart.reconciliation_evidence evidence USING(tenant_id,dataset_id),recipe
  WHERE mapping.tenant_id=tenant AND mapping.dataset_id=dataset AND mapping.approval_status='approved'
   AND evidence.case_id=ANY(mapping.approval_case_ids)
   AND evidence.specification->>'measureId' IN (recipe.numerator,recipe.denominator)
   AND evidence.specification->>'grouping' IS NOT DISTINCT FROM requested_grouping
   AND (evidence.specification->>'from')::date=period_from AND (evidence.specification->>'to')::date=period_to
 ), actual AS (
  SELECT fact.measure_id,CASE WHEN requested_grouping IS NULL THEN NULL WHEN requested_grouping='month' THEN to_char(fact.business_date,'YYYY-MM') ELSE to_jsonb(fact)->>requested_grouping END group_key,
   sum(fact.value) value,count(*) population FROM mart.canonical_facts fact,recipe
  WHERE fact.tenant_id=tenant AND fact.dataset_id=dataset AND fact.measure_id IN(recipe.numerator,recipe.denominator)
   AND fact.business_date BETWEEN period_from AND period_to GROUP BY 1,2
 )
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'')
 AND (SELECT numerator IS NOT NULL AND denominator IS NOT NULL FROM recipe)
 AND cardinality(cases)>=2 AND cardinality(cases)=(SELECT count(DISTINCT id) FROM unnest(cases) id)
 AND EXISTS(SELECT 1 FROM mart.mapping_releases mapping, jsonb_array_elements(mapping.specification->'capabilities') capability
  WHERE mapping.tenant_id=tenant AND mapping.dataset_id=dataset AND capability->>'metric'=metric
  AND (requested_grouping IS NULL OR capability->'dimensions' ? requested_grouping))
 AND (SELECT count(*) FROM selected)=cardinality(cases)
 AND NOT EXISTS(SELECT 1 FROM selected WHERE NOT case_id=ANY(cases))
 AND NOT EXISTS(SELECT 1 FROM selected WHERE status<>'passed' OR NOT group_completeness
  OR (specification->>'expectedValue')::numeric<>(specification->>'actualValue')::numeric
  OR specification->>'expectedCount'<>specification->>'actualCount'
  OR specification->'tolerance'->>'status'<>'approved'
  OR (specification->'tolerance'->>'absoluteValue')::numeric<>0
  OR (specification->'tolerance'->>'absoluteCount')::numeric<>0)
 AND NOT EXISTS(SELECT 1 FROM selected GROUP BY specification->>'groupKey'
  HAVING count(*)<>2 OR count(DISTINCT specification->>'measureId')<>2)
 AND NOT EXISTS(SELECT 1 FROM selected control LEFT JOIN actual ON actual.measure_id=control.specification->>'measureId'
  AND actual.group_key IS NOT DISTINCT FROM control.specification->>'groupKey'
  WHERE coalesce(actual.value,0)<>(control.specification->>'actualValue')::numeric
   OR coalesce(actual.population,0)<>(control.specification->>'actualCount')::bigint)
 AND NOT EXISTS(SELECT 1 FROM actual LEFT JOIN selected control
  ON actual.measure_id=control.specification->>'measureId'
  AND actual.group_key IS NOT DISTINCT FROM control.specification->>'groupKey'
  WHERE control.case_id IS NULL)
$$;
