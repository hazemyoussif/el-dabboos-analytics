-- Explicit reporting/preparation window; canonical source history remains intact.
-- Register only before prepared serving is sealed/activated. Unconfigured tenants retain full coverage.
CREATE TABLE mart.prepared_reporting_windows (
 tenant_id text PRIMARY KEY,registration_revision text NOT NULL,from_day date NOT NULL,through_day date NOT NULL,
 FOREIGN KEY(tenant_id,registration_revision) REFERENCES mart.analytics_serving_revisions,
 CHECK(from_day=date_trunc('month',from_day)::date AND through_day=(date_trunc('month',through_day)+interval '1 month - 1 day')::date AND from_day<=through_day)
);
ALTER TABLE mart.prepared_reporting_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.prepared_reporting_windows FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.prepared_reporting_windows USING(tenant_id=nullif(current_setting('mart.tenant_id',true),'')) WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT ON mart.prepared_reporting_windows TO dabboos_runtime,dabboos_ingestor;
GRANT INSERT ON mart.prepared_reporting_windows TO dabboos_ingestor;
CREATE FUNCTION mart.guard_prepared_reporting_window() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE trusted_revision text; BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Reporting window registration requires read committed isolation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 IF NOT pg_has_role(current_user,'dabboos_ingestor','MEMBER') OR NEW.tenant_id IS DISTINCT FROM nullif(current_setting('mart.tenant_id',true),'') THEN RAISE EXCEPTION 'Protected tenant preparation identity required'; END IF;
 SELECT revision_id INTO trusted_revision FROM mart.analytics_trusted_serving WHERE tenant_id=NEW.tenant_id FOR UPDATE;
 IF NEW.registration_revision IS DISTINCT FROM trusted_revision THEN RAISE EXCEPTION 'Prepared input publication changed'; END IF;
 IF EXISTS(SELECT 1 FROM mart.prepared_activation WHERE tenant_id=NEW.tenant_id)
 OR EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=NEW.tenant_id) THEN
  RAISE EXCEPTION 'Prepared reporting window must precede all sealed serving';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_reporting_window_guard BEFORE INSERT ON mart.prepared_reporting_windows FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_reporting_window();
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.prepared_reporting_windows FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
REVOKE ALL ON FUNCTION mart.guard_prepared_reporting_window() FROM PUBLIC;

-- Coverage discovery consumes accepted manifest/aggregate metadata, never raw envelopes.
CREATE FUNCTION mart.prepared_manifest_chunks(selected_tenant text,selected_revision text)
RETURNS TABLE(family text,kind text,period date,through date) LANGUAGE sql STABLE AS $$
 WITH members AS MATERIALIZED (
  SELECT member.family,member.month,member.partition_id,part.capabilities,
   CASE WHEN member.family='facts' THEN baseline.specification ELSE jsonb_build_array(extraction.mapping) END mappings
  FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  JOIN mart.analytics_baselines baseline USING(tenant_id) LEFT JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
 ),events AS (
  SELECT DISTINCT family,'event'::text kind,month period,(month+interval '1 month - 1 day')::date through
  FROM members WHERE family<>'receivables' AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='event')
 ),fact_cutoffs AS MATERIALIZED (
  SELECT DISTINCT member.month,base.business_date
  FROM members member JOIN mart.analytics_aggregate_bases base ON base.tenant_id=selected_tenant AND base.partition_id=member.partition_id
  WHERE member.family='facts' AND base.kind='snapshot'
 ),snapshots AS (
  SELECT 'facts'::text family,'snapshot'::text kind,business_date period,business_date through FROM fact_cutoffs
  UNION SELECT sources.family,'snapshot',observation.business_day,observation.business_day
  FROM (SELECT DISTINCT family FROM members WHERE family<>'facts') sources
  CROSS JOIN LATERAL mart.prepared_snapshot_observations(selected_tenant,selected_revision,sources.family) observation
 ),empty_facts AS (
  SELECT member.family,'snapshot'::text kind,cutoff.through period,cutoff.through
  FROM members member CROSS JOIN LATERAL (
   SELECT least((member.month+interval '1 month - 1 day')::date,max((release->'period'->>'to')::date)) through
   FROM jsonb_array_elements(member.capabilities->'releases') release
  ) cutoff
  WHERE member.family='facts' AND cutoff.through>=member.month AND EXISTS(
   SELECT 1 FROM jsonb_array_elements(member.mappings) mapping,jsonb_array_elements(mapping->'measures') rule
   JOIN mart.measure_definitions definition ON definition.measure_id=rule->>'measureId' WHERE definition.kind='snapshot')
  AND NOT EXISTS(SELECT 1 FROM fact_cutoffs WHERE month=member.month)
 ) SELECT * FROM events UNION SELECT * FROM snapshots UNION SELECT * FROM empty_facts
$$;

REVOKE ALL ON FUNCTION mart.prepared_manifest_chunks(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_manifest_chunks(text,text) TO dabboos_ingestor;

CREATE OR REPLACE FUNCTION mart.prepared_required_chunks(selected_tenant text,selected_revision text)
RETURNS TABLE(family text,kind text,period date,through date) LANGUAGE sql STABLE AS $$
 WITH original AS MATERIALIZED (SELECT * FROM mart.prepared_manifest_chunks(selected_tenant,selected_revision)),
 reporting_window AS (SELECT from_day,through_day FROM mart.prepared_reporting_windows WHERE tenant_id=selected_tenant),
 regular AS (
  SELECT * FROM original WHERE NOT EXISTS(SELECT 1 FROM reporting_window)
  OR period BETWEEN (SELECT from_day FROM reporting_window) AND (SELECT through_day FROM reporting_window)
 ),opening_anchors AS (
  SELECT DISTINCT ON(family) original.* FROM original,reporting_window
  WHERE original.kind='snapshot' AND original.through<reporting_window.from_day
  ORDER BY family,original.through DESC
 ) SELECT * FROM regular UNION SELECT * FROM opening_anchors
$$;
REVOKE ALL ON FUNCTION mart.prepared_required_chunks(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_required_chunks(text,text) TO dabboos_ingestor;
