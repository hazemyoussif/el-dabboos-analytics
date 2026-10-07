-- Preserve independently certified September-only outputs alongside operational history.
CREATE TABLE mart.analytics_anchor_capabilities (
 tenant_id text PRIMARY KEY,dataset_id text NOT NULL,capabilities jsonb NOT NULL,
 FOREIGN KEY(tenant_id,dataset_id) REFERENCES mart.mapping_releases
);
ALTER TABLE mart.analytics_anchor_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_anchor_capabilities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_anchor_capabilities USING(tenant_id=nullif(current_setting('mart.tenant_id',true),'')) WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT ON mart.analytics_anchor_capabilities TO dabboos_ingestor,dabboos_runtime;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.analytics_anchor_capabilities FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE FUNCTION mart.guard_anchor_capabilities() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.serving_bindings JOIN mart.certified_serving_scope(NEW.tenant_id) USING(tenant_id,dataset_id) WHERE tenant_id=NEW.tenant_id AND dataset_id=NEW.dataset_id)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.capabilities->'releases') release WHERE release->>'datasetId'<>NEW.dataset_id) THEN
  RAISE EXCEPTION 'Exact certified anchor scope required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER anchor_capabilities_guard BEFORE INSERT ON mart.analytics_anchor_capabilities FOR EACH ROW EXECUTE FUNCTION mart.guard_anchor_capabilities();
REVOKE ALL ON FUNCTION mart.guard_anchor_capabilities() FROM PUBLIC;
-- Interactive immutable-anchor reads fail closed if a positive proof receipt is absent.
-- They cannot invoke full reconstruction; explicit offline operations retain the old path.
CREATE OR REPLACE FUNCTION mart.reconciliation_certified(tenant text,dataset text,version text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT CASE WHEN tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN false
 WHEN EXISTS(SELECT 1 FROM mart.technical_proof_results proof WHERE proof.tenant_id=tenant AND proof.dataset_id=dataset AND proof.mapping_version=version AND proof.case_ids=cases) THEN true
 WHEN current_setting('mart.stored_proofs_only',true)='on' THEN false
 ELSE mart.reconciliation_certified_uncached(tenant,dataset,version,cases) END
$$;
CREATE OR REPLACE FUNCTION mart.derived_inputs_exact(tenant text,dataset text,metric text,requested_grouping text,period_from date,period_to date,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT CASE WHEN tenant IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN false
 WHEN EXISTS(SELECT 1 FROM mart.derived_proof_results proof WHERE proof.tenant_id=tenant AND proof.dataset_id=dataset AND proof.metric=$3 AND proof.grouping IS NOT DISTINCT FROM requested_grouping AND proof.period_from=$5 AND proof.period_to=$6 AND proof.case_ids=cases) THEN true
 WHEN current_setting('mart.stored_proofs_only',true)='on' THEN false
 ELSE mart.derived_inputs_exact_uncached(tenant,dataset,metric,requested_grouping,period_from,period_to,cases) END
$$;
