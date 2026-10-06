-- Append-only business authority supplements, never replaces, technical reconciliation.
CREATE TABLE mart.release_certifications (
 tenant_id text NOT NULL, dataset_id text NOT NULL, reference text NOT NULL,
 mapping_version text NOT NULL, case_ids text[] NOT NULL,
 specification jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_by text NOT NULL DEFAULT current_user,
 PRIMARY KEY (tenant_id,dataset_id,reference),
 FOREIGN KEY (tenant_id,dataset_id) REFERENCES mart.mapping_releases,
 CHECK (jsonb_typeof(specification)='object'),
 CHECK (specification->>'reference'=reference AND specification->>'tenantId'=tenant_id
  AND specification->>'datasetId'=dataset_id AND specification->>'mappingVersion'=mapping_version)
);
ALTER TABLE mart.release_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.release_certifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.release_certifications
 USING (tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK (tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE TRIGGER certification_immutable BEFORE UPDATE OR DELETE ON mart.release_certifications
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE FUNCTION mart.guard_release_certification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT mart.reconciliation_certified(NEW.tenant_id,NEW.dataset_id,NEW.mapping_version,NEW.case_ids)
 OR EXISTS (SELECT 1 FROM mart.reconciliation_evidence e WHERE e.tenant_id=NEW.tenant_id
  AND e.case_id=ANY(NEW.case_ids) AND (
   e.specification->>'expectedValue' IS DISTINCT FROM e.specification->>'actualValue'
   OR e.specification->>'expectedCount' IS DISTINCT FROM e.specification->>'actualCount'
   OR (e.specification->'tolerance'->>'absoluteValue')::numeric<>0
   OR (e.specification->'tolerance'->>'absoluteCount')::numeric<>0
   OR e.specification->>'from' IS DISTINCT FROM NEW.specification->>'from'
   OR e.specification->>'to' IS DISTINCT FROM NEW.specification->>'to')) THEN
  RAISE EXCEPTION 'Business certification requires exact completed reconciliation';
 END IF;
 IF EXISTS (SELECT 1 FROM mart.reconciliation_evidence e WHERE e.tenant_id=NEW.tenant_id AND e.dataset_id=NEW.dataset_id
  AND e.specification->>'mappingVersion'=NEW.mapping_version
  AND e.specification->>'from'=NEW.specification->>'from' AND e.specification->>'to'=NEW.specification->>'to'
  AND e.specification->>'frozenRevision' IN (SELECT selected.specification->>'frozenRevision' FROM mart.reconciliation_evidence selected
   WHERE selected.tenant_id=NEW.tenant_id AND selected.case_id=ANY(NEW.case_ids))
  AND (e.status<>'passed' OR NOT e.group_completeness
   OR e.specification->>'expectedValue' IS DISTINCT FROM e.specification->>'actualValue'
   OR e.specification->>'expectedCount' IS DISTINCT FROM e.specification->>'actualCount')) THEN
  RAISE EXCEPTION 'Failed technical evidence cannot be omitted from certification';
 END IF;
 IF coalesce(NEW.specification->>'evidenceKind','') NOT IN ('authorized_business_approval','external_report')
 OR coalesce(length(btrim(NEW.specification->>'approverReference')),0)=0
 OR coalesce(length(btrim(NEW.specification->>'technicalReference')),0)=0
 OR NEW.specification->>'approvedAt' IS NULL
 OR coalesce(jsonb_array_length(NEW.specification->'businessSemantics'),0)<1
 OR NEW.specification->'caseIds' IS DISTINCT FROM to_jsonb(NEW.case_ids)
 OR (NEW.specification->>'evidenceKind'='external_report' AND coalesce(length(btrim(NEW.specification->>'externalReportReference')),0)=0) THEN
  RAISE EXCEPTION 'Authorized business approval or external report required';
 END IF;
 IF EXISTS (SELECT 1 FROM mart.mapping_releases m, jsonb_array_elements(m.specification->'measures') measure
  WHERE m.tenant_id=NEW.tenant_id AND m.dataset_id=NEW.dataset_id AND NOT EXISTS (
   SELECT 1 FROM mart.reconciliation_evidence e WHERE e.tenant_id=NEW.tenant_id AND e.case_id=ANY(NEW.case_ids)
   AND e.specification->>'measureId'=measure->>'measureId')) THEN
  RAISE EXCEPTION 'Certification requires every mapping measure';
 END IF;
 IF EXISTS (SELECT 1 FROM mart.reconciliation_batches links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  WHERE links.tenant_id=NEW.tenant_id AND links.case_id=ANY(NEW.case_ids)
  AND to_jsonb(b.company_ids) IS DISTINCT FROM NEW.specification->'companyIds') THEN
  RAISE EXCEPTION 'Certification company scope mismatch';
 END IF;
 IF coalesce(jsonb_array_length(NEW.specification->'approvedValues'),0)=0 OR EXISTS (
  SELECT 1 FROM jsonb_array_elements(NEW.specification->'approvedValues') control WHERE NOT EXISTS (
   SELECT 1 FROM mart.reconciliation_evidence e WHERE e.tenant_id=NEW.tenant_id AND e.case_id=ANY(NEW.case_ids)
   AND e.specification->>'grouping' IS NULL AND e.specification->>'measureId'=control->>'measureId'
   AND e.specification->>'actualValue'=control->>'value')) THEN
  RAISE EXCEPTION 'Approved values must match exact overall controls';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER certification_evidence BEFORE INSERT ON mart.release_certifications
 FOR EACH ROW EXECUTE FUNCTION mart.guard_release_certification();
CREATE FUNCTION mart.business_certified(tenant text,dataset text,reference text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND EXISTS (
  SELECT 1 FROM mart.release_certifications c WHERE c.tenant_id=tenant AND c.dataset_id=dataset
  AND c.reference=reference AND c.case_ids @> cases AND cases @> c.case_ids);
$$;
REVOKE ALL ON FUNCTION mart.business_certified(text,text,text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_certified(text,text,text,text[]) TO dabboos_runtime;
CREATE FUNCTION mart.require_mapping_business_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT mart.business_certified(NEW.tenant_id,NEW.dataset_id,NEW.approval_reference,NEW.approval_case_ids) THEN
  RAISE EXCEPTION 'Mapping approval requires immutable business certification';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER mapping_business_approval AFTER UPDATE ON mart.mapping_releases
 FOR EACH ROW EXECUTE FUNCTION mart.require_mapping_business_approval();
CREATE FUNCTION mart.require_candidate_registration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.approval_status<>'pending' THEN RAISE EXCEPTION 'Register candidate before certification'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER mapping_candidate BEFORE INSERT ON mart.mapping_releases
 FOR EACH ROW EXECUTE FUNCTION mart.require_candidate_registration();
CREATE OR REPLACE FUNCTION mart.guard_serving_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM mart.mapping_releases m WHERE m.tenant_id=NEW.tenant_id AND m.dataset_id=NEW.dataset_id
  AND m.approval_status='approved' AND mart.reconciliation_certified(m.tenant_id,m.dataset_id,m.mapping_version,m.approval_case_ids)
  AND mart.business_certified(m.tenant_id,m.dataset_id,m.approval_reference,m.approval_case_ids)) THEN
  RAISE EXCEPTION 'Serving requires approved reconciled business-certified mapping';
 END IF;
 RETURN NEW;
END $$;
DROP POLICY runtime_release ON mart.mapping_releases;
CREATE POLICY runtime_release ON mart.mapping_releases AS RESTRICTIVE TO dabboos_runtime
 USING (approval_status='approved' AND mart.reconciliation_certified(tenant_id,dataset_id,mapping_version,approval_case_ids)
 AND mart.business_certified(tenant_id,dataset_id,approval_reference,approval_case_ids)
 AND EXISTS (SELECT 1 FROM mart.serving_bindings b WHERE b.tenant_id=mapping_releases.tenant_id AND b.dataset_id=mapping_releases.dataset_id));
CREATE TABLE mart.release_promotions (
 tenant_id text NOT NULL,dataset_id text NOT NULL,reference text NOT NULL,
 release_fingerprint text NOT NULL CHECK (release_fingerprint ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_by text NOT NULL DEFAULT current_user,
 PRIMARY KEY (tenant_id,dataset_id), FOREIGN KEY (tenant_id,dataset_id) REFERENCES mart.mapping_releases
);
ALTER TABLE mart.release_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.release_promotions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.release_promotions
 USING (tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK (tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE TRIGGER promotion_immutable BEFORE UPDATE OR DELETE ON mart.release_promotions
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
REVOKE ALL ON mart.release_certifications,mart.release_promotions FROM PUBLIC,dabboos_ingestor,dabboos_runtime;
REVOKE ALL ON FUNCTION mart.guard_release_certification(),mart.require_mapping_business_approval(),mart.require_candidate_registration() FROM PUBLIC;
