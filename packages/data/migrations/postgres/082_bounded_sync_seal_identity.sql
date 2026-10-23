-- Validate immutable head identity at insertion, within each bounded write page.
-- Sealing checks completeness without rereading every captured JSON payload.
LOCK TABLE mart.analytics_sync_heads, mart.analytics_sync_seals IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_sync_heads head WHERE NOT EXISTS(
  SELECT 1 FROM mart.analytics_sync_seals seal WHERE seal.tenant_id=head.tenant_id AND seal.candidate_id=head.candidate_id)) THEN
  RAISE EXCEPTION 'Unsealed sync heads must be resolved before installing identity validation';
 END IF;
END $$;
CREATE FUNCTION mart.validate_sync_head_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE fact jsonb;
BEGIN
 SELECT payload INTO STRICT fact FROM mart.analytics_fact_revisions
 WHERE tenant_id=NEW.tenant_id AND fact_key=NEW.fact_key AND revision_id=NEW.revision_id;
 IF ROW(NEW.business_month,NEW.measure_id,NEW.status,NEW.source_object,NEW.source_record_id)
 IS DISTINCT FROM ROW(left(fact->>'businessDate',7),fact->>'measureId',fact->>'status',fact->>'sourceObject',fact->>'sourceRecordId') THEN
  RAISE EXCEPTION 'Exact frozen candidate head identity required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_head_identity BEFORE INSERT ON mart.analytics_sync_heads
 FOR EACH ROW EXECUTE FUNCTION mart.validate_sync_head_identity();
REVOKE ALL ON FUNCTION mart.validate_sync_head_identity() FROM PUBLIC;

-- Existing sealed heads already passed the previous full-set proof. New heads
-- cannot commit without the insertion guard; both heads and revisions are immutable.
CREATE OR REPLACE FUNCTION mart.seal_sync_candidate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured jsonb; kind_name text; expected_pages integer; expected_rows bigint;
BEGIN
 SELECT specification INTO STRICT captured FROM mart.analytics_sync_candidates WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id;
 IF (captured->'request'->>'tenantId'=NEW.tenant_id AND captured->'request'->>'kind'='sync'
  AND captured->'cursor'->>'cutoff'=captured->'source'->>'cutoff'
  AND jsonb_typeof(captured->'controls')='array' AND jsonb_typeof(captured->'partitions')='array' AND jsonb_typeof(captured->'days')='array'
  AND (captured->>'recordsChanged')::bigint>=0 AND (captured->>'expectedHeads')::bigint>=0
  AND (captured->>'receivablePages')::integer>=0 AND (captured->>'lookupPages')::integer>=0
  AND ((captured->>'recordsChanged')::bigint=0)=((captured->>'expectedHeads')::bigint=0)
  AND ((captured->>'recordsChanged')::bigint=0)=(jsonb_array_length(captured->'controls')=0)) IS NOT TRUE THEN
  RAISE EXCEPTION 'Complete bounded sync capture required';
 END IF;
 IF (captured->>'expectedHeads')::bigint IS DISTINCT FROM (SELECT count(*) FROM mart.analytics_sync_heads WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id)
 THEN
  RAISE EXCEPTION 'Incomplete frozen candidate heads';
 END IF;
 FOREACH kind_name IN ARRAY ARRAY['receivable','lookup'] LOOP
  expected_pages:=(captured->>(CASE kind_name WHEN 'receivable' THEN 'receivablePages' ELSE 'lookupPages' END))::integer;
  expected_rows:=coalesce((captured->'details'->>(CASE kind_name WHEN 'receivable' THEN 'receivableDependencyRows' ELSE 'lookupDependencyRows' END))::bigint,0);
  IF expected_pages IS DISTINCT FROM (SELECT count(*) FROM mart.analytics_sync_dependencies WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id AND kind=kind_name)
  OR expected_rows IS DISTINCT FROM (SELECT coalesce(sum(jsonb_array_length(payload)),0) FROM mart.analytics_sync_dependencies WHERE tenant_id=NEW.tenant_id AND candidate_id=NEW.candidate_id AND kind=kind_name)
  OR EXISTS(SELECT 1 FROM generate_series(0,expected_pages-1) expected(page) WHERE NOT EXISTS(
   SELECT 1 FROM mart.analytics_sync_dependencies actual WHERE actual.tenant_id=NEW.tenant_id AND actual.candidate_id=NEW.candidate_id AND actual.kind=kind_name AND actual.page=expected.page)) THEN
   RAISE EXCEPTION 'Incomplete frozen candidate dependencies';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
