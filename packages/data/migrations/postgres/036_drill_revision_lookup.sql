-- Runtime revision RLS probes membership by fact/revision, without a partition key.
-- Keep that security predicate indexed as trusted history grows.
CREATE INDEX analytics_partition_facts_revision_lookup
 ON mart.analytics_partition_facts(tenant_id,fact_key,revision_id);
