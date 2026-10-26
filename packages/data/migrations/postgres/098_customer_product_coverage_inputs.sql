-- Extend the canonical row vocabulary without changing historical values or access.
ALTER TABLE mart.fact_revisions ADD COLUMN customer_salesperson text,ADD COLUMN customer_state text,ADD COLUMN customer_tag text,ADD COLUMN coverage_year text;
CREATE OR REPLACE VIEW mart.canonical_facts AS
 SELECT r.* FROM mart.fact_revisions r JOIN (
  SELECT DISTINCT ON (links.tenant_id,links.dataset_id,links.fact_key)
    links.tenant_id,links.dataset_id,links.fact_key,links.source_revision
  FROM mart.batch_facts links JOIN mart.ingestion_batches b USING (tenant_id,dataset_id,batch_id)
  LEFT JOIN mart.extraction_runs run ON run.tenant_id=b.tenant_id AND run.extraction_id=b.extraction_id
  WHERE b.status='committed' AND ((b.extraction_id IS NULL AND b.pagination_complete) OR run.status='complete')
  ORDER BY links.tenant_id,links.dataset_id,links.fact_key,links.source_revision DESC
 ) eligible USING (tenant_id,dataset_id,fact_key,source_revision) WHERE r.status='active';
ALTER VIEW mart.canonical_facts SET (security_invoker=true,security_barrier=true);


-- Governed sparse inputs. Complete zero pairs are prepared, never fabricated as
-- source facts or constructed during dashboard requests.
INSERT INTO mart.measure_definitions VALUES
 ('coverage_forecast_quantity','snapshot',false),
 ('coverage_customer_population','snapshot',false),
 ('coverage_net_quantity','snapshot',false),
 ('coverage_tag_membership','snapshot',false),
 ('coverage_excluded_product_count','snapshot',false);

-- Reuse the controlled private capture/replay lifecycle for the registered
-- coverage recipe. Preserve bounds, exact controls, immutability and RLS.
DO $$ DECLARE constraint_name text; BEGIN
 SELECT conname INTO STRICT constraint_name FROM pg_constraint
 WHERE conrelid='mart.command_capture_candidates'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%source_object%';
 EXECUTE format('ALTER TABLE mart.command_capture_candidates DROP CONSTRAINT %I',constraint_name);
END $$;
ALTER TABLE mart.command_capture_candidates ADD CONSTRAINT registered_recipe_capture_scope
 CHECK(date_trunc('month',month)::date=month AND source_object IN
 ('command_invoice','command_receipt','command_order','command_receivable','command_allocation','business_customer_product_coverage_v1'));
