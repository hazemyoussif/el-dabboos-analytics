-- Reuse the tenant/partition membership index already installed by migration 038.
-- Keep all released migration bytes and all existing serving contents unchanged.

-- First membership proves the complete exact extraction and freezes its contents.
-- Later manifests may carry that same tenant/family/month/partition without rescanning it.
-- The existing serving-member guard still enforces partition identity and immutable revisions;
-- trusted promotion still independently validates every changed review/business partition.
CREATE OR REPLACE FUNCTION mart.guard_review_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family='review' THEN
  IF EXISTS(SELECT 1 FROM mart.analytics_serving_members prior
   WHERE prior.tenant_id=NEW.tenant_id AND prior.partition_id=NEW.partition_id
    AND prior.family=NEW.family AND prior.month=NEW.month) THEN RETURN NEW; END IF;
  IF NOT mart.review_partition_exact(NEW.tenant_id,NEW.partition_id)
  THEN RAISE EXCEPTION 'Incomplete or mismatched review extraction'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION mart.guard_business_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family='business' THEN
  IF EXISTS(SELECT 1 FROM mart.analytics_serving_members prior
   WHERE prior.tenant_id=NEW.tenant_id AND prior.partition_id=NEW.partition_id
    AND prior.family=NEW.family AND prior.month=NEW.month) THEN RETURN NEW; END IF;
  IF NOT mart.business_partition_exact(NEW.tenant_id,NEW.partition_id)
  THEN RAISE EXCEPTION 'Incomplete or mismatched business extraction'; END IF;
 END IF;
 RETURN NEW;
END $$;
