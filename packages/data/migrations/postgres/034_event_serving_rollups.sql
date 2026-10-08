-- Daily full-dimensional bases already exist in analytics_aggregate_bases.
-- Rollups attach to their immutable partition, inheriting the trusted manifest lineage.
CREATE TABLE mart.analytics_monthly_bases (
 tenant_id text NOT NULL,partition_id text NOT NULL,measure_id text NOT NULL,
 dimensions jsonb NOT NULL,value numeric(30,6) NOT NULL,fact_count bigint NOT NULL CHECK(fact_count>0),
 data_through date NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,measure_id,dimensions),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions
);
CREATE TABLE mart.analytics_aggregate_proofs (
 tenant_id text NOT NULL,partition_id text NOT NULL,definition_version text NOT NULL,
 mapping_version text NOT NULL,business_timezone text NOT NULL,
 daily_rows bigint NOT NULL,monthly_rows bigint NOT NULL,
 reconciled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,partition_id),FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['analytics_monthly_bases','analytics_aggregate_proofs'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('GRANT SELECT ON mart.%I TO dabboos_runtime',relation_name);
  EXECUTE format('CREATE POLICY trusted_only ON mart.%I AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=%I.tenant_id AND member.partition_id=%I.partition_id))',relation_name,relation_name,relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.guard_aggregate_proof() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE baseline mart.analytics_baselines; partition_month date;
BEGIN
 SELECT * INTO baseline FROM mart.analytics_baselines WHERE tenant_id=NEW.tenant_id;
 SELECT month INTO partition_month FROM mart.analytics_partitions WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id;
 IF NEW.definition_version IS DISTINCT FROM baseline.definition_version
 OR NEW.mapping_version IS DISTINCT FROM baseline.mapping_version
 OR NEW.business_timezone IS DISTINCT FROM (baseline.specification->0->'measures'->0->>'timeZone') THEN
  RAISE EXCEPTION 'Aggregate semantic lineage mismatch';
 END IF;
 IF EXISTS(
  WITH canonical AS (
   SELECT payload->>'measureId' measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,
    sum((payload->>'value')::numeric) value,count(*) fact_count
   FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
   WHERE head.tenant_id=NEW.tenant_id AND head.business_month=to_char(partition_month,'YYYY-MM') AND head.status='active' AND payload->>'kind'='event'
   GROUP BY 1,2,3
  ), daily AS (
   SELECT measure_id,business_date,dimensions,value,fact_count FROM mart.analytics_aggregate_bases
   WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event'
  ) SELECT * FROM ((SELECT * FROM canonical EXCEPT SELECT * FROM daily) UNION ALL (SELECT * FROM daily EXCEPT SELECT * FROM canonical)) delta
 ) THEN RAISE EXCEPTION 'Daily aggregate differs from canonical events'; END IF;
 IF EXISTS(
  WITH daily AS (
   SELECT measure_id,dimensions,sum(value) value,sum(fact_count)::bigint fact_count,max(business_date) data_through
   FROM mart.analytics_aggregate_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event' GROUP BY 1,2
  ), monthly AS (
   SELECT measure_id,dimensions,value,fact_count,data_through FROM mart.analytics_monthly_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id
  ) SELECT * FROM ((SELECT * FROM daily EXCEPT SELECT * FROM monthly) UNION ALL (SELECT * FROM monthly EXCEPT SELECT * FROM daily)) delta
 ) THEN RAISE EXCEPTION 'Monthly aggregate differs from daily events'; END IF;
 IF NEW.daily_rows<>(SELECT count(*) FROM mart.analytics_aggregate_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id AND kind='event')
 OR NEW.monthly_rows<>(SELECT count(*) FROM mart.analytics_monthly_bases WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) THEN
  RAISE EXCEPTION 'Aggregate proof row count mismatch';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aggregate_proof_guard BEFORE INSERT ON mart.analytics_aggregate_proofs FOR EACH ROW EXECUTE FUNCTION mart.guard_aggregate_proof();
CREATE FUNCTION mart.guard_aggregate_append() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_aggregate_proofs WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) THEN RAISE EXCEPTION 'Reconciled aggregate partition is frozen'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER daily_aggregate_freeze BEFORE INSERT ON mart.analytics_aggregate_bases FOR EACH ROW EXECUTE FUNCTION mart.guard_aggregate_append();
CREATE TRIGGER monthly_aggregate_freeze BEFORE INSERT ON mart.analytics_monthly_bases FOR EACH ROW EXECUTE FUNCTION mart.guard_aggregate_append();
CREATE FUNCTION mart.guard_event_aggregate_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_revisions revision JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  WHERE revision.tenant_id=NEW.tenant_id AND revision.revision_id=NEW.revision_id AND member.month=ANY(revision.affected_months)
  AND NOT EXISTS(SELECT 1 FROM mart.analytics_aggregate_proofs proof WHERE proof.tenant_id=member.tenant_id AND proof.partition_id=member.partition_id)) THEN
  RAISE EXCEPTION 'Promotion requires reconciled daily and monthly aggregates';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER event_aggregate_promotion AFTER INSERT OR UPDATE ON mart.analytics_trusted_serving DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION mart.guard_event_aggregate_promotion();
REVOKE ALL ON FUNCTION mart.guard_aggregate_proof(),mart.guard_aggregate_append(),mart.guard_event_aggregate_promotion() FROM PUBLIC;
