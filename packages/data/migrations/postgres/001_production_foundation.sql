-- Ordered immutable migration. Execute transactionally under MART_MIGRATOR only.
-- Runner owns schema_migrations and checksum verification; see ADR 027.
CREATE SCHEMA mart;
REVOKE ALL ON SCHEMA mart FROM PUBLIC;

CREATE TABLE mart.mapping_releases (
  tenant_id text NOT NULL CHECK (length(btrim(tenant_id)) BETWEEN 1 AND 200),
  dataset_id text NOT NULL,
  source_id text NOT NULL,
  mapping_id text NOT NULL,
  mapping_version text NOT NULL,
  business_basis text NOT NULL,
  reporting_currency text NOT NULL CHECK (reporting_currency ~ '^[A-Z]{3}$'),
  approval_status text NOT NULL CHECK (approval_status IN ('pending','approved')),
  approval_reference text,
  -- Validated SourceMapping, not raw source records. Immutable after approval.
  specification jsonb NOT NULL CHECK (jsonb_typeof(specification) = 'object'),
  PRIMARY KEY (tenant_id, dataset_id),
  UNIQUE (tenant_id, dataset_id, source_id, mapping_id, mapping_version),
  CHECK ((approval_status = 'approved') = (approval_reference IS NOT NULL))
);
CREATE TABLE mart.ingestion_batches (
  tenant_id text NOT NULL,
  batch_id text NOT NULL,
  dataset_id text NOT NULL,
  source_id text NOT NULL,
  mapping_id text NOT NULL,
  mapping_version text NOT NULL,
  company_ids text[] NOT NULL CHECK (cardinality(company_ids) > 0),
  adapter_version text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  source_as_of timestamptz NOT NULL,
  frozen_revision text NOT NULL,
  watermark_start text,
  watermark_end text,
  status text NOT NULL CHECK (status IN ('running','committed','failed')),
  rows_read bigint NOT NULL DEFAULT 0 CHECK (rows_read >= 0),
  rows_accepted bigint NOT NULL DEFAULT 0 CHECK (rows_accepted >= 0),
  rows_rejected bigint NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
  facts_inserted bigint NOT NULL DEFAULT 0 CHECK (facts_inserted >= 0),
  facts_updated bigint NOT NULL DEFAULT 0 CHECK (facts_updated >= 0),
  facts_tombstoned bigint NOT NULL DEFAULT 0 CHECK (facts_tombstoned >= 0),
  facts_replayed bigint NOT NULL DEFAULT 0 CHECK (facts_replayed >= 0),
  PRIMARY KEY (tenant_id, batch_id),
  UNIQUE (tenant_id, dataset_id, batch_id),
  FOREIGN KEY (tenant_id, dataset_id, source_id, mapping_id, mapping_version)
    REFERENCES mart.mapping_releases (tenant_id, dataset_id, source_id, mapping_id, mapping_version),
  CHECK (status <> 'committed' OR (completed_at IS NOT NULL AND rows_read = rows_accepted + rows_rejected)),
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  CHECK (status = 'committed' OR watermark_end IS NULL)
);
-- Catalog input vocabulary materialized by migration, not arbitrary ingestor additions.
CREATE TABLE mart.measure_definitions (
  measure_id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('event','snapshot')),
  monetary boolean NOT NULL,
  UNIQUE (measure_id, kind, monetary)
);
INSERT INTO mart.measure_definitions VALUES
 ('revenue','event',true), ('net_revenue','event',true), ('order_count','event',false),
 ('units_sold','event',false), ('gross_profit','event',true), ('opportunity_count','event',false),
 ('pipeline_value','event',true), ('weighted_pipeline','event',true),
 ('invoiced_amount','event',true), ('collected_amount','event',true),
 ('outstanding_amount','snapshot',true), ('overdue_amount','snapshot',true),
 ('stock_on_hand','snapshot',false), ('inventory_value','snapshot',true), ('low_stock_count','snapshot',false),
 ('maintenance_requests','event',false), ('failure_count','event',false), ('maintenance_cost','event',true),
 ('won_opportunity_count','event',false), ('closed_opportunity_count','event',false),
 ('operating_hours','event',false), ('repair_hours','event',false), ('completed_repair_count','event',false);

-- Immutable revisions enable frozen controls after later corrections.
CREATE TABLE mart.fact_revisions (
  tenant_id text NOT NULL,
  dataset_id text NOT NULL,
  fact_key text NOT NULL, -- productionFactIdentity tuple; writer verifies, never a random ID.
  source_revision numeric(20,0) NOT NULL CHECK (source_revision >= 0),
  source_version text NOT NULL CHECK (length(btrim(source_version)) BETWEEN 1 AND 200),
  source_object text NOT NULL,
  source_record_id text NOT NULL CHECK (length(btrim(source_record_id)) BETWEEN 1 AND 200),
  component_id text NOT NULL,
  measure_id text NOT NULL,
  kind text NOT NULL,
  monetary boolean NOT NULL,
  business_date date NOT NULL,
  entity_id text,
  value numeric(30,6) NOT NULL CHECK (value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
  status text NOT NULL CHECK (status IN ('active','tombstone')),
  customer text, branch text, region text, salesperson text,
  product text, product_category text, warehouse text,
  equipment text, equipment_category text, technician text,
  currency_mode text CHECK (currency_mode IN ('native','converted')),
  transaction_currency text CHECK (transaction_currency ~ '^[A-Z]{3}$'),
  transaction_value numeric(30,6),
  base_currency text CHECK (base_currency ~ '^[A-Z]{3}$'),
  reporting_currency text CHECK (reporting_currency ~ '^[A-Z]{3}$'),
  currency_policy_reference text,
  conversion_rate numeric(24,12),
  rate_date date,
  rate_reference text,
  source_updated_at timestamptz,
  source_as_of timestamptz NOT NULL,
  frozen_revision text NOT NULL,
  batch_id text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, dataset_id, fact_key, source_revision),
  UNIQUE (tenant_id, dataset_id, fact_key, source_version),
  FOREIGN KEY (measure_id, kind, monetary) REFERENCES mart.measure_definitions (measure_id, kind, monetary),
  FOREIGN KEY (tenant_id, dataset_id, batch_id) REFERENCES mart.ingestion_batches (tenant_id, dataset_id, batch_id),
  CHECK (kind <> 'snapshot' OR length(btrim(entity_id)) > 0 AND entity_id IS NOT NULL),
  CHECK (transaction_value IS NULL OR transaction_value NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)),
  CHECK (conversion_rate IS NULL OR (conversion_rate > 0 AND conversion_rate NOT IN ('NaN'::numeric, 'Infinity'::numeric))),
  CHECK (
    (NOT monetary AND currency_mode IS NULL AND transaction_currency IS NULL AND transaction_value IS NULL
      AND base_currency IS NULL AND reporting_currency IS NULL AND currency_policy_reference IS NULL
      AND conversion_rate IS NULL AND rate_date IS NULL AND rate_reference IS NULL)
    OR (monetary AND currency_mode IS NOT NULL AND transaction_currency IS NOT NULL AND transaction_value IS NOT NULL
      AND reporting_currency IS NOT NULL AND currency_policy_reference IS NOT NULL
      AND ((currency_mode = 'native' AND transaction_currency = reporting_currency AND transaction_value = value
        AND conversion_rate IS NULL AND rate_date IS NULL AND rate_reference IS NULL)
      OR (currency_mode = 'converted' AND conversion_rate IS NOT NULL AND rate_date IS NOT NULL AND rate_reference IS NOT NULL)))
  )
);
-- Only the writer changes heads, under a scope lock and the pure transition rules.
CREATE TABLE mart.fact_heads (
  tenant_id text NOT NULL, dataset_id text NOT NULL, fact_key text NOT NULL,
  source_revision numeric(20,0) NOT NULL,
  PRIMARY KEY (tenant_id, dataset_id, fact_key),
  FOREIGN KEY (tenant_id, dataset_id, fact_key, source_revision) REFERENCES mart.fact_revisions
);
-- Snapshot ownership independent of source record identity, including deleted owners.
CREATE TABLE mart.snapshot_owners (
  tenant_id text NOT NULL, dataset_id text NOT NULL, measure_id text NOT NULL,
  entity_id text NOT NULL, effective_date date NOT NULL, fact_key text NOT NULL,
  PRIMARY KEY (tenant_id, dataset_id, measure_id, entity_id, effective_date),
  FOREIGN KEY (tenant_id, dataset_id, fact_key) REFERENCES mart.fact_heads DEFERRABLE INITIALLY DEFERRED
);
-- Every accepted revision/replay links to its batch; sourceAsOf remains extraction lineage.
CREATE TABLE mart.batch_facts (
  tenant_id text NOT NULL, dataset_id text NOT NULL, batch_id text NOT NULL,
  fact_key text NOT NULL, source_revision numeric(20,0) NOT NULL,
  PRIMARY KEY (tenant_id, batch_id, fact_key),
  FOREIGN KEY (tenant_id, dataset_id, batch_id) REFERENCES mart.ingestion_batches (tenant_id, dataset_id, batch_id),
  FOREIGN KEY (tenant_id, dataset_id, fact_key, source_revision) REFERENCES mart.fact_revisions
);
CREATE TABLE mart.data_quality_rejects (
  tenant_id text NOT NULL, batch_id text NOT NULL, reject_id bigint GENERATED ALWAYS AS IDENTITY,
  source_id text NOT NULL,
  safe_record_reference varchar(200) NOT NULL,
  reason text NOT NULL CHECK (reason IN ('invalid_shape','invalid_measure','invalid_date','invalid_numeric','currency','capability','identity_conflict','stale_revision')),
  field text NOT NULL CHECK (field IN ('record','measure','date','value','currency','dimension','identity')),
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, batch_id, reject_id),
  FOREIGN KEY (tenant_id, batch_id) REFERENCES mart.ingestion_batches
);
CREATE TABLE mart.reconciliation_evidence (
  tenant_id text NOT NULL, case_id text NOT NULL, dataset_id text NOT NULL,
  -- Strict ReconciliationCase, safe controls only. Includes explicit tolerance approval.
  specification jsonb NOT NULL CHECK (jsonb_typeof(specification) = 'object'),
  status text NOT NULL CHECK (status IN ('reported','passed','failed')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, case_id),
  UNIQUE (tenant_id, case_id, dataset_id),
  FOREIGN KEY (tenant_id, dataset_id) REFERENCES mart.mapping_releases
);
CREATE TABLE mart.reconciliation_batches (
  tenant_id text NOT NULL, case_id text NOT NULL, dataset_id text NOT NULL, batch_id text NOT NULL,
  PRIMARY KEY (tenant_id, case_id, batch_id),
  FOREIGN KEY (tenant_id, case_id, dataset_id) REFERENCES mart.reconciliation_evidence (tenant_id, case_id, dataset_id),
  FOREIGN KEY (tenant_id, dataset_id, batch_id) REFERENCES mart.ingestion_batches (tenant_id, dataset_id, batch_id)
);
-- Server-controlled binding: one release per tenant, deliberately no source field in AnalyticsQuery.
CREATE TABLE mart.serving_bindings (
  tenant_id text PRIMARY KEY, dataset_id text NOT NULL,
  FOREIGN KEY (tenant_id, dataset_id) REFERENCES mart.mapping_releases
);
CREATE VIEW mart.canonical_facts AS
 SELECT r.* FROM mart.fact_heads h JOIN mart.fact_revisions r USING (tenant_id, dataset_id, fact_key, source_revision)
 JOIN mart.ingestion_batches b ON (b.tenant_id = r.tenant_id AND b.batch_id = r.batch_id)
 WHERE r.status = 'active' AND b.status = 'committed';
CREATE INDEX fact_scope_date ON mart.fact_revisions (tenant_id, dataset_id, measure_id, business_date);
CREATE INDEX fact_branch_date ON mart.fact_revisions (tenant_id, dataset_id, measure_id, branch, business_date) WHERE branch IS NOT NULL;
CREATE INDEX fact_snapshot_cutoff ON mart.fact_revisions (tenant_id, dataset_id, measure_id, entity_id, business_date DESC) WHERE kind = 'snapshot';
CREATE INDEX batch_source_time ON mart.ingestion_batches (tenant_id, source_id, source_as_of DESC);
-- No role creation/passwords here. Provision dedicated NOLOGIN group roles and LOGIN identities
-- separately; exact grants and forced tenant RLS must be applied/tested before deployment (ADR 027).
REVOKE ALL ON ALL TABLES IN SCHEMA mart FROM PUBLIC;
