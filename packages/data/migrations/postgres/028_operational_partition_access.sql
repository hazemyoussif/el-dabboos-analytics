-- Measured 5,000 current-head probes for a 100-fact month. Typed head scope lets RLS
-- retain leakproof scalar predicates and gives reconciliation a selective access path.
ALTER TABLE mart.analytics_fact_heads ADD COLUMN business_month text,ADD COLUMN measure_id text,ADD COLUMN status text,ADD COLUMN source_object text;
UPDATE mart.analytics_fact_heads head SET business_month=left(revision.payload->>'businessDate',7),measure_id=revision.payload->>'measureId',status=revision.payload->>'status',source_object=revision.payload->>'sourceObject'
 FROM mart.analytics_fact_revisions revision WHERE (head.tenant_id,head.fact_key,head.revision_id)=(revision.tenant_id,revision.fact_key,revision.revision_id);
ALTER TABLE mart.analytics_fact_heads ALTER COLUMN business_month SET NOT NULL,ALTER COLUMN measure_id SET NOT NULL,ALTER COLUMN status SET NOT NULL,ALTER COLUMN source_object SET NOT NULL;
CREATE FUNCTION mart.project_operational_head() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE fact jsonb; BEGIN
 SELECT payload INTO fact FROM mart.analytics_fact_revisions WHERE tenant_id=NEW.tenant_id AND fact_key=NEW.fact_key AND revision_id=NEW.revision_id;
 IF fact IS NULL THEN RAISE EXCEPTION 'Exact operational revision required'; END IF;
 NEW.business_month=left(fact->>'businessDate',7);NEW.measure_id=fact->>'measureId';NEW.status=fact->>'status';NEW.source_object=fact->>'sourceObject';RETURN NEW;
END $$;
CREATE TRIGGER operational_head_projection BEFORE INSERT OR UPDATE ON mart.analytics_fact_heads FOR EACH ROW EXECUTE FUNCTION mart.project_operational_head();
CREATE INDEX analytics_current_partition ON mart.analytics_fact_heads(tenant_id,business_month,measure_id,status) INCLUDE(fact_key,revision_id);
-- Runtime sees only published aggregate partitions, even when issued direct SQL.
CREATE POLICY trusted_only ON mart.analytics_serving_members AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted WHERE trusted.tenant_id=analytics_serving_members.tenant_id AND trusted.revision_id=analytics_serving_members.revision_id));
CREATE POLICY trusted_only ON mart.analytics_serving_revisions AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted WHERE trusted.tenant_id=analytics_serving_revisions.tenant_id AND trusted.revision_id=analytics_serving_revisions.revision_id));
CREATE POLICY trusted_only ON mart.analytics_partitions AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_partitions.tenant_id AND member.partition_id=analytics_partitions.partition_id));
CREATE POLICY trusted_only ON mart.analytics_aggregate_bases AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=analytics_aggregate_bases.tenant_id AND member.partition_id=analytics_aggregate_bases.partition_id));
REVOKE ALL ON FUNCTION mart.project_operational_head() FROM PUBLIC;
