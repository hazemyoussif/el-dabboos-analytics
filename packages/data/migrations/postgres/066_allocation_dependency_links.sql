-- Retain source-observed allocation edges for later correction/deletion impact.
-- No source read, inferred historical edges or prepared-data rebuild.
ALTER TABLE mart.analytics_receivable_dependencies
 ADD COLUMN allocation_links jsonb,
 ADD COLUMN allocation_links_cutoff timestamptz,
 ADD CONSTRAINT allocation_dependency_links_shape CHECK (
  (allocation_links IS NULL AND allocation_links_cutoff IS NULL) OR (
   source_object='account_partial_reconcile'
   AND allocation_links_cutoff IS NOT NULL AND allocation_links_cutoff<=cutoff
   AND jsonb_typeof(allocation_links)='object'
   AND allocation_links->>'debitLineId' ~ '^[1-9][0-9]*$'
   AND allocation_links->>'creditLineId' ~ '^[1-9][0-9]*$'
   AND allocation_links->>'debitMoveId' ~ '^[1-9][0-9]*$'
   AND allocation_links->>'creditMoveId' ~ '^[1-9][0-9]*$'
  ) IS TRUE
 );
GRANT UPDATE(allocation_links,allocation_links_cutoff) ON mart.analytics_receivable_dependencies TO dabboos_ingestor;
