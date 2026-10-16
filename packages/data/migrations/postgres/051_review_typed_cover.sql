-- Keep immutable fact envelopes in the heap. Cover narrow history/event reads without
-- retaining a second typed-access index or rewriting facts, controls or serving history.
CREATE INDEX review_facts_typed_cover
 ON mart.review_facts(tenant_id,partition_id,measure_id,business_day)
 INCLUDE (entity_id,amount);
DROP INDEX mart.review_facts_typed_access;
ALTER INDEX mart.review_facts_typed_cover RENAME TO review_facts_typed_access;
ANALYZE mart.review_facts;
