-- Runtime aggregate RLS checks trusted partition membership by tenant/partition.
-- Foreign keys do not create an index on the referencing columns, so keep this
-- exact lookup selective as immutable serving revisions accumulate.
CREATE INDEX analytics_serving_members_partition_lookup
 ON mart.analytics_serving_members(tenant_id,partition_id);
