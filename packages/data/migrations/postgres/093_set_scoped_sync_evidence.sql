-- Treat evidence IDs as a relation once. Repeated scalar-array membership
-- checks become quadratic for large, otherwise valid frozen captures.
-- Preserve exact multiset control equality, unique ID coverage and provenance.
CREATE OR REPLACE FUNCTION mart.guard_sync_reconciliation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured jsonb;
BEGIN
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates
 WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 IF jsonb_array_length(NEW.evidence->'caseIds')<>jsonb_array_length(captured->'controls')
 OR EXISTS(WITH requested AS MATERIALIZED (
  SELECT DISTINCT value case_id FROM jsonb_array_elements_text(NEW.evidence->'caseIds')
 ),actual AS MATERIALIZED (
  SELECT evidence.partition,evidence.measure_id,evidence.expected_value,evidence.expected_count,
   evidence.source_cutoff,evidence.source_revision,evidence.definition_version,evidence.mapping_version
  FROM requested JOIN mart.analytics_exact_cases evidence ON evidence.tenant_id=NEW.tenant_id AND evidence.case_id=requested.case_id
 ),expected AS MATERIALIZED (
  SELECT control.partition,control.measure,control.value,control.count
  FROM jsonb_to_recordset(captured->'controls') control(partition jsonb,measure text,value numeric,count bigint)
 ) SELECT 1 WHERE (SELECT count(*) FROM actual)<>jsonb_array_length(NEW.evidence->'caseIds')
 OR EXISTS(SELECT 1 FROM actual
  WHERE source_cutoff<>(captured->'source'->>'cutoff')::timestamptz OR source_revision<>captured->'source'->>'revision'
   OR definition_version<>captured->'source'->>'definitionVersion' OR mapping_version<>captured->'source'->>'mappingVersion')
 OR EXISTS((SELECT partition,measure,value,count FROM expected
   EXCEPT ALL SELECT partition,measure_id,expected_value,expected_count FROM actual)
  UNION ALL (SELECT partition,measure_id,expected_value,expected_count FROM actual
   EXCEPT ALL SELECT partition,measure,value,count FROM expected))) THEN
  RAISE EXCEPTION 'Sync reconciliation must cover every frozen source control';
 END IF;
 RETURN NEW;
END $$;
