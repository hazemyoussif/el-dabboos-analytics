-- A sealed Command recipe extends an already accepted Command mapping as well
-- as the original Business mapping. Existing rules and capabilities must remain
-- identical; source identity, definition, parent and cutoff checks still apply.
CREATE OR REPLACE FUNCTION mart.guard_business_delta_origin() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 IF NOT EXISTS(
  SELECT 1 FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions previous ON previous.tenant_id=member.tenant_id AND previous.partition_id=member.partition_id
  JOIN mart.review_extractions next ON next.tenant_id=previous.tenant_id AND next.partition_id=NEW.partition_id
  JOIN mart.analytics_partitions part ON part.tenant_id=next.tenant_id AND part.partition_id=next.partition_id
  WHERE trusted.tenant_id=NEW.tenant_id AND trusted.revision_id=NEW.parent_revision
  AND member.partition_id=NEW.base_partition AND member.family='business' AND part.family='business'
  AND previous.completed AND next.completed AND previous.month=next.month AND part.month=next.month
  AND previous.source_id=next.source_id AND previous.currency=next.currency
  AND (previous.mapping=next.mapping OR (
   (previous.mapping->>'mappingId'='business-purpose-v1' AND previous.mapping->>'mappingVersion'='1'
    OR previous.mapping->>'mappingId'='business-purpose-v1-sales-command'
     AND previous.mapping->>'mappingVersion'=next.mapping->>'mappingVersion')
   AND next.mapping->>'mappingId'='business-purpose-v1-sales-command'
   AND previous.mapping->>'tenantId'=next.mapping->>'tenantId' AND previous.mapping->>'sourceId'=next.mapping->>'sourceId'
   AND previous.mapping->>'datasetId'=next.mapping->>'datasetId' AND previous.mapping->>'reportingCurrency'=next.mapping->>'reportingCurrency'
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(previous.mapping->'measures') rule
    WHERE NOT next.mapping->'measures' @> jsonb_build_array(rule))
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(previous.mapping->'capabilities') capability
    WHERE NOT next.mapping->'capabilities' @> jsonb_build_array(capability))
  )) AND previous.definition_version=next.definition_version
  AND previous.source_cutoff<next.source_cutoff
 ) THEN RAISE EXCEPTION 'Business delta requires the current compatible accepted partition'; END IF;
 RETURN NEW;
END $$;
