-- Immutable fact membership makes the published partition the authority, never mutable heads.
CREATE TABLE mart.analytics_partition_facts (
 tenant_id text NOT NULL,partition_id text NOT NULL,fact_key text NOT NULL,revision_id text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,fact_key),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions,
 FOREIGN KEY(tenant_id,fact_key,revision_id) REFERENCES mart.analytics_fact_revisions
);
ALTER TABLE mart.analytics_partition_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_partition_facts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_partition_facts
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE POLICY trusted_only ON mart.analytics_partition_facts AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_partition_facts.tenant_id AND member.partition_id=analytics_partition_facts.partition_id));
GRANT SELECT,INSERT ON mart.analytics_partition_facts TO dabboos_ingestor;
GRANT SELECT ON mart.analytics_partition_facts,mart.analytics_fact_revisions TO dabboos_runtime;
CREATE POLICY trusted_only ON mart.analytics_fact_revisions AS RESTRICTIVE FOR SELECT TO dabboos_runtime
 USING(EXISTS(SELECT 1 FROM mart.analytics_partition_facts link WHERE link.tenant_id=analytics_fact_revisions.tenant_id AND link.fact_key=analytics_fact_revisions.fact_key AND link.revision_id=analytics_fact_revisions.revision_id));
CREATE FUNCTION mart.drill_partition_exact(selected_tenant text,selected_partition text) RETURNS boolean LANGUAGE sql AS $$
 WITH facts AS (
 SELECT payload->>'measureId' measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,
 sum((payload->>'value')::numeric) value,count(*) fact_count
 FROM mart.analytics_partition_facts link JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE link.tenant_id=selected_tenant AND link.partition_id=selected_partition AND payload->>'status'='active'
 GROUP BY 1,2,3)
 SELECT NOT EXISTS(SELECT 1 FROM facts FULL JOIN
 (SELECT * FROM mart.analytics_aggregate_bases WHERE tenant_id=selected_tenant AND partition_id=selected_partition) base
 USING(measure_id,business_date,dimensions)
 WHERE facts.value IS DISTINCT FROM base.value OR facts.fact_count IS DISTINCT FROM base.fact_count)
$$;
CREATE TABLE mart.analytics_drill_partitions (
 tenant_id text NOT NULL,partition_id text NOT NULL,
 PRIMARY KEY(tenant_id,partition_id),FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.analytics_partitions
);
ALTER TABLE mart.analytics_drill_partitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_drill_partitions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_drill_partitions USING(tenant_id=nullif(current_setting('mart.tenant_id',true),'')) WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE POLICY trusted_only ON mart.analytics_drill_partitions AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_drill_partitions.tenant_id AND member.partition_id=analytics_drill_partitions.partition_id));
GRANT SELECT,INSERT ON mart.analytics_drill_partitions TO dabboos_ingestor;
GRANT SELECT ON mart.analytics_drill_partitions TO dabboos_runtime;
-- Existing current partitions can be linked only when current heads reproduce them exactly.
-- Incompatible historical partitions stay unavailable; no guessed revision reconstruction.
ALTER TABLE mart.analytics_partitions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_heads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_revisions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_aggregate_bases NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_partition_facts NO FORCE ROW LEVEL SECURITY;
DO $$ DECLARE selected record; BEGIN
 FOR selected IN SELECT tenant_id,partition_id,month FROM mart.analytics_partitions LOOP
  PERFORM set_config('mart.tenant_id',selected.tenant_id,true);
  INSERT INTO mart.analytics_partition_facts
  SELECT head.tenant_id,selected.partition_id,head.fact_key,head.revision_id FROM mart.analytics_fact_heads head
  WHERE head.tenant_id=selected.tenant_id AND head.business_month=to_char(selected.month,'YYYY-MM') AND head.status='active';
  IF NOT mart.drill_partition_exact(selected.tenant_id,selected.partition_id) THEN
   DELETE FROM mart.analytics_partition_facts WHERE tenant_id=selected.tenant_id AND partition_id=selected.partition_id;
  ELSE
   INSERT INTO mart.analytics_drill_partitions VALUES(selected.tenant_id,selected.partition_id);
  END IF;
 END LOOP;
END $$;
ALTER TABLE mart.analytics_partitions FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_heads FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_aggregate_bases FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_partition_facts FORCE ROW LEVEL SECURITY;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.analytics_partition_facts FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE FUNCTION mart.freeze_drill_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('drill:'||NEW.tenant_id||':'||NEW.partition_id,0));
 IF TG_TABLE_NAME='analytics_partition_facts' AND (EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) OR EXISTS(SELECT 1 FROM mart.analytics_drill_partitions WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id)) THEN
  RAISE EXCEPTION 'Published drill membership is immutable';
 END IF;
 IF TG_TABLE_NAME='analytics_drill_partitions' AND NOT mart.drill_partition_exact(NEW.tenant_id,NEW.partition_id) THEN
  RAISE EXCEPTION 'Exact drill partition evidence required';
 END IF;
 IF TG_TABLE_NAME='analytics_serving_members' AND NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) AND NOT mart.drill_partition_exact(NEW.tenant_id,NEW.partition_id) THEN
  RAISE EXCEPTION 'Exact canonical partition membership required';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER drill_membership_lock BEFORE INSERT ON mart.analytics_partition_facts FOR EACH ROW EXECUTE FUNCTION mart.freeze_drill_membership();
CREATE TRIGGER drill_membership_lock BEFORE INSERT ON mart.analytics_serving_members FOR EACH ROW EXECUTE FUNCTION mart.freeze_drill_membership();
REVOKE ALL ON FUNCTION mart.freeze_drill_membership(),mart.drill_partition_exact(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.drill_partition_exact(text,text) TO dabboos_runtime,dabboos_ingestor;

CREATE TRIGGER drill_membership_lock BEFORE INSERT ON mart.analytics_drill_partitions FOR EACH ROW EXECUTE FUNCTION mart.freeze_drill_membership();
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.analytics_drill_partitions FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
