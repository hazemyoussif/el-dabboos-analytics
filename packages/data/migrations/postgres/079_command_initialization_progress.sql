-- Append-only private replay checkpoints. Existing canonical exactness, prepared
-- binding/seal and trusted-promotion guards still authorize every publication.
CREATE TABLE mart.command_initializations (
 tenant_id text NOT NULL,candidate_id text NOT NULL,partition_id text NOT NULL,revision_id text NOT NULL,parent_revision text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),UNIQUE(tenant_id,partition_id),UNIQUE(tenant_id,revision_id),
 FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_seals,
 FOREIGN KEY(tenant_id,parent_revision) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.command_initialization_pages (
 tenant_id text NOT NULL,candidate_id text NOT NULL,kind text NOT NULL CHECK(kind IN('facts','controls','baseline_controls')),page integer NOT NULL CHECK(page>=0),
 PRIMARY KEY(tenant_id,candidate_id,kind,page),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_initializations
);
CREATE TABLE mart.command_initialization_publications (
 tenant_id text NOT NULL,candidate_id text NOT NULL,revision_id text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_initializations,
 FOREIGN KEY(tenant_id,revision_id) REFERENCES mart.analytics_serving_revisions
);
CREATE TABLE mart.command_initialization_conflicts (
 tenant_id text NOT NULL,candidate_id text NOT NULL,
 PRIMARY KEY(tenant_id,candidate_id),FOREIGN KEY(tenant_id,candidate_id) REFERENCES mart.command_capture_seals
);
DO $$ DECLARE relation_name text; BEGIN
 FOREACH relation_name IN ARRAY ARRAY['command_initializations','command_initialization_pages','command_initialization_publications','command_initialization_conflicts'] LOOP
  EXECUTE format('ALTER TABLE mart.%I ENABLE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('ALTER TABLE mart.%I FORCE ROW LEVEL SECURITY',relation_name);
  EXECUTE format('CREATE POLICY tenant_scope ON mart.%I USING(tenant_id=nullif(current_setting(''mart.tenant_id'',true),'''')) WITH CHECK(tenant_id=nullif(current_setting(''mart.tenant_id'',true),''''))',relation_name);
  EXECUTE format('GRANT SELECT,INSERT ON mart.%I TO dabboos_ingestor',relation_name);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.%I FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation()',relation_name);
 END LOOP;
END $$;
CREATE FUNCTION mart.guard_command_initialization_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.command_initializations work
  JOIN mart.command_capture_candidates capture USING(tenant_id,candidate_id)
  JOIN mart.analytics_trusted_serving trusted ON trusted.tenant_id=work.tenant_id AND trusted.revision_id=NEW.revision_id
  JOIN mart.analytics_serving_members member ON member.tenant_id=trusted.tenant_id AND member.revision_id=trusted.revision_id
  WHERE work.tenant_id=NEW.tenant_id AND work.candidate_id=NEW.candidate_id
  AND member.family='business' AND member.month=capture.month AND member.partition_id=work.partition_id)
 THEN RAISE EXCEPTION 'Command initialization requires accepted publication'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER command_initialization_publication_guard BEFORE INSERT ON mart.command_initialization_publications
 FOR EACH ROW EXECUTE FUNCTION mart.guard_command_initialization_publication();
REVOKE ALL ON FUNCTION mart.guard_command_initialization_publication() FROM PUBLIC;
