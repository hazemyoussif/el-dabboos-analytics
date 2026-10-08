-- Generated projections remain owned by the immutable canonical payload.
-- Ordinary indexed columns let PostgreSQL constrain revisions before RLS probes;
-- every returned revision still passes the existing forced tenant/trusted policies.
ALTER TABLE mart.analytics_fact_revisions
 ADD COLUMN measure_id text GENERATED ALWAYS AS (payload->>'measureId') STORED,
 ADD COLUMN business_date text GENERATED ALWAYS AS (payload->>'businessDate') STORED;
CREATE INDEX analytics_fact_revisions_drill_range
 ON mart.analytics_fact_revisions(tenant_id,measure_id,business_date,fact_key,revision_id);
