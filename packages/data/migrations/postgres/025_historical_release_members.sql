-- Historical serving is explicit and separate from the existing anchor binding.
-- Immutable monthly members retain independent business and technical certificates.
CREATE TABLE mart.historical_release_members (
 tenant_id text NOT NULL,reference text NOT NULL CHECK(length(btrim(reference))>0),dataset_id text NOT NULL,
 period_from date NOT NULL,period_to date NOT NULL,kind text NOT NULL CHECK(kind IN ('events','aging')),
 PRIMARY KEY(tenant_id,reference,period_from,kind),
 FOREIGN KEY(tenant_id,dataset_id) REFERENCES mart.mapping_releases,
 CHECK(period_from=date_trunc('month',period_from)::date AND period_to=(period_from+interval '1 month - 1 day')::date)
);
CREATE TABLE mart.historical_serving_bindings (
 tenant_id text PRIMARY KEY,reference text NOT NULL,anchor_dataset_id text NOT NULL,
 period_from date NOT NULL,period_to date NOT NULL,approval_reference text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by text NOT NULL DEFAULT current_user,
 FOREIGN KEY(tenant_id,anchor_dataset_id) REFERENCES mart.mapping_releases,
 CHECK(period_from=date_trunc('month',period_from)::date AND period_to=(date_trunc('month',period_to)+interval '1 month - 1 day')::date AND period_to>=period_from AND period_to<period_from+interval '24 months')
);
DO $$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['historical_release_members','historical_serving_bindings'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
  EXECUTE format('REVOKE ALL ON mart.%I FROM PUBLIC,dabboos_ingestor,dabboos_runtime',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.guard_historical_member() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mapping record; certificate jsonb;
BEGIN
 SELECT * INTO mapping FROM mart.mapping_releases WHERE tenant_id=NEW.tenant_id AND dataset_id=NEW.dataset_id;
 SELECT specification INTO certificate FROM mart.release_certifications WHERE tenant_id=NEW.tenant_id AND dataset_id=NEW.dataset_id AND reference=mapping.approval_reference;
 IF mapping.approval_status IS DISTINCT FROM 'approved' OR certificate IS NULL
 OR certificate->>'from' IS DISTINCT FROM NEW.period_from::text OR certificate->>'to' IS DISTINCT FROM NEW.period_to::text
 OR certificate->'companyIds' IS DISTINCT FROM '["1"]'::jsonb
 OR NOT mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
 OR NOT mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids) THEN
 RAISE EXCEPTION 'Historical membership requires exact independent monthly certification';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.reconciliation_evidence evidence WHERE evidence.tenant_id=NEW.tenant_id AND evidence.dataset_id=NEW.dataset_id AND evidence.case_id=ANY(mapping.approval_case_ids)
 AND (evidence.status<>'passed' OR NOT evidence.group_completeness
 OR evidence.specification->>'expectedValue' IS DISTINCT FROM evidence.specification->>'actualValue'
 OR evidence.specification->>'expectedCount' IS DISTINCT FROM evidence.specification->>'actualCount'
 OR (evidence.specification->'tolerance'->>'absoluteValue')::numeric<>0
 OR (evidence.specification->'tolerance'->>'absoluteCount')::numeric<>0))
 OR EXISTS(SELECT 1 FROM mart.historical_release_members member JOIN mart.mapping_releases peer USING(tenant_id,dataset_id)
 WHERE member.tenant_id=NEW.tenant_id AND member.reference=NEW.reference AND (peer.source_id,peer.reporting_currency) IS DISTINCT FROM (mapping.source_id,mapping.reporting_currency)) THEN
  RAISE EXCEPTION 'Historical membership requires exact zero-tolerance controls and one source currency scope';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(mapping.specification->'measures'))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(mapping.specification->'measures') rule LEFT JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId'
 WHERE definition.kind IS DISTINCT FROM CASE NEW.kind WHEN 'events' THEN 'event' ELSE 'snapshot' END)
 OR EXISTS(SELECT 1 FROM mart.historical_release_members member JOIN mart.mapping_releases peer USING(tenant_id,dataset_id)
 WHERE member.tenant_id=NEW.tenant_id AND member.reference=NEW.reference AND member.kind=NEW.kind
 AND (peer.source_id,peer.mapping_id,peer.mapping_version,peer.reporting_currency,peer.specification->'measures',peer.specification->'capabilities') IS DISTINCT FROM
 (mapping.source_id,mapping.mapping_id,mapping.mapping_version,mapping.reporting_currency,mapping.specification->'measures',mapping.specification->'capabilities')) THEN
  RAISE EXCEPTION 'Historical members require identical versioned semantics and separate event/snapshot inputs';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.historical_serving_bindings WHERE tenant_id=NEW.tenant_id AND reference=NEW.reference) THEN
  RAISE EXCEPTION 'Active historical coverage is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER historical_member_guard BEFORE INSERT ON mart.historical_release_members FOR EACH ROW EXECUTE FUNCTION mart.guard_historical_member();
CREATE FUNCTION mart.guard_historical_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF length(btrim(NEW.approval_reference))=0 OR NOT EXISTS(SELECT 1 FROM mart.serving_bindings WHERE tenant_id=NEW.tenant_id AND dataset_id=NEW.anchor_dataset_id)
 OR (SELECT count(*) FROM mart.historical_release_members WHERE tenant_id=NEW.tenant_id AND reference=NEW.reference)<>(SELECT count(*)*2 FROM generate_series(NEW.period_from,NEW.period_to,interval '1 month'))
 OR EXISTS(SELECT 1 FROM generate_series(NEW.period_from,NEW.period_to,interval '1 month') month_start CROSS JOIN (VALUES('events'),('aging')) kinds(kind)
 LEFT JOIN mart.historical_release_members member ON member.tenant_id=NEW.tenant_id AND member.reference=NEW.reference AND member.period_from=month_start::date AND member.kind=kinds.kind WHERE member.dataset_id IS NULL) THEN
  RAISE EXCEPTION 'Historical serving requires complete event and snapshot months and the preserved anchor';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.historical_release_members member JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id)
 WHERE member.tenant_id=NEW.tenant_id AND member.reference=NEW.reference AND (
 NOT mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
 OR NOT mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids))) THEN
  RAISE EXCEPTION 'Historical binding requires all monthly proofs still valid';
 END IF;
 IF NEW.period_from<='2026-09-01' AND NEW.period_to>='2026-09-30' AND EXISTS(SELECT 1 FROM (VALUES('net_invoiced_revenue','1447166500.000000'),('invoiced_revenue','1465712000.000000'),('refund_value','18545500.000000'),('order_revenue','1461335500.000000'),('order_count','2895.000000')) anchor(metric,value)
 WHERE NOT EXISTS(SELECT 1 FROM mart.historical_release_members member JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id)
 JOIN mart.reconciliation_evidence evidence ON evidence.tenant_id=member.tenant_id AND evidence.dataset_id=member.dataset_id AND evidence.case_id=ANY(mapping.approval_case_ids)
 WHERE member.tenant_id=NEW.tenant_id AND member.reference=NEW.reference AND member.kind='events' AND member.period_from='2026-09-01'
 AND evidence.specification->>'grouping' IS NULL AND evidence.specification->>'measureId'=anchor.metric AND evidence.specification->>'expectedValue'=anchor.value AND evidence.specification->>'actualValue'=anchor.value)) THEN
  RAISE EXCEPTION 'Historical September anchor regression';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER historical_binding_guard BEFORE INSERT ON mart.historical_serving_bindings FOR EACH ROW EXECUTE FUNCTION mart.guard_historical_binding();
CREATE OR REPLACE FUNCTION mart.certified_serving_scope(requested_tenant text)
 RETURNS TABLE(tenant_id text,dataset_id text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 WITH bound AS (
  SELECT tenant_id,dataset_id FROM mart.serving_bindings
  UNION SELECT member.tenant_id,member.dataset_id FROM mart.historical_release_members member JOIN mart.historical_serving_bindings binding USING(tenant_id,reference)
 )
 SELECT mapping.tenant_id,mapping.dataset_id FROM mart.mapping_releases mapping JOIN bound USING(tenant_id,dataset_id)
 WHERE requested_tenant=nullif(current_setting('mart.tenant_id',true),'') AND mapping.tenant_id=requested_tenant AND mapping.approval_status='approved'
 AND mart.reconciliation_certified(mapping.tenant_id,mapping.dataset_id,mapping.mapping_version,mapping.approval_case_ids)
 AND mart.business_certified(mapping.tenant_id,mapping.dataset_id,mapping.approval_reference,mapping.approval_case_ids)
$$;
REVOKE ALL ON FUNCTION mart.guard_historical_member(),mart.guard_historical_binding() FROM PUBLIC;

-- Proof projection follows the same explicit serving scope as canonical fact RLS.
CREATE OR REPLACE FUNCTION mart.published_reconciliation_coverage(requested_tenant text,requested_dataset text)
RETURNS TABLE(measure_id text,"grouping" text,period_from text,period_to text,exact boolean,case_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT evidence.specification->>'measureId',evidence.specification->>'grouping',evidence.specification->>'from',evidence.specification->>'to',
 bool_and(evidence.status='passed' AND evidence.group_completeness
 AND (evidence.specification->>'expectedValue')::numeric=(evidence.specification->>'actualValue')::numeric
 AND (evidence.specification->>'expectedCount')::numeric=(evidence.specification->>'actualCount')::numeric
 AND evidence.specification->'tolerance'->>'status'='approved'
 AND (evidence.specification->'tolerance'->>'absoluteValue')::numeric=0
 AND (evidence.specification->'tolerance'->>'absoluteCount')::numeric=0),count(*)
 FROM mart.mapping_releases mapping JOIN mart.certified_serving_scope(requested_tenant) scope USING(tenant_id,dataset_id)
 JOIN mart.reconciliation_evidence evidence ON evidence.tenant_id=mapping.tenant_id AND evidence.dataset_id=mapping.dataset_id AND evidence.case_id=ANY(mapping.approval_case_ids)
 WHERE mapping.tenant_id=requested_tenant AND mapping.dataset_id=requested_dataset GROUP BY 1,2,3,4
$$;
CREATE OR REPLACE FUNCTION mart.published_derived_coverage(requested_tenant text,requested_dataset text,requested_metric text,requested_grouping text,include_all_groupings boolean)
RETURNS TABLE(metric text,"grouping" text,period_from text,period_to text,reference text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT certificate.metric,certificate.grouping,certificate.period_from::text,certificate.period_to::text,certificate.reference
 FROM mart.derived_metric_certifications certificate JOIN mart.certified_serving_scope(requested_tenant) scope USING(tenant_id,dataset_id)
 WHERE certificate.tenant_id=requested_tenant AND certificate.dataset_id=requested_dataset AND certificate.metric=requested_metric
 AND (include_all_groupings OR certificate.grouping IS NOT DISTINCT FROM requested_grouping)
 AND mart.derived_inputs_exact(certificate.tenant_id,certificate.dataset_id,certificate.metric,certificate.grouping,certificate.period_from,certificate.period_to,certificate.case_ids)
$$;
