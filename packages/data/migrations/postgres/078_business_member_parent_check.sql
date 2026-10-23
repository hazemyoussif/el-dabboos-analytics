-- A second private membership must not bypass the accepted Business base check.
-- Carrying the exact parent's partition remains valid; a replacement must still
-- derive from that parent's exact accepted Business partition for the month.
-- The immutable origin guard, recipe exactness and trusted-promotion CAS remain.
CREATE OR REPLACE FUNCTION mart.guard_business_delta_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family<>'business' THEN RETURN NEW; END IF;
 IF EXISTS(
  SELECT 1 FROM mart.business_delta_origins origin
  JOIN mart.analytics_serving_revisions candidate ON candidate.tenant_id=origin.tenant_id AND candidate.revision_id=NEW.revision_id
  WHERE origin.tenant_id=NEW.tenant_id AND origin.partition_id=NEW.partition_id
  AND NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members parent
   WHERE parent.tenant_id=NEW.tenant_id AND parent.revision_id=candidate.parent_revision
   AND parent.family=NEW.family AND parent.month=NEW.month
   AND parent.partition_id IN(NEW.partition_id,origin.base_partition))
 ) THEN RAISE EXCEPTION 'Business delta publication parent conflict'; END IF;
 RETURN NEW;
END $$;
