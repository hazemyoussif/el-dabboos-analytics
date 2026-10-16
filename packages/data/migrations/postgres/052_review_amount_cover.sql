-- Keep scalar event amounts covered while ordered snapshot identity access remains
-- on review_facts_snapshot_identity. Covering entity_id in the unordered date
-- index allowed a large snapshot history sort. No source heap or serving data changes.
CREATE INDEX review_facts_amount_cover
 ON mart.review_facts(tenant_id,partition_id,measure_id,business_day) INCLUDE(amount);
DROP INDEX mart.review_facts_typed_access;
ALTER INDEX mart.review_facts_amount_cover RENAME TO review_facts_typed_access;
