-- Presence previously loaded 178k fact payloads and repeatedly checked identities.
-- Measured first page: 210ms / 8,722 buffer hits. Page distinct governed IDs instead.
ALTER TABLE mart.analytics_fact_heads ADD COLUMN source_record_id text;
-- Migration owner backfills scalar projections across tenants atomically; both
-- FORCE settings are restored before the migration transaction becomes visible.
ALTER TABLE mart.analytics_fact_heads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_revisions NO FORCE ROW LEVEL SECURITY;
UPDATE mart.analytics_fact_heads head SET source_record_id=revision.payload->>'sourceRecordId'
 FROM mart.analytics_fact_revisions revision WHERE (head.tenant_id,head.fact_key,head.revision_id)=(revision.tenant_id,revision.fact_key,revision.revision_id);
ALTER TABLE mart.analytics_fact_heads FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE mart.analytics_fact_heads ALTER COLUMN source_record_id SET NOT NULL;
CREATE OR REPLACE FUNCTION mart.project_operational_head() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE fact jsonb; BEGIN
 SELECT payload INTO fact FROM mart.analytics_fact_revisions WHERE tenant_id=NEW.tenant_id AND fact_key=NEW.fact_key AND revision_id=NEW.revision_id;
 IF fact IS NULL THEN RAISE EXCEPTION 'Exact operational revision required'; END IF;
 NEW.business_month=left(fact->>'businessDate',7);NEW.measure_id=fact->>'measureId';NEW.status=fact->>'status';NEW.source_object=fact->>'sourceObject';NEW.source_record_id=fact->>'sourceRecordId';RETURN NEW;
END $$;
CREATE INDEX analytics_presence_identity ON mart.analytics_fact_heads(tenant_id,source_object,status,source_record_id) INCLUDE(fact_key,revision_id);
