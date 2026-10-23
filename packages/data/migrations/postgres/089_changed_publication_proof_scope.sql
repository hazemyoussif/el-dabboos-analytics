-- Materialize the changed manifest set before calling expensive exact proofs.
-- This preserves proof, family, affected-month, parent and cutoff checks while
-- preventing planner evaluation of proofs for unchanged accepted history.
CREATE OR REPLACE FUNCTION mart.guard_trusted_analytics() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate mart.analytics_serving_revisions; baseline mart.analytics_baselines; run mart.analytics_operation_runs;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 SELECT * INTO STRICT candidate FROM mart.analytics_serving_revisions WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id;
 SELECT * INTO baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 IF baseline IS NULL THEN RAISE EXCEPTION 'Certified operational baseline required'; END IF;
 IF TG_OP='UPDATE' AND candidate.parent_revision IS DISTINCT FROM OLD.revision_id THEN RAISE EXCEPTION 'Trusted parent conflict'; END IF;
 IF candidate.purpose='adoption' OR (candidate.run_id IS NULL AND TG_OP='INSERT') THEN
  IF NOT pg_has_role(current_user,'dabboos_migrator','MEMBER') THEN RAISE EXCEPTION 'Adoption requires publication operator'; END IF;
 ELSIF candidate.purpose IN('review','business') THEN
  IF candidate.run_id IS NOT NULL OR TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Review exposure requires trusted parent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
   WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family=candidate.purpose AND next.month=ANY(candidate.affected_months)) THEN RAISE EXCEPTION 'Complete review membership required'; END IF;
 ELSIF candidate.purpose='snapshot' THEN
  IF candidate.run_id IS NOT NULL OR TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Snapshot candidate requires trusted parent'; END IF;
 ELSE
  SELECT * INTO run FROM mart.analytics_operation_runs WHERE tenant_id=NEW.tenant_id AND run_id=candidate.run_id;
  IF run IS NULL OR run.status<>'passed' OR run.mismatch_count<>0 OR run.case_count=0 OR run.serving_release<>NEW.revision_id
  OR run.source_cutoff<>candidate.cutoff OR run.definition_version<>baseline.definition_version OR run.mapping_version<>baseline.mapping_version THEN
   RAISE EXCEPTION 'Trusted promotion requires complete passing operational evidence';
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(candidate.affected_months) changed(month)
   WHERE NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=NEW.tenant_id AND member.revision_id=NEW.revision_id AND member.month=changed.month AND member.family='facts')
   OR NOT EXISTS(SELECT 1 FROM mart.analytics_exact_cases evidence WHERE evidence.tenant_id=NEW.tenant_id AND evidence.case_id=ANY(run.case_ids)
    AND evidence.partition->>'month'=to_char(changed.month,'YYYY-MM') AND evidence.partition->>'dimension' IS NULL)) THEN
   RAISE EXCEPTION 'Affected refresh lacks exact summary controls';
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members prior LEFT JOIN mart.analytics_serving_members next
   ON next.tenant_id=prior.tenant_id AND next.revision_id=NEW.revision_id AND next.month=prior.month AND next.family=prior.family
   WHERE prior.tenant_id=NEW.tenant_id AND prior.revision_id=OLD.revision_id AND (next.partition_id IS NULL OR
    (next.partition_id<>prior.partition_id AND (NOT prior.month=ANY(candidate.affected_months)
     OR (candidate.purpose='snapshot' AND prior.family<>'receivables') OR (candidate.purpose='operational' AND prior.family<>'facts') OR (candidate.purpose IN('review','business') AND prior.family<>candidate.purpose))))) THEN
  RAISE EXCEPTION 'Incomplete affected refresh';
 END IF;
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_members next LEFT JOIN mart.analytics_serving_members prior
 ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
 WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id
 AND NOT next.month=ANY(candidate.affected_months)) THEN RAISE EXCEPTION 'Changed partition lacks affected scope'; END IF;
 IF candidate.purpose='snapshot' AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next
  LEFT JOIN mart.analytics_serving_members prior ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id AND next.family<>'receivables') THEN
  RAISE EXCEPTION 'Snapshot promotion may only replace snapshot partitions';
 END IF;
 IF candidate.purpose IN('review','business') AND EXISTS(WITH changed AS MATERIALIZED (
  SELECT next.* FROM mart.analytics_serving_members next LEFT JOIN mart.analytics_serving_members prior
   ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.partition_id IS DISTINCT FROM prior.partition_id
 ) SELECT 1 FROM changed WHERE changed.family<>candidate.purpose OR NOT CASE WHEN changed.family='business'
  THEN mart.business_partition_exact(changed.tenant_id,changed.partition_id) ELSE mart.review_partition_exact(changed.tenant_id,changed.partition_id) END)
 THEN RAISE EXCEPTION 'Review exposure requires exact independent source controls'; END IF;
 IF candidate.purpose IN('review','business') AND EXISTS(SELECT 1 FROM mart.analytics_serving_members next JOIN mart.review_extractions observed USING(tenant_id,partition_id)
  JOIN mart.analytics_serving_members prior ON prior.tenant_id=next.tenant_id AND prior.revision_id=candidate.parent_revision AND prior.month=next.month AND prior.family=next.family
  JOIN mart.review_extractions previous ON previous.tenant_id=prior.tenant_id AND previous.partition_id=prior.partition_id
  WHERE next.tenant_id=NEW.tenant_id AND next.revision_id=NEW.revision_id AND next.family=candidate.purpose AND next.partition_id<>prior.partition_id
  AND observed.source_cutoff<=previous.source_cutoff) THEN RAISE EXCEPTION 'Newer review source cutoff required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN RAISE EXCEPTION 'Complete candidate membership required'; END IF;
 RETURN NEW;
END $$;
