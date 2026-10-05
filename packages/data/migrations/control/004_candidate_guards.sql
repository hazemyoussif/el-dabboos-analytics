SET LOCAL search_path=control,pg_catalog;
CREATE FUNCTION mapping_child_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=control,pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM source_mappings WHERE mapping_id=NEW.mapping_id AND version=NEW.version AND lifecycle_status='draft') THEN RAISE EXCEPTION 'mapping configuration frozen'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER measure_candidate_guard BEFORE INSERT ON source_measure_mappings FOR EACH ROW EXECUTE FUNCTION mapping_child_guard();
CREATE TRIGGER dimension_candidate_guard BEFORE INSERT ON source_dimension_mappings FOR EACH ROW EXECUTE FUNCTION mapping_child_guard();
REVOKE ALL ON FUNCTION mapping_child_guard() FROM PUBLIC;
