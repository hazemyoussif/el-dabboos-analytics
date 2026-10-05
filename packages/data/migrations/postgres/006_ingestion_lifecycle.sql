-- Candidate specification is immutable; certification metadata alone can change.
ALTER TABLE mart.mapping_releases
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approval_case_ids text[] NOT NULL DEFAULT '{}';

CREATE TABLE mart.extraction_runs (
  tenant_id text NOT NULL, extraction_id text NOT NULL, dataset_id text NOT NULL,
  source_id text NOT NULL, mapping_id text NOT NULL, mapping_version text NOT NULL,
  specification jsonb NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete')),
  page_count integer NOT NULL DEFAULT 0 CHECK (page_count>=0),
  row_count bigint NOT NULL DEFAULT 0 CHECK (row_count>=0),
  cursor_checkpoint text, completed_at timestamptz,
  PRIMARY KEY (tenant_id,extraction_id),
  UNIQUE (tenant_id,dataset_id,extraction_id),
  FOREIGN KEY (tenant_id,dataset_id,source_id,mapping_id,mapping_version)
    REFERENCES mart.mapping_releases (tenant_id,dataset_id,source_id,mapping_id,mapping_version),
  CHECK ((status='complete') = (completed_at IS NOT NULL)),
  CHECK (status<>'complete' OR page_count>0)
);
ALTER TABLE mart.extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.extraction_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.extraction_runs
 USING (tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK (tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT,UPDATE ON mart.extraction_runs TO dabboos_ingestor;
GRANT SELECT ON mart.extraction_runs,mart.batch_facts TO dabboos_runtime;
CREATE POLICY runtime_release ON mart.batch_facts AS RESTRICTIVE TO dabboos_runtime
 USING (EXISTS (SELECT 1 FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id)
 WHERE b.tenant_id=batch_facts.tenant_id AND b.dataset_id=batch_facts.dataset_id AND m.approval_status='approved'));
CREATE POLICY runtime_release ON mart.extraction_runs AS RESTRICTIVE TO dabboos_runtime
 USING (status='complete' AND EXISTS (SELECT 1 FROM mart.serving_bindings b JOIN mart.mapping_releases m USING (tenant_id,dataset_id)
 WHERE b.tenant_id=extraction_runs.tenant_id AND b.dataset_id=extraction_runs.dataset_id AND m.approval_status='approved'));

ALTER TABLE mart.ingestion_batches
 DROP CONSTRAINT batch_publication_complete,
 ADD COLUMN extraction_id text,
 ADD COLUMN page_number integer,
 ADD COLUMN cursor_end text,
 ADD CONSTRAINT batch_page_identity CHECK ((extraction_id IS NULL AND page_number IS NULL AND cursor_end IS NULL)
   OR (extraction_id IS NOT NULL AND page_number>0)),
 ADD CONSTRAINT batch_publication_complete CHECK (status<>'committed' OR pagination_complete OR extraction_id IS NOT NULL),
 ADD CONSTRAINT batch_extraction FOREIGN KEY (tenant_id,dataset_id,extraction_id) REFERENCES mart.extraction_runs (tenant_id,dataset_id,extraction_id),
 ADD CONSTRAINT extraction_page_unique UNIQUE (tenant_id,extraction_id,page_number);

-- Complete-linked immutable history, before revision selection: partial correction heads cannot hide old facts.
CREATE OR REPLACE VIEW mart.canonical_facts AS
 SELECT r.* FROM mart.fact_revisions r JOIN (
  SELECT DISTINCT ON (links.tenant_id,links.dataset_id,links.fact_key)
    links.tenant_id,links.dataset_id,links.fact_key,links.source_revision
  FROM mart.batch_facts links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status='committed' AND ((b.extraction_id IS NULL AND b.pagination_complete) OR run.status='complete')
  ORDER BY links.tenant_id,links.dataset_id,links.fact_key,links.source_revision DESC
 ) eligible USING (tenant_id,dataset_id,fact_key,source_revision)
 WHERE r.status='active';
ALTER VIEW mart.canonical_facts SET (security_invoker=true,security_barrier=true);

CREATE FUNCTION mart.guard_extraction_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.status='complete' OR
   (to_jsonb(NEW)-ARRAY['status','page_count','row_count','cursor_checkpoint','completed_at']) IS DISTINCT FROM
   (to_jsonb(OLD)-ARRAY['status','page_count','row_count','cursor_checkpoint','completed_at']) THEN
   RAISE EXCEPTION 'Immutable extraction scope or completed extraction';
 END IF;
 IF NEW.page_count<>OLD.page_count+1 OR NEW.row_count<OLD.row_count THEN
   RAISE EXCEPTION 'Invalid extraction checkpoint progression';
 END IF;
 IF NEW.page_count<>(SELECT count(*) FROM mart.ingestion_batches b WHERE b.tenant_id=NEW.tenant_id AND b.extraction_id=NEW.extraction_id AND b.status='committed')
 OR NEW.row_count<>(SELECT coalesce(sum(rows_read),0) FROM mart.ingestion_batches b WHERE b.tenant_id=NEW.tenant_id AND b.extraction_id=NEW.extraction_id AND b.status='committed')
 OR NOT EXISTS (SELECT 1 FROM mart.ingestion_batches b WHERE b.tenant_id=NEW.tenant_id AND b.extraction_id=NEW.extraction_id AND b.page_number=NEW.page_count
   AND b.status='committed' AND b.pagination_complete=(NEW.status='complete') AND coalesce(b.cursor_end,OLD.cursor_checkpoint) IS NOT DISTINCT FROM NEW.cursor_checkpoint) THEN
   RAISE EXCEPTION 'Extraction completion requires committed terminal page and exact counters';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER extraction_scope_immutable BEFORE UPDATE OR DELETE ON mart.extraction_runs
 FOR EACH ROW EXECUTE FUNCTION mart.guard_extraction_run();

-- Definer reads evidence only; no caller-supplied SQL and no recursion through mapping RLS.
-- Forced tenant RLS still applies under the non-bypass migrator owner.
CREATE FUNCTION mart.reconciliation_certified(tenant text,dataset text,version text,cases text[]) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart AS $$
 SELECT tenant=nullif(current_setting('mart.tenant_id',true),'') AND cardinality(cases)>0
 AND cardinality(cases)=(SELECT count(DISTINCT value) FROM unnest(cases) value)
 AND NOT EXISTS (
  SELECT 1 FROM unnest(cases) selected(case_id)
  LEFT JOIN mart.reconciliation_evidence evidence ON evidence.tenant_id=tenant AND evidence.dataset_id=dataset AND evidence.case_id=selected.case_id
  WHERE evidence.case_id IS NULL OR evidence.status<>'passed' OR NOT evidence.group_completeness
    OR evidence.specification->>'mappingVersion'<>version
    OR NOT EXISTS (SELECT 1 FROM mart.reconciliation_batches links WHERE links.tenant_id=tenant AND links.case_id=selected.case_id)
    OR EXISTS (SELECT 1 FROM mart.reconciliation_batches links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
      LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
      WHERE links.tenant_id=tenant AND links.case_id=selected.case_id AND
        (b.status<>'committed' OR (b.extraction_id IS NULL AND NOT b.pagination_complete) OR (b.extraction_id IS NOT NULL AND run.status<>'complete')))
 );
$$;
REVOKE ALL ON FUNCTION mart.reconciliation_certified(text,text,text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.reconciliation_certified(text,text,text,text[]) TO dabboos_ingestor,dabboos_runtime;
CREATE OR REPLACE FUNCTION mart.refuse_mapping_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR
  (to_jsonb(NEW)-ARRAY['approval_status','approval_reference','approved_at','approval_case_ids']) IS DISTINCT FROM
  (to_jsonb(OLD)-ARRAY['approval_status','approval_reference','approved_at','approval_case_ids']) THEN
  RAISE EXCEPTION 'Mapping releases are immutable';
 END IF;
 IF (OLD.approval_status<>'pending' AND cardinality(OLD.approval_case_ids)>0) OR NEW.approval_status<>'approved' OR NEW.approved_at IS NULL OR
  NOT mart.reconciliation_certified(NEW.tenant_id,NEW.dataset_id,NEW.mapping_version,NEW.approval_case_ids) THEN
  RAISE EXCEPTION 'Approval requires successful completed reconciliation';
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.specification->'measures') measure
  WHERE NOT EXISTS (SELECT 1 FROM mart.reconciliation_evidence evidence
   WHERE evidence.tenant_id=NEW.tenant_id AND evidence.dataset_id=NEW.dataset_id
    AND evidence.case_id=ANY(NEW.approval_case_ids)
    AND evidence.specification->>'measureId'=measure->>'measureId')) THEN
  RAISE EXCEPTION 'Approval requires reconciliation for every mapping measure';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION mart.guard_serving_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM mart.mapping_releases m WHERE m.tenant_id=NEW.tenant_id AND m.dataset_id=NEW.dataset_id
  AND m.approval_status='approved' AND mart.reconciliation_certified(m.tenant_id,m.dataset_id,m.mapping_version,m.approval_case_ids)) THEN
  RAISE EXCEPTION 'Serving requires approved reconciled mapping';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER serving_certification BEFORE INSERT OR UPDATE ON mart.serving_bindings
 FOR EACH ROW EXECUTE FUNCTION mart.guard_serving_binding();
-- Existing bindings without certification fail closed until controlled reconciliation/recertification.
DROP POLICY runtime_release ON mart.mapping_releases;
CREATE POLICY runtime_release ON mart.mapping_releases AS RESTRICTIVE TO dabboos_runtime
 USING (approval_status='approved' AND mart.reconciliation_certified(tenant_id,dataset_id,mapping_version,approval_case_ids)
 AND EXISTS (SELECT 1 FROM mart.serving_bindings b WHERE b.tenant_id=mapping_releases.tenant_id AND b.dataset_id=mapping_releases.dataset_id));
REVOKE ALL ON FUNCTION mart.guard_serving_binding(),mart.guard_extraction_run() FROM PUBLIC;

CREATE FUNCTION mart.refuse_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable ingestion and reconciliation history'; END $$;
CREATE TRIGGER batch_committed_immutable BEFORE UPDATE OR DELETE ON mart.ingestion_batches
 FOR EACH ROW WHEN (OLD.status='committed') EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE TRIGGER reconciliation_immutable BEFORE UPDATE OR DELETE ON mart.reconciliation_evidence
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
REVOKE ALL ON FUNCTION mart.refuse_history_mutation() FROM PUBLIC;
