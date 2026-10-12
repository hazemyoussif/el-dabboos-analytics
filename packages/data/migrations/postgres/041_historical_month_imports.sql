-- Explicit complete-month import checkpoints; never another serving pointer.
CREATE TABLE mart.analytics_historical_imports (
 tenant_id text NOT NULL,month date NOT NULL,datasets text[] NOT NULL,
 approval_reference text NOT NULL,revision_id text NOT NULL,details jsonb NOT NULL,
 PRIMARY KEY(tenant_id,month),
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions,
 CHECK(month=date_trunc('month',month)::date AND cardinality(datasets) BETWEEN 1 AND 2 AND length(btrim(approval_reference))>0)
);
ALTER TABLE mart.analytics_historical_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_historical_imports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.analytics_historical_imports
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.analytics_historical_imports
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
GRANT SELECT ON mart.analytics_historical_imports TO dabboos_runtime,dabboos_ingestor;

CREATE FUNCTION mart.inherit_covered_capabilities() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 -- The prior partition may carry narrower historical dimensions than the baseline.
 IF NEW.family='facts' AND NOT pg_has_role(current_user,'dabboos_migrator','MEMBER') THEN
  SELECT coalesce((SELECT part.capabilities FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
  WHERE trusted.tenant_id=NEW.tenant_id AND member.family='facts' AND member.month=NEW.month),NEW.capabilities) INTO NEW.capabilities;

 END IF;
 RETURN NEW;
END $$;
-- Runs after snapshot_partition_guard (alphabetical trigger ordering).
CREATE TRIGGER zz_inherit_covered_capabilities BEFORE INSERT ON mart.analytics_partitions
 FOR EACH ROW EXECUTE FUNCTION mart.inherit_covered_capabilities();
REVOKE ALL ON FUNCTION mart.inherit_covered_capabilities() FROM PUBLIC;
