-- Output approval supplements the existing immutable release; no mapping/fact/evidence rewrite.
CREATE TABLE mart.derived_metric_certifications (
 tenant_id text NOT NULL,dataset_id text NOT NULL,reference text NOT NULL,
 metric text NOT NULL,grouping text,period_from date NOT NULL,period_to date NOT NULL,
 case_ids text[] NOT NULL,specification jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by text NOT NULL DEFAULT current_user,
 PRIMARY KEY(tenant_id,dataset_id,reference),
 FOREIGN KEY(tenant_id,dataset_id) REFERENCES mart.mapping_releases,
 CHECK(period_from<=period_to),
 CHECK(metric IN ('average_confirmed_order_value','average_invoice_value')),
 CHECK(grouping IS NULL OR grouping IN ('customer','salesperson','business_line','month')),
 CHECK(specification->>'tenantId'=tenant_id AND specification->>'datasetId'=dataset_id
  AND specification->>'reference'=reference AND specification->>'metric'=metric
  AND specification->>'grouping' IS NOT DISTINCT FROM grouping
  AND specification->>'from'=period_from::text AND specification->>'to'=period_to::text
  AND specification->'caseIds'=to_jsonb(case_ids))
);
ALTER TABLE mart.derived_metric_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.derived_metric_certifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.derived_metric_certifications
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE TRIGGER derived_certification_immutable BEFORE UPDATE OR DELETE ON mart.derived_metric_certifications
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();

-- Closed canonical recipes, not physical source formulas. Every operand group must remain exact.
CREATE FUNCTION mart.derived_inputs_exact(tenant text,dataset text,metric text,requested_grouping text,
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

$$;
REVOKE ALL ON FUNCTION mart.derived_inputs_exact(text,text,text,text,date,date,text[]) FROM PUBLIC;
CREATE FUNCTION mart.guard_derived_certification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF coalesce(length(btrim(NEW.specification->>'approvalReference')),0)=0
 OR coalesce(length(btrim(NEW.specification->>'businessSemantics')),0)=0
 OR coalesce(length(btrim(NEW.specification->>'technicalReference')),0)=0
 OR NEW.specification->>'approvedAt' IS NULL
 OR NOT EXISTS(SELECT 1 FROM mart.mapping_releases mapping WHERE mapping.tenant_id=NEW.tenant_id
  AND mapping.dataset_id=NEW.dataset_id AND mapping.mapping_version=NEW.specification->>'mappingVersion'
  AND mapping.approval_status='approved' AND mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids))
 OR NOT coalesce(mart.derived_inputs_exact(NEW.tenant_id,NEW.dataset_id,NEW.metric,NEW.grouping,NEW.period_from,NEW.period_to,NEW.case_ids),false)
 THEN RAISE EXCEPTION 'Derived output requires authorized approval and complete exact compatible base groups'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION mart.guard_derived_certification() FROM PUBLIC;
CREATE TRIGGER derived_certification_guard BEFORE INSERT ON mart.derived_metric_certifications
 FOR EACH ROW EXECUTE FUNCTION mart.guard_derived_certification();
CREATE FUNCTION mart.published_derived_coverage(requested_tenant text,requested_dataset text)
 RETURNS TABLE(metric text,"grouping" text,period_from text,period_to text,reference text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT certificate.metric,certificate.grouping,certificate.period_from::text,certificate.period_to::text,certificate.reference
 FROM mart.derived_metric_certifications certificate JOIN mart.serving_bindings binding USING(tenant_id,dataset_id)
 WHERE requested_tenant=nullif(current_setting('mart.tenant_id',true),'')
 AND certificate.tenant_id=requested_tenant AND certificate.dataset_id=requested_dataset
 AND mart.derived_inputs_exact(certificate.tenant_id,certificate.dataset_id,certificate.metric,certificate.grouping,certificate.period_from,certificate.period_to,certificate.case_ids)
$$;
REVOKE ALL ON mart.derived_metric_certifications FROM PUBLIC,dabboos_ingestor,dabboos_runtime;
GRANT SELECT,INSERT ON mart.derived_metric_certifications TO dabboos_migrator;
REVOKE ALL ON FUNCTION mart.published_derived_coverage(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.published_derived_coverage(text,text) TO dabboos_runtime;
