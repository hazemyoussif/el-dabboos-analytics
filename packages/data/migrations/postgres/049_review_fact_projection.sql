-- Typed access to immutable source operands. Generated values cannot drift from payloads.
-- No source extraction, fact identity, published membership or review status changes.
ALTER TABLE mart.review_facts
 ADD COLUMN measure_id text GENERATED ALWAYS AS (payload->>'measureId') STORED,
 ADD COLUMN business_day text GENERATED ALWAYS AS (payload->>'businessDate') STORED,
 ADD COLUMN amount numeric GENERATED ALWAYS AS ((payload->>'value')::numeric) STORED,
 ADD COLUMN dimensions jsonb GENERATED ALWAYS AS (payload->'dimensions') STORED,
 ADD COLUMN display_labels jsonb GENERATED ALWAYS AS (payload->'displayLabels') STORED,
 ADD COLUMN entity_id text GENERATED ALWAYS AS (payload->>'entityId') STORED;

CREATE INDEX review_facts_typed_access ON mart.review_facts(tenant_id,partition_id,measure_id,business_day);
ANALYZE mart.review_facts;
