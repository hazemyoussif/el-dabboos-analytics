SET LOCAL search_path=control,pg_catalog;
ALTER TABLE source_mappings ADD CONSTRAINT mapping_evidence_reference CHECK(evidence_ref IS NULL OR evidence_ref ~ '^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,199}$');
CREATE TABLE source_mapping_lifecycle_events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mapping_id text NOT NULL,version integer NOT NULL,previous_status text,new_status text NOT NULL,
 evidence_ref text,database_actor text NOT NULL,occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(mapping_id,version) REFERENCES source_mappings(mapping_id,version)
);
CREATE FUNCTION record_mapping_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=control,pg_catalog AS $$
BEGIN
 INSERT INTO source_mapping_lifecycle_events(mapping_id,version,previous_status,new_status,evidence_ref,database_actor)
 VALUES (NEW.mapping_id,NEW.version,CASE WHEN TG_OP='UPDATE' THEN OLD.lifecycle_status ELSE NULL END,NEW.lifecycle_status,NEW.evidence_ref,session_user);
 RETURN NEW;
END $$;
CREATE TRIGGER mapping_lifecycle_audit AFTER INSERT OR UPDATE ON source_mappings FOR EACH ROW EXECUTE FUNCTION record_mapping_lifecycle();
CREATE TRIGGER mapping_lifecycle_immutable BEFORE UPDATE OR DELETE ON source_mapping_lifecycle_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
REVOKE ALL ON FUNCTION record_mapping_lifecycle() FROM PUBLIC;
-- App creates drafts only; approval/publication have no app UPDATE privilege.
GRANT SELECT ON source_mapping_lifecycle_events TO control_app;
