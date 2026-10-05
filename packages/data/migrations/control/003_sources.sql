SET LOCAL search_path=control,pg_catalog;
CREATE TABLE source_definitions (
 source_id text PRIMARY KEY CHECK(source_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$'),
 tenant_id text NOT NULL REFERENCES tenants(id),type text NOT NULL CHECK(type='odoo-postgres'),
 connection_ref text NOT NULL CHECK(connection_ref ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$'),enabled boolean NOT NULL,
 UNIQUE(tenant_id,source_id)
);
CREATE TABLE source_company_scopes (
 tenant_id text NOT NULL,source_id text NOT NULL,company_id text NOT NULL CHECK(company_id ~ '^[1-9][0-9]{0,18}$'),
 PRIMARY KEY(source_id,company_id),FOREIGN KEY(tenant_id,source_id) REFERENCES source_definitions(tenant_id,source_id)
);
CREATE TABLE source_mappings (
 mapping_id text NOT NULL,version integer NOT NULL CHECK(version>=1),tenant_id text NOT NULL,source_id text NOT NULL,
 dataset_id text NOT NULL,recipe text NOT NULL CHECK(recipe='odoo-comparison-v1'),business_basis text NOT NULL,
 reporting_currency text NOT NULL CHECK(reporting_currency IN ('IQD','EGP')),business_owner text NOT NULL,
 lifecycle_status text NOT NULL CHECK(lifecycle_status IN ('draft','candidate','reconciled','approved','published')),
 evidence_ref text,PRIMARY KEY(mapping_id,version),FOREIGN KEY(tenant_id,source_id) REFERENCES source_definitions(tenant_id,source_id)
);
CREATE TABLE source_measure_mappings (
 mapping_id text NOT NULL,version integer NOT NULL,canonical_measure text NOT NULL CHECK(canonical_measure IN ('order_revenue','order_count','cancelled_orders','net_invoiced_revenue','invoiced_revenue','refund_value','invoice_count','refund_count')),
 PRIMARY KEY(mapping_id,version,canonical_measure),FOREIGN KEY(mapping_id,version) REFERENCES source_mappings(mapping_id,version)
);
CREATE TABLE source_dimension_mappings (
 mapping_id text NOT NULL,version integer NOT NULL,dimension text NOT NULL CHECK(dimension IN ('customer','salesperson','business_line','city','state')),
 PRIMARY KEY(mapping_id,version,dimension),FOREIGN KEY(mapping_id,version) REFERENCES source_mappings(mapping_id,version)
);
CREATE TRIGGER source_identity BEFORE UPDATE ON source_definitions FOR EACH ROW EXECUTE FUNCTION immutable_columns('source_id','tenant_id','type');
CREATE TRIGGER mapping_definition BEFORE UPDATE ON source_mappings FOR EACH ROW EXECUTE FUNCTION immutable_columns('mapping_id','version','tenant_id','source_id','dataset_id','recipe','business_basis','reporting_currency','business_owner');
CREATE TRIGGER measure_definition BEFORE UPDATE OR DELETE ON source_measure_mappings FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER dimension_definition BEFORE UPDATE OR DELETE ON source_dimension_mappings FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE FUNCTION mapping_lifecycle_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.lifecycle_status<>'draft' OR NEW.evidence_ref IS NOT NULL THEN RAISE EXCEPTION 'mapping must start as draft'; END IF;
 ELSIF NOT ((OLD.lifecycle_status='draft' AND NEW.lifecycle_status='candidate') OR
  (OLD.lifecycle_status='candidate' AND NEW.lifecycle_status='reconciled') OR
  (OLD.lifecycle_status='reconciled' AND NEW.lifecycle_status='approved') OR
  (OLD.lifecycle_status='approved' AND NEW.lifecycle_status='published')) OR
  (NEW.lifecycle_status IN ('reconciled','approved','published') AND (NEW.evidence_ref IS NULL OR length(NEW.evidence_ref)=0)) THEN RAISE EXCEPTION 'invalid mapping lifecycle';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER mapping_lifecycle BEFORE INSERT OR UPDATE ON source_mappings FOR EACH ROW EXECUTE FUNCTION mapping_lifecycle_guard();
REVOKE ALL ON FUNCTION mapping_lifecycle_guard() FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON source_definitions TO control_app;
GRANT SELECT,INSERT,DELETE ON source_company_scopes TO control_app;
GRANT SELECT,INSERT ON source_mappings,source_measure_mappings,source_dimension_mappings TO control_app;
-- Approval/publication are explicit operator responsibilities, never API application privileges.
