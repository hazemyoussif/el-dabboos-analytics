-- Reuse verified results only while every proof dependency remains unchanged.
-- Cache writes are offline/migrator-owned; runtime retains read-only forced RLS.
CREATE TABLE mart.technical_proof_results (
 tenant_id text NOT NULL,dataset_id text NOT NULL,mapping_version text NOT NULL,
 case_ids text[] NOT NULL,PRIMARY KEY(tenant_id,dataset_id)
);
CREATE TABLE mart.derived_proof_results (
 tenant_id text NOT NULL,dataset_id text NOT NULL,metric text NOT NULL,grouping text,
 period_from date NOT NULL,period_to date NOT NULL,case_ids text[] NOT NULL,
 UNIQUE NULLS NOT DISTINCT(tenant_id,dataset_id,metric,grouping,period_from,period_to)
);
DO $$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['technical_proof_results','derived_proof_results'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format($policy$CREATE POLICY tenant_scope ON mart.%I USING (tenant_id=nullif(current_setting('mart.tenant_id',true),'')) WITH CHECK (tenant_id=nullif(current_setting('mart.tenant_id',true),''))$policy$,relation_name);
  EXECUTE format('REVOKE ALL ON mart.%I FROM PUBLIC,dabboos_runtime,dabboos_ingestor',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.reconciliation_certified_uncached(tenant text,dataset text,version text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 WITH selected AS MATERIALIZED (SELECT value AS case_id FROM unnest(cases) value),
 linked AS MATERIALIZED (
  SELECT links.case_id,links.tenant_id,links.dataset_id,links.batch_id
  FROM mart.reconciliation_batches links JOIN selected USING (case_id)
  WHERE links.tenant_id=tenant
 ),
 batches AS MATERIALIZED (SELECT DISTINCT tenant_id,dataset_id,batch_id FROM linked)
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cardinality(cases)>0
 AND cardinality(cases)=(SELECT count(*) FROM (SELECT case_id FROM selected WHERE case_id IS NOT NULL GROUP BY case_id) unique_cases)
 AND NOT EXISTS (
  SELECT case_id FROM selected EXCEPT
  SELECT evidence.case_id FROM mart.reconciliation_evidence evidence
  WHERE evidence.tenant_id=tenant AND evidence.dataset_id=dataset
   AND evidence.status='passed' AND evidence.group_completeness
   AND (evidence.specification->>'mappingVersion'<>version) IS NOT TRUE
 )
 AND NOT EXISTS (SELECT case_id FROM selected EXCEPT SELECT case_id FROM linked)
 AND NOT EXISTS (
  SELECT 1 FROM batches JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status<>'committed' OR (b.extraction_id IS NULL AND NOT b.pagination_complete)
   OR (b.extraction_id IS NOT NULL AND run.status<>'complete')
 );
$$;
CREATE FUNCTION mart.derived_inputs_exact_uncached(tenant text,dataset text,metric text,requested_grouping text,
 period_from date,period_to date,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 WITH recipe AS (
  SELECT CASE metric WHEN 'average_confirmed_order_value' THEN 'order_revenue' WHEN 'average_invoice_value' THEN 'invoiced_revenue' WHEN 'overdue_receivable_percentage' THEN 'total_overdue_receivable' END numerator,
   CASE metric WHEN 'average_confirmed_order_value' THEN 'order_count' WHEN 'average_invoice_value' THEN 'invoice_count' WHEN 'overdue_receivable_percentage' THEN 'net_aged_receivable' END denominator
 ), approved_cases AS (
  SELECT mapping.tenant_id,mapping.dataset_id,approved.case_id
  FROM mart.mapping_releases mapping CROSS JOIN LATERAL unnest(mapping.approval_case_ids) approved(case_id)
  WHERE mapping.tenant_id=tenant AND mapping.dataset_id=dataset AND mapping.approval_status='approved'
 ), selected AS (
  SELECT evidence.* FROM approved_cases JOIN mart.reconciliation_evidence evidence USING(tenant_id,dataset_id,case_id),recipe
  WHERE evidence.specification->>'measureId' IN (recipe.numerator,recipe.denominator)
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
 AND (metric<>'overdue_receivable_percentage' OR (requested_grouping IS NULL OR requested_grouping='customer') AND NOT EXISTS (SELECT 1 FROM mart.canonical_facts fact WHERE fact.tenant_id=tenant AND fact.dataset_id=dataset AND fact.measure_id IN ('total_overdue_receivable','net_aged_receivable') AND fact.business_date<>period_to))
 AND cardinality(cases)>=2 AND cardinality(cases)=(SELECT count(DISTINCT id) FROM unnest(cases) id)
 AND EXISTS(SELECT 1 FROM mart.mapping_releases mapping, jsonb_array_elements(mapping.specification->'capabilities') capability
  WHERE mapping.tenant_id=tenant AND mapping.dataset_id=dataset AND capability->>'metric'=metric
  AND (requested_grouping IS NULL OR capability->'dimensions' ? requested_grouping))
 AND (SELECT count(*) FROM selected)=cardinality(cases)
 AND NOT EXISTS(SELECT case_id FROM selected EXCEPT SELECT unnest(cases))
 AND NOT EXISTS(SELECT 1 FROM selected WHERE status<>'passed' OR NOT group_completeness
  OR (specification->>'expectedValue')::numeric<>(specification->>'actualValue')::numeric
  OR specification->>'expectedCount'<>specification->>'actualCount'
  OR specification->'tolerance'->>'status'<>'approved'
  OR (specification->'tolerance'->>'absoluteValue')::numeric<>0
  OR (specification->'tolerance'->>'absoluteCount')::numeric<>0)
 AND NOT EXISTS(SELECT 1 FROM selected GROUP BY specification->>'groupKey'
  HAVING count(*)<>2 OR count(DISTINCT specification->>'measureId')<>2)
 AND NOT EXISTS(
  SELECT measure_id,group_key,value,population FROM actual
  EXCEPT SELECT specification->>'measureId',specification->>'groupKey',
   (specification->>'actualValue')::numeric,(specification->>'actualCount')::bigint FROM selected)
 AND NOT EXISTS(
  SELECT specification->>'measureId',specification->>'groupKey',
   (specification->>'actualValue')::numeric,(specification->>'actualCount')::bigint FROM selected
  WHERE (specification->>'actualValue')::numeric<>0 OR (specification->>'actualCount')::bigint<>0
  EXCEPT SELECT measure_id,group_key,value,population FROM actual)
$$;

REVOKE ALL ON FUNCTION mart.reconciliation_certified_uncached(text,text,text,text[]),
 mart.derived_inputs_exact_uncached(text,text,text,text,date,date,text[]) FROM PUBLIC;

CREATE OR REPLACE FUNCTION mart.reconciliation_certified(tenant text,dataset text,version text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT CASE WHEN tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN false
 WHEN EXISTS(SELECT 1 FROM mart.technical_proof_results proof WHERE proof.tenant_id=tenant AND proof.dataset_id=dataset
  AND proof.mapping_version=version AND proof.case_ids=cases) THEN true
 ELSE mart.reconciliation_certified_uncached(tenant,dataset,version,cases) END
$$;
CREATE OR REPLACE FUNCTION mart.derived_inputs_exact(tenant text,dataset text,metric text,requested_grouping text,
 period_from date,period_to date,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT CASE WHEN tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN false
 WHEN EXISTS(SELECT 1 FROM mart.derived_proof_results proof WHERE proof.tenant_id=tenant AND proof.dataset_id=dataset
  AND proof.metric=$3 AND proof.grouping IS NOT DISTINCT FROM requested_grouping
  AND proof.period_from=$5 AND proof.period_to=$6 AND proof.case_ids=cases) THEN true
 ELSE mart.derived_inputs_exact_uncached(tenant,dataset,metric,requested_grouping,period_from,period_to,cases) END
$$;

-- Invalidation shares the input write's transaction and MVCC snapshot. No TTL,
-- process-local cache, runtime writes, or cross-tenant invalidation is involved.
CREATE FUNCTION mart.invalidate_proof_results() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
 DELETE FROM mart.technical_proof_results WHERE tenant_id=coalesce(NEW.tenant_id,OLD.tenant_id) AND dataset_id=coalesce(NEW.dataset_id,OLD.dataset_id);
 DELETE FROM mart.derived_proof_results WHERE tenant_id=coalesce(NEW.tenant_id,OLD.tenant_id) AND dataset_id=coalesce(NEW.dataset_id,OLD.dataset_id);
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION mart.invalidate_proof_results() FROM PUBLIC;
DO $$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['mapping_releases','reconciliation_evidence','reconciliation_batches','ingestion_batches','extraction_runs','fact_revisions','batch_facts','release_certifications','derived_metric_certifications'] LOOP
  EXECUTE format('CREATE TRIGGER invalidate_proof_results AFTER INSERT OR UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.invalidate_proof_results()',relation_name);
 END LOOP;
END $$;

-- An explicit offline refresh proves the current snapshot before storing positives.
-- Failed proofs are never cached; runtime falls back to the authoritative live SQL.
CREATE FUNCTION mart.refresh_proof_results(requested_tenant text,requested_dataset text) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE mapping record; certificate record;
BEGIN
 IF requested_tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN RAISE EXCEPTION 'Proof refresh requires tenant scope'; END IF;
 -- Offline refresh uses a fresh snapshot after locking every mutable dependency.
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Proof refresh requires read committed'; END IF;
 LOCK TABLE mart.mapping_releases,mart.reconciliation_evidence,mart.reconciliation_batches,mart.ingestion_batches,mart.extraction_runs,mart.fact_revisions,mart.batch_facts,mart.release_certifications,mart.derived_metric_certifications IN SHARE MODE;
 SELECT * INTO mapping FROM mart.mapping_releases WHERE tenant_id=requested_tenant AND dataset_id=requested_dataset FOR UPDATE;
 DELETE FROM mart.technical_proof_results WHERE tenant_id=requested_tenant AND dataset_id=requested_dataset;
 DELETE FROM mart.derived_proof_results WHERE tenant_id=requested_tenant AND dataset_id=requested_dataset;
 IF mapping.approval_status='approved' AND mart.reconciliation_certified_uncached(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids) THEN
  INSERT INTO mart.technical_proof_results VALUES(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids);
 END IF;
 FOR certificate IN SELECT * FROM mart.derived_metric_certifications WHERE tenant_id=requested_tenant AND dataset_id=requested_dataset LOOP
  IF mart.derived_inputs_exact_uncached(certificate.tenant_id,certificate.dataset_id,certificate.metric,certificate.grouping,certificate.period_from,certificate.period_to,certificate.case_ids) THEN
   INSERT INTO mart.derived_proof_results VALUES(certificate.tenant_id,certificate.dataset_id,certificate.metric,certificate.grouping,certificate.period_from,certificate.period_to,certificate.case_ids);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION mart.refresh_proof_results(text,text) FROM PUBLIC,dabboos_runtime,dabboos_ingestor;
