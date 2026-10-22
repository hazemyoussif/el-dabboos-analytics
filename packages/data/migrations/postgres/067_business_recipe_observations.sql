-- Separate observation clocks for recipes sharing an immutable Business member.
-- Legacy complete extractions retain their original clock; no data is backfilled.
CREATE TABLE mart.business_recipe_observations (
 tenant_id text NOT NULL,partition_id text NOT NULL,source_object text NOT NULL,
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,business_day date NOT NULL,
 PRIMARY KEY(tenant_id,partition_id,source_object),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 CHECK(length(source_object)>0 AND length(source_revision)>0)
);
ALTER TABLE mart.business_recipe_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.business_recipe_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.business_recipe_observations
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.business_recipe_observations TO dabboos_ingestor;
GRANT SELECT ON mart.business_recipe_observations TO dabboos_runtime;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.business_recipe_observations
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE TRIGGER published_content_lock BEFORE INSERT ON mart.business_recipe_observations
 FOR EACH ROW EXECUTE FUNCTION mart.lock_review_contents();

-- Exact unchanged observations renew freshness without duplicating the raw month.
CREATE TABLE mart.business_recipe_checks (
 tenant_id text NOT NULL,partition_id text NOT NULL,source_object text NOT NULL,
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,business_day date NOT NULL,
 control_fingerprint text NOT NULL CHECK(control_fingerprint ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(tenant_id,partition_id,source_object,source_cutoff),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 CHECK(length(source_object)>0 AND length(source_revision)>0)
);
ALTER TABLE mart.business_recipe_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.business_recipe_checks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.business_recipe_checks
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.business_recipe_checks TO dabboos_ingestor;
GRANT SELECT ON mart.business_recipe_checks TO dabboos_runtime;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.business_recipe_checks
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();

CREATE FUNCTION mart.business_recipe_control_fingerprint(selected_tenant text,selected_partition text,selected_object text)
 RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_agg(jsonb_build_array(control.measure_id,control.dimensions,
  trim_scale(control.expected_value)::text,control.expected_count::text)
  ORDER BY control.measure_id,control.dimensions::text)::text,'UTF8')),'hex')
 FROM mart.review_controls control JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
 WHERE control.tenant_id=selected_tenant AND control.partition_id=selected_partition
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE rule->>'measureId'=control.measure_id AND rule->>'sourceObject'=selected_object)
$$;
REVOKE ALL ON FUNCTION mart.business_recipe_control_fingerprint(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_recipe_control_fingerprint(text,text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.business_measure_observation(selected_tenant text,selected_partition text,selected_measure text)
 RETURNS TABLE(source_cutoff timestamptz,source_revision text,business_day date)
 LANGUAGE sql STABLE AS $$
 SELECT coalesce(checked.source_cutoff,observation.source_cutoff,extraction.source_cutoff),
 coalesce(checked.source_revision,observation.source_revision,extraction.source_revision),
 coalesce(checked.business_day,observation.business_day,least((extraction.month+interval '1 month - 1 day')::date,
 (extraction.source_cutoff AT TIME ZONE (rule->>'timeZone'))::date))
 FROM mart.review_extractions extraction
 CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
 LEFT JOIN mart.business_recipe_observations observation
 ON observation.tenant_id=extraction.tenant_id AND observation.partition_id=extraction.partition_id
 AND observation.source_object=rule->>'sourceObject'
 LEFT JOIN LATERAL (SELECT * FROM mart.business_recipe_checks candidate
  WHERE candidate.tenant_id=extraction.tenant_id AND candidate.partition_id=extraction.partition_id
  AND candidate.source_object=rule->>'sourceObject'
  AND candidate.source_cutoff>=coalesce(observation.source_cutoff,extraction.source_cutoff)
  ORDER BY candidate.source_cutoff DESC LIMIT 1) checked ON true
 WHERE extraction.tenant_id=selected_tenant AND extraction.partition_id=selected_partition
 AND rule->>'measureId'=selected_measure
$$;
REVOKE ALL ON FUNCTION mart.business_measure_observation(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.business_measure_observation(text,text,text) TO dabboos_ingestor,dabboos_runtime;

CREATE FUNCTION mart.guard_business_recipe_check() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('analytics:'||NEW.tenant_id,0));
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted
  JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
  JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  CROSS JOIN LATERAL mart.business_measure_observation(NEW.tenant_id,NEW.partition_id,rule->>'measureId') previous
  WHERE trusted.tenant_id=NEW.tenant_id AND member.partition_id=NEW.partition_id AND member.family='business'
  AND rule->>'sourceObject'=NEW.source_object AND NEW.business_day=previous.business_day
  AND NEW.business_day=least((extraction.month+interval '1 month - 1 day')::date,
    (NEW.source_cutoff AT TIME ZONE (rule->>'timeZone'))::date)
  AND NEW.source_cutoff>previous.source_cutoff
  AND NEW.control_fingerprint=mart.business_recipe_control_fingerprint(NEW.tenant_id,NEW.partition_id,NEW.source_object))
 THEN RAISE EXCEPTION 'Unchanged Business check requires the current exact observation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_recipe_check_guard BEFORE INSERT ON mart.business_recipe_checks
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_recipe_check();
REVOKE ALL ON FUNCTION mart.guard_business_recipe_check() FROM PUBLIC;

-- Versioned dependency edges belong to Business observations, independently of
-- the facts cursor. Keeping versions preserves the old footprint across retries.
CREATE TABLE mart.business_allocation_links (
 tenant_id text NOT NULL,source_id text NOT NULL,source_record_id text NOT NULL CHECK(source_record_id ~ '^[1-9][0-9]*$'),
 source_cutoff timestamptz NOT NULL,source_revision text NOT NULL,partition_id text NOT NULL,
 effective_from date NOT NULL,allocation_links jsonb NOT NULL,
 PRIMARY KEY(tenant_id,source_id,source_record_id,source_cutoff),
 FOREIGN KEY(tenant_id,partition_id) REFERENCES mart.review_extractions,
 CHECK((jsonb_typeof(allocation_links)='object'
  AND allocation_links->>'debitLineId' ~ '^[1-9][0-9]*$'
  AND allocation_links->>'creditLineId' ~ '^[1-9][0-9]*$'
  AND allocation_links->>'debitMoveId' ~ '^[1-9][0-9]*$'
  AND allocation_links->>'creditMoveId' ~ '^[1-9][0-9]*$') IS TRUE)
);
CREATE INDEX business_allocation_observation_cutoff ON mart.business_allocation_links(tenant_id,source_id,source_cutoff DESC);
ALTER TABLE mart.business_allocation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.business_allocation_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON mart.business_allocation_links
 USING(tenant_id=nullif(current_setting('mart.tenant_id',true),''))
 WITH CHECK(tenant_id=nullif(current_setting('mart.tenant_id',true),''));
GRANT SELECT,INSERT ON mart.business_allocation_links TO dabboos_ingestor;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON mart.business_allocation_links
 FOR EACH ROW EXECUTE FUNCTION mart.refuse_history_mutation();
CREATE FUNCTION mart.guard_business_allocation_links() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM mart.review_extractions extraction,
  LATERAL jsonb_array_elements(extraction.mapping->'measures') rule,
  LATERAL mart.business_measure_observation(NEW.tenant_id,NEW.partition_id,rule->>'measureId') observation
  WHERE extraction.tenant_id=NEW.tenant_id AND extraction.partition_id=NEW.partition_id
  AND extraction.source_id=NEW.source_id AND rule->>'sourceObject'='command_allocation'
  AND observation.source_cutoff=NEW.source_cutoff AND observation.source_revision=NEW.source_revision)
 THEN RAISE EXCEPTION 'Allocation links require accepted Business source evidence'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_allocation_link_guard BEFORE INSERT ON mart.business_allocation_links
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_allocation_links();
REVOKE ALL ON FUNCTION mart.guard_business_allocation_links() FROM PUBLIC;

CREATE FUNCTION mart.guard_business_recipe_observation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.business_delta_origins origin
  JOIN mart.review_extractions extraction ON extraction.tenant_id=origin.tenant_id AND extraction.partition_id=origin.partition_id
  CROSS JOIN LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  CROSS JOIN LATERAL mart.business_measure_observation(origin.tenant_id,origin.base_partition,rule->>'measureId') previous
  WHERE origin.tenant_id=NEW.tenant_id AND origin.partition_id=NEW.partition_id AND rule->>'sourceObject'=NEW.source_object
  AND (NEW.source_cutoff<previous.source_cutoff OR (NEW.source_cutoff=previous.source_cutoff AND NEW.source_revision<>previous.source_revision)))
 THEN RAISE EXCEPTION 'Business recipe observation cannot regress'; END IF;
 IF NOT EXISTS(SELECT 1 FROM mart.review_extractions extraction,
  LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE extraction.tenant_id=NEW.tenant_id AND extraction.partition_id=NEW.partition_id
  AND rule->>'sourceObject'=NEW.source_object AND (
   (NEW.source_cutoff=extraction.source_cutoff AND NEW.source_revision=extraction.source_revision
    AND NEW.business_day=least((extraction.month+interval '1 month - 1 day')::date,
      (extraction.source_cutoff AT TIME ZONE (rule->>'timeZone'))::date))
   OR EXISTS(SELECT 1 FROM mart.business_delta_origins origin
    CROSS JOIN LATERAL mart.business_measure_observation(origin.tenant_id,origin.base_partition,rule->>'measureId') previous
    WHERE origin.tenant_id=NEW.tenant_id AND origin.partition_id=NEW.partition_id
    AND NEW.source_cutoff=previous.source_cutoff AND NEW.source_revision=previous.source_revision
    AND NEW.business_day=previous.business_day)
  )) THEN RAISE EXCEPTION 'Business recipe observation must be new or inherited unchanged'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_recipe_observation_guard BEFORE INSERT ON mart.business_recipe_observations
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_recipe_observation();

-- A delta must provide every recipe clock and may replace only freshly observed recipes.
CREATE FUNCTION mart.guard_business_recipe_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.family<>'business' OR NOT EXISTS(SELECT 1 FROM mart.business_delta_origins
  WHERE tenant_id=NEW.tenant_id AND partition_id=NEW.partition_id) THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM mart.review_extractions extraction,
  LATERAL jsonb_array_elements(extraction.mapping->'measures') rule
  WHERE extraction.tenant_id=NEW.tenant_id AND extraction.partition_id=NEW.partition_id
  AND NOT EXISTS(SELECT 1 FROM mart.business_recipe_observations observation
   WHERE observation.tenant_id=NEW.tenant_id AND observation.partition_id=NEW.partition_id
   AND observation.source_object=rule->>'sourceObject'))
 OR EXISTS(SELECT 1 FROM mart.business_delta_replacements replacement
  JOIN mart.business_recipe_observations observation USING(tenant_id,partition_id,source_object)
  JOIN mart.review_extractions extraction USING(tenant_id,partition_id)
  WHERE replacement.tenant_id=NEW.tenant_id AND replacement.partition_id=NEW.partition_id
  AND (observation.source_cutoff<>extraction.source_cutoff OR observation.source_revision<>extraction.source_revision))
 THEN RAISE EXCEPTION 'Business delta recipe observation coverage incomplete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_recipe_member_guard BEFORE INSERT ON mart.analytics_serving_members
 FOR EACH ROW EXECUTE FUNCTION mart.guard_business_recipe_member();
REVOKE ALL ON FUNCTION mart.guard_business_recipe_observation(),mart.guard_business_recipe_member() FROM PUBLIC;

CREATE OR REPLACE FUNCTION mart.prepared_snapshot_observations(selected_tenant text,selected_revision text,selected_family text)
 RETURNS TABLE(measure_id text,business_day date,expected_value numeric,expected_count bigint)
 LANGUAGE sql STABLE AS $$
 SELECT control.measure_id,observation.business_day,control.expected_value,control.expected_count
 FROM mart.analytics_serving_members member
 JOIN mart.review_controls control USING(tenant_id,partition_id)
 JOIN mart.measure_definitions definition ON definition.measure_id=control.measure_id AND definition.kind='snapshot'
 CROSS JOIN LATERAL mart.business_measure_observation(member.tenant_id,member.partition_id,control.measure_id) observation
 WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
 AND member.family=selected_family AND selected_family IN ('review','business') AND control.scope_key='summary'
 UNION ALL
 SELECT operand.key,evidence.snapshot_date,operand.value::numeric,evidence.customer_count
 FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id)
 JOIN mart.finance_snapshot_evidence evidence ON evidence.tenant_id=part.tenant_id AND evidence.snapshot_id=part.snapshot_id
 CROSS JOIN LATERAL jsonb_each_text(evidence.totals) operand
 WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision
 AND member.family=selected_family AND selected_family='receivables'
$$;
