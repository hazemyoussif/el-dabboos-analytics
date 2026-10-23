-- Private source capture for one missing Command recipe. No page is serving
-- evidence until the candidate is sealed against independent source controls.
CREATE TABLE mart.command_capture_candidates (
 tenant_id text NOT NULL,candidate_id text NOT NULL,month date NOT NULL,source_object text NOT NULL,
 base_revision text NOT NULL,base_partition text,mapping jsonb NOT NULL,
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),
 CHECK(date_trunc('month',month)::date=month AND source_object IN
  ('command_invoice','command_receipt','command_order','command_receivable','command_allocation')),
 CHECK(length(source_revision)>0 AND jsonb_typeof(mapping)='object'),
 FOREIGN KEY(tenant_id,base_revision) REFERENCES mart.analytics_serving_revisions,
 FOREIGN KEY(tenant_id,base_partition) REFERENCES mart.review_extractions
);
CREATE TABLE mart.command_capture_facts (
 tenant_id text NOT NULL,candidate_id text NOT NULL,page integer NOT NULL CHECK(page>=0),
 payload jsonb NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id,page),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_candidates,
 CHECK(jsonb_typeof(payload)='array' AND jsonb_array_length(payload) BETWEEN 1 AND 1000)
);
CREATE TABLE mart.command_capture_controls (
 tenant_id text NOT NULL,candidate_id text NOT NULL,page integer NOT NULL CHECK(page>=0),
 payload jsonb NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id,page),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_candidates,
 CHECK(jsonb_typeof(payload)='array' AND jsonb_array_length(payload) BETWEEN 1 AND 1000)
);
CREATE TABLE mart.command_capture_seals (
 tenant_id text NOT NULL,candidate_id text NOT NULL,fact_pages integer NOT NULL CHECK(fact_pages>=0),
 control_pages integer NOT NULL CHECK(control_pages>=0),fact_count bigint NOT NULL CHECK(fact_count>=0 AND fact_count<=500000),
 control_count bigint NOT NULL CHECK(control_count>=0 AND control_count<=500128),
 PRIMARY KEY(tenant_id,candidate_id),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_candidates
);
CREATE TABLE mart.command_capture_abandoned (
 tenant_id text NOT NULL,candidate_id text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_candidates
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['command_capture_candidates','command_capture_facts','command_capture_controls','command_capture_seals','command_capture_abandoned'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.guard_command_capture_page() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('command-capture:'||NEW.tenant_id||':'||NEW.candidate_id,0));
 IF EXISTS(SELECT 1 FROM mart.command_capture_seals WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 OR EXISTS(SELECT 1 FROM mart.command_capture_abandoned WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 THEN RAISE EXCEPTION 'Frozen or abandoned Command capture is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER command_capture_fact_guard BEFORE INSERT ON mart.command_capture_facts
 FOR EACH ROW EXECUTE FUNCTION mart.guard_command_capture_page();
CREATE TRIGGER command_capture_control_guard BEFORE INSERT ON mart.command_capture_controls
 FOR EACH ROW EXECUTE FUNCTION mart.guard_command_capture_page();
CREATE FUNCTION mart.guard_command_capture_seal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate mart.command_capture_candidates;facts record;controls record; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('command-capture:'||NEW.tenant_id||':'||NEW.candidate_id,0));
 SELECT * INTO STRICT candidate FROM mart.command_capture_candidates WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 IF EXISTS(SELECT 1 FROM mart.command_capture_abandoned WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 THEN RAISE EXCEPTION 'Abandoned Command capture cannot be sealed'; END IF;
 SELECT count(*)::integer pages,coalesce(sum(jsonb_array_length(payload)),0) rows INTO facts
 FROM mart.command_capture_facts WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 SELECT count(*)::integer pages,coalesce(sum(jsonb_array_length(payload)),0) rows INTO controls
 FROM mart.command_capture_controls WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 IF facts.pages<>NEW.fact_pages OR controls.pages<>NEW.control_pages
 OR facts.rows<>NEW.fact_count OR controls.rows<>NEW.control_count
 OR EXISTS(SELECT 1 FROM generate_series(0,NEW.fact_pages-1) expected(page) WHERE NOT EXISTS(
  SELECT 1 FROM mart.command_capture_facts actual WHERE actual.tenant_id=NEW.tenant_id
  AND actual.candidate_id=NEW.candidate_id AND actual.page=expected.page))
 OR EXISTS(SELECT 1 FROM generate_series(0,NEW.control_pages-1) expected(page) WHERE NOT EXISTS(
  SELECT 1 FROM mart.command_capture_controls actual WHERE actual.tenant_id=NEW.tenant_id
  AND actual.candidate_id=NEW.candidate_id AND actual.page=expected.page))
 THEN RAISE EXCEPTION 'Incomplete Command capture pages'; END IF;
 IF EXISTS(SELECT 1 FROM mart.command_capture_facts page,LATERAL jsonb_array_elements(page.payload) fact
  WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id
  AND (fact->>'sourceObject' IS DISTINCT FROM candidate.source_object
   OR fact->>'tenantId' IS DISTINCT FROM candidate.tenant_id
   OR fact->>'sourceId' IS DISTINCT FROM candidate.mapping->>'sourceId'
   OR fact->>'datasetId' IS DISTINCT FROM candidate.mapping->>'datasetId'
   OR (fact->>'sourceAsOf')::timestamptz IS DISTINCT FROM candidate.source_cutoff
   OR fact->>'frozenRevision' IS DISTINCT FROM candidate.source_revision
   OR date_trunc('month',(fact->>'businessDate')::date)::date IS DISTINCT FROM candidate.month
   OR fact->>'status' IS DISTINCT FROM 'active'
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(candidate.mapping->'measures') rule
    WHERE rule->>'measureId'=fact->>'measureId' AND rule->>'sourceObject'=candidate.source_object)))
 OR EXISTS(SELECT 1 FROM mart.command_capture_controls page,LATERAL jsonb_array_elements(page.payload) control
  WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(candidate.mapping->'measures') rule
   WHERE rule->>'measureId'=control->>'measure' AND rule->>'sourceObject'=candidate.source_object))
 OR EXISTS(SELECT 1 FROM mart.command_capture_facts page,LATERAL jsonb_array_elements(page.payload) fact
  WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id
  GROUP BY fact->>'sourceObject',fact->>'sourceRecordId',fact->>'componentId',fact->>'measureId' HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Command capture identity or mapping conflict'; END IF;
 IF EXISTS(WITH source_facts AS (
   SELECT fact->>'measureId' measure,fact->'dimensions' dimensions,(fact->>'value')::numeric value
   FROM mart.command_capture_facts page,LATERAL jsonb_array_elements(page.payload) fact
   WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id
  ),actual AS (
   SELECT measure,CASE WHEN grouping(dimensions)=1 THEN NULL ELSE dimensions END dimensions,
    sum(value) value,count(*)::bigint count FROM source_facts GROUP BY GROUPING SETS((measure,dimensions),(measure))
  ),expected AS (
   SELECT control->>'measure' measure,nullif(control->'dimensions','null'::jsonb) dimensions,
    sum((control->>'value')::numeric) value,sum((control->>'count')::bigint) count
   FROM mart.command_capture_controls page,LATERAL jsonb_array_elements(page.payload) control
   WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id GROUP BY 1,2
  ) SELECT 1 FROM actual FULL JOIN expected ON actual.measure=expected.measure
   AND actual.dimensions IS NOT DISTINCT FROM expected.dimensions
   WHERE coalesce(actual.value,0) IS DISTINCT FROM coalesce(expected.value,0)
   OR coalesce(actual.count,0) IS DISTINCT FROM coalesce(expected.count,0))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(candidate.mapping->'measures') rule
  WHERE rule->>'sourceObject'=candidate.source_object AND NOT EXISTS(
   SELECT 1 FROM mart.command_capture_controls page,LATERAL jsonb_array_elements(page.payload) control
   WHERE page.tenant_id=NEW.tenant_id AND page.candidate_id=NEW.candidate_id
   AND control->>'measure'=rule->>'measureId' AND control->'dimensions'='null'::jsonb))
 THEN RAISE EXCEPTION 'Command capture differs from independent source controls'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER command_capture_seal_guard BEFORE INSERT ON mart.command_capture_seals
 FOR EACH ROW EXECUTE FUNCTION mart.guard_command_capture_seal();
CREATE FUNCTION mart.guard_command_capture_abandonment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('command-capture:'||NEW.tenant_id||':'||NEW.candidate_id,0));
 IF EXISTS(SELECT 1 FROM mart.command_capture_seals WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 THEN RAISE EXCEPTION 'Sealed Command capture cannot be abandoned'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER command_capture_abandonment_guard BEFORE INSERT ON mart.command_capture_abandoned
 FOR EACH ROW EXECUTE FUNCTION mart.guard_command_capture_abandonment();
REVOKE ALL ON FUNCTION mart.guard_command_capture_page(),mart.guard_command_capture_seal(),mart.guard_command_capture_abandonment() FROM PUBLIC;

-- A sealed private prepared revision is not a published report. Runtime cell
-- policies traverse bindings, so restricting bindings also hides their cells.
CREATE POLICY trusted_prepared_only ON mart.prepared_bindings AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted
  WHERE trusted.tenant_id=prepared_bindings.tenant_id AND trusted.revision_id=prepared_bindings.revision_id));
CREATE POLICY trusted_prepared_only ON mart.prepared_revision_seals AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted
  WHERE trusted.tenant_id=prepared_revision_seals.tenant_id AND trusted.revision_id=prepared_revision_seals.revision_id));
