-- Extend the existing manifest. Legacy bindings/publications remain recovery evidence only.
ALTER TABLE mart.analytics_partitions ADD COLUMN family text NOT NULL DEFAULT 'facts' CHECK(family IN ('facts','receivables'));
ALTER TABLE mart.analytics_partitions ADD COLUMN snapshot_id text;
ALTER TABLE mart.analytics_partitions ADD COLUMN capabilities jsonb;
ALTER TABLE mart.analytics_partitions ADD CONSTRAINT partition_snapshot FOREIGN KEY(tenant_id,snapshot_id) REFERENCES mart.finance_snapshot_evidence;
ALTER TABLE mart.analytics_partitions ADD CONSTRAINT partition_payload CHECK((family='receivables')=(snapshot_id IS NOT NULL));
ALTER TABLE mart.analytics_serving_members ADD COLUMN family text NOT NULL DEFAULT 'facts' CHECK(family IN ('facts','receivables'));
ALTER TABLE mart.analytics_serving_members DROP CONSTRAINT analytics_serving_members_pkey;
ALTER TABLE mart.analytics_serving_members ADD PRIMARY KEY(tenant_id,revision_id,month,family);
ALTER TABLE mart.analytics_serving_revisions ADD COLUMN purpose text NOT NULL DEFAULT 'operational' CHECK(purpose IN ('operational','adoption','snapshot'));
ALTER TABLE mart.finance_snapshot_evidence ALTER COLUMN anchor_dataset DROP NOT NULL;
GRANT INSERT ON mart.finance_snapshot_evidence,mart.finance_snapshot_customers TO dabboos_ingestor;
GRANT EXECUTE ON FUNCTION mart.finance_values_valid(jsonb) TO dabboos_ingestor;

-- Membership itself is immutable once its revision has been served, including old revisions.
CREATE FUNCTION mart.guard_serving_member() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE part mart.analytics_partitions; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 SELECT * INTO STRICT part FROM mart.analytics_partitions WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id;
 IF part.family<>NEW.family OR part.month<>NEW.month THEN RAISE EXCEPTION 'Partition identity mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM mart.analytics_trusted_serving WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id)
 OR EXISTS(SELECT 1 FROM mart.analytics_serving_revisions WHERE tenant_id=NEW.tenant_id AND parent_revision=NEW.revision_id) THEN
  RAISE EXCEPTION 'Trusted revision membership is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER serving_member_guard BEFORE INSERT ON mart.analytics_serving_members FOR EACH ROW EXECUTE FUNCTION mart.guard_serving_member();

-- The old anchor is optional provenance, never authority. Validate exact customer vectors
-- against approved definitions and the independently reconstructed company summary.
CREATE FUNCTION mart.finance_snapshot_exact(selected_tenant text,selected_snapshot text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM mart.finance_snapshot_evidence evidence JOIN mart.analytics_baselines baseline USING(tenant_id)
 WHERE evidence.tenant_id=selected_tenant AND evidence.snapshot_id=selected_snapshot
 AND evidence.definition_version=baseline.definition_version AND evidence.reporting_currency=baseline.reporting_currency
 AND length(btrim(evidence.source_revision))>0
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(baseline.specification) mapping,jsonb_array_elements(mapping->'measures') rule WHERE rule->>'measureId'='net_aged_receivable')
 AND evidence.customer_count=(SELECT count(*) FROM mart.finance_snapshot_customers WHERE tenant_id=selected_tenant AND snapshot_id=selected_snapshot)
 AND mart.finance_values_valid(evidence.totals)
 AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(evidence.totals) total WHERE total.value::numeric IS DISTINCT FROM
  (SELECT sum((actual_values->>total.key)::numeric) FROM mart.finance_snapshot_customers WHERE tenant_id=selected_tenant AND snapshot_id=selected_snapshot)))
$$;
CREATE OR REPLACE FUNCTION mart.lock_finance_snapshot_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('finance-evidence:'||NEW.tenant_id||':'||NEW.snapshot_id,0));
 IF TG_TABLE_NAME='finance_snapshot_customers' AND (EXISTS(SELECT 1 FROM mart.finance_snapshot_publications WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id)
 OR EXISTS(SELECT 1 FROM mart.analytics_partitions WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id)) THEN
  RAISE EXCEPTION 'Published Finance snapshot membership is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION mart.guard_snapshot_partition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family='facts' THEN
  IF NEW.capabilities IS NOT NULL AND NOT pg_has_role(current_user,'dabboos_migrator','MEMBER') THEN RAISE EXCEPTION 'Operational capability must inherit approved baseline'; END IF;
  IF NEW.capabilities IS NULL THEN SELECT capabilities INTO NEW.capabilities FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id; END IF;
 END IF;
 IF NEW.family='receivables' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('finance-evidence:'||NEW.tenant_id||':'||NEW.snapshot_id,0));
  IF NOT mart.finance_snapshot_exact(NEW.tenant_id,NEW.snapshot_id) OR NOT EXISTS(SELECT 1 FROM mart.finance_snapshot_evidence
   WHERE tenant_id=NEW.tenant_id AND snapshot_id=NEW.snapshot_id AND date_trunc('month',snapshot_date)::date=NEW.month) THEN
   RAISE EXCEPTION 'Exact approved snapshot partition required';
  END IF;
 END IF;
 IF NEW.family='facts' AND NEW.capabilities IS NULL THEN RAISE EXCEPTION 'Partition capability evidence required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_partition_guard BEFORE INSERT ON mart.analytics_partitions FOR EACH ROW EXECUTE FUNCTION mart.guard_snapshot_partition();

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
     OR (candidate.purpose='snapshot' AND prior.family<>'receivables') OR (candidate.purpose='operational' AND prior.family<>'facts'))))) THEN
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
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id) THEN RAISE EXCEPTION 'Complete candidate membership required'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION mart.guard_event_aggregate_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_revisions revision JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  WHERE revision.tenant_id=NEW.tenant_id AND revision.revision_id=NEW.revision_id AND member.family='facts' AND member.month=ANY(revision.affected_months)
  AND NOT EXISTS(SELECT 1 FROM mart.analytics_aggregate_proofs proof WHERE proof.tenant_id=member.tenant_id AND proof.partition_id=member.partition_id)) THEN
  RAISE EXCEPTION 'Promotion requires reconciled daily and monthly aggregates';
 END IF;
 RETURN NEW;
END $$;

-- A view projects the one trusted manifest; it is not another publication pointer.
CREATE VIEW mart.trusted_finance_snapshots WITH(security_invoker=true) AS
 SELECT member.tenant_id,evidence.snapshot_date,evidence.snapshot_id,member.revision_id
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 WHERE member.family='receivables';
GRANT SELECT ON mart.trusted_finance_snapshots TO dabboos_runtime,dabboos_ingestor;
DROP POLICY published_only ON mart.finance_snapshot_evidence;
DROP POLICY published_only ON mart.finance_snapshot_customers;
-- No recursive evidence/view policy: membership is sufficient; partition insertion proves evidence.
CREATE POLICY trusted_only ON mart.finance_snapshot_evidence AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id) WHERE part.tenant_id=finance_snapshot_evidence.tenant_id AND part.snapshot_id=finance_snapshot_evidence.snapshot_id));
CREATE POLICY trusted_only ON mart.finance_snapshot_customers AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(
 SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id) WHERE part.tenant_id=finance_snapshot_customers.tenant_id AND part.snapshot_id=finance_snapshot_customers.snapshot_id));
REVOKE ALL ON FUNCTION mart.guard_serving_member(),mart.finance_snapshot_exact(text,text),mart.guard_snapshot_partition() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.finance_snapshot_exact(text,text) TO dabboos_ingestor;

-- The runner adopts certified rows on this same transaction before recording version 040.
-- Enumerate tenants without weakening FORCE RLS in the resulting schema.
ALTER TABLE mart.analytics_baselines NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.serving_bindings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.historical_serving_bindings NO FORCE ROW LEVEL SECURITY;
CREATE TEMP TABLE serving_adoption_tenants ON COMMIT DROP AS
 SELECT tenant_id FROM mart.analytics_baselines UNION SELECT tenant_id FROM mart.serving_bindings UNION SELECT tenant_id FROM mart.historical_serving_bindings;
ALTER TABLE mart.analytics_baselines FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.serving_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.historical_serving_bindings FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mart.guard_analytics_baseline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF cardinality(NEW.datasets)<>(SELECT count(*) FROM mart.mapping_releases mapping WHERE tenant_id=NEW.tenant_id AND dataset_id=ANY(NEW.datasets)
 AND approval_status='approved' AND source_id=NEW.source_id AND reporting_currency=NEW.reporting_currency
 AND mart.reconciliation_certified(tenant_id,dataset_id,mapping_version,approval_case_ids)
 AND mart.business_certified(tenant_id,dataset_id,approval_reference,approval_case_ids)) THEN
  RAISE EXCEPTION 'Baseline requires exact certified tenant/source/currency scope';
 END IF;
 RETURN NEW;
END $$;

ALTER TABLE mart.analytics_partitions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_baselines NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_partitions DISABLE TRIGGER immutable_history;
UPDATE mart.analytics_partitions part SET capabilities=baseline.capabilities FROM mart.analytics_baselines baseline WHERE part.tenant_id=baseline.tenant_id;
ALTER TABLE mart.analytics_partitions ENABLE TRIGGER immutable_history;
ALTER TABLE mart.analytics_partitions FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_baselines FORCE ROW LEVEL SECURITY;
