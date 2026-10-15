-- Shared access path for trusted review/business execution and dimension discovery.
-- This changes no fact payload, published membership, currency or source definition.
CREATE INDEX review_facts_measure_date
 ON mart.review_facts(tenant_id,partition_id,(payload->>'measureId'),(payload->>'businessDate'));
