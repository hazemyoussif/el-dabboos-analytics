-- Bound the history read to validated snapshot identities. No source envelopes or labels
-- are copied into this index; published facts, serving membership and policies stay unchanged.
CREATE INDEX review_facts_snapshot_identity
 ON mart.review_facts(tenant_id,measure_id,entity_id,business_day DESC,partition_id)
 WHERE entity_id IS NOT NULL;
ANALYZE mart.review_facts;
