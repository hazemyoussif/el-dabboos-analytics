ALTER TABLE mart.ingestion_batches
  ADD COLUMN request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  ADD COLUMN source_objects text[] NOT NULL CHECK (cardinality(source_objects) > 0),
  ADD COLUMN request_limit integer NOT NULL CHECK (request_limit BETWEEN 1 AND 1000),
  ADD COLUMN completeness text NOT NULL CHECK (completeness IN ('incremental','complete_scope')),
  ADD COLUMN deletion_evidence text NOT NULL CHECK (deletion_evidence IN ('explicit','complete_scope_diff','unavailable')),
  ADD COLUMN pagination_complete boolean NOT NULL,
  ADD COLUMN cursor_start text,
  ADD CONSTRAINT batch_publication_complete CHECK (status <> 'committed' OR pagination_complete);
-- Approval and mapping content are immutable releases. Withdraw serving by removing its binding.
CREATE FUNCTION mart.refuse_mapping_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Mapping releases are immutable'; END $$;
CREATE TRIGGER mapping_immutable BEFORE UPDATE OR DELETE ON mart.mapping_releases
FOR EACH ROW EXECUTE FUNCTION mart.refuse_mapping_mutation();
REVOKE ALL ON FUNCTION mart.refuse_mapping_mutation() FROM PUBLIC;
