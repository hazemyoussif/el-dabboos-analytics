-- Runtime may read only accepted review/Business roots and the immutable raw
-- ancestors required by those roots. Evaluate the uncorrelated policy subquery
-- once per statement rather than resolving lineage separately for every fact.
CREATE FUNCTION mart.runtime_review_partitions() RETURNS TABLE(partition_id text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,mart SET row_security=on AS $$
 WITH RECURSIVE visible(partition_id) AS (
  SELECT member.partition_id FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  WHERE trusted.tenant_id=nullif(current_setting('mart.tenant_id',true),'')
  AND member.family IN('review','business')
  UNION
  SELECT origin.base_partition FROM visible
  JOIN mart.business_delta_storage sparse ON sparse.tenant_id=nullif(current_setting('mart.tenant_id',true),'')
   AND sparse.partition_id=visible.partition_id
  JOIN mart.business_delta_origins origin ON origin.tenant_id=sparse.tenant_id AND origin.partition_id=sparse.partition_id
 ) SELECT partition_id FROM visible
$$;
REVOKE ALL ON FUNCTION mart.runtime_review_partitions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.runtime_review_partitions() TO dabboos_runtime;
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['review_extractions','review_facts','review_controls',
  'business_delta_origins','business_delta_replacements','business_delta_storage',
  'business_delta_checked_roots','business_delta_source_evidence','business_recipe_observations','business_recipe_checks'] LOOP
  EXECUTE format('CREATE POLICY accepted_review_only ON mart.%I AS RESTRICTIVE FOR SELECT TO dabboos_runtime USING(partition_id IN(SELECT partition_id FROM mart.runtime_review_partitions()))',relation_name);
 END LOOP;
END $$;
