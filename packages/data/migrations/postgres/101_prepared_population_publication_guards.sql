CREATE FUNCTION mart.prepared_population_required(selected_tenant text,selected_revision text)
RETURNS TABLE(definition_id text) LANGUAGE sql STABLE AS $$
 SELECT definition.definition_id FROM mart_admin.prepared_population_definitions definition
 WHERE EXISTS(SELECT 1 FROM mart.prepared_bindings binding JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
  WHERE binding.tenant_id=selected_tenant AND binding.revision_id=selected_revision AND binding.family='business'
   AND dataset.configuration->'measures'?|ARRAY[definition.entity_measure,definition.item_measure,definition.amount_measure])
$$;
REVOKE ALL ON FUNCTION mart.prepared_population_required(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepared_population_required(text,text) TO dabboos_ingestor;

CREATE FUNCTION mart.guard_prepared_population_dataset() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE details jsonb;limits record;native_chunks bigint; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('prepared-population:'||NEW.tenant_id||':'||NEW.data_id,0));
 details=mart.prepared_population_work_open(NEW.tenant_id,NEW.source_revision_id,NEW.definition_id,NEW.maximum_cells,NEW.maximum_chunks);
 IF NEW.data_id IS DISTINCT FROM details->>'dataId' OR NEW.source_inputs IS DISTINCT FROM details->'inputs'
 OR NEW.entity_count IS DISTINCT FROM (details->>'entityCount')::bigint OR NEW.item_count IS DISTINCT FROM (details->>'itemCount')::bigint
 OR NEW.expected_rows IS DISTINCT FROM (details->>'rows')::bigint OR NEW.entities_per_chunk IS DISTINCT FROM (details->>'entitiesPerChunk')::integer
 THEN RAISE EXCEPTION 'Population dataset does not match complete canonical axes'; END IF;
 SELECT * INTO limits FROM mart.prepared_activation WHERE tenant_id=NEW.tenant_id;
 IF FOUND THEN
  SELECT count(*) INTO native_chunks FROM mart.prepared_required_chunks(NEW.tenant_id,NEW.source_revision_id);
  IF NEW.maximum_cells>limits.max_cells_per_chunk OR native_chunks+(details->>'chunks')::bigint>limits.max_chunks
  THEN RAISE EXCEPTION 'Population preparation exceeds registered bounds'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER population_dataset_guard BEFORE INSERT ON mart.prepared_population_datasets
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_dataset();

CREATE FUNCTION mart.guard_prepared_population_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inputs jsonb; BEGIN
 SELECT source_inputs INTO STRICT inputs FROM mart.prepared_population_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 IF NEW.source_data_id IS DISTINCT FROM inputs->'axes'->NEW.axis->>'data_id'
 OR EXISTS(SELECT 1 FROM mart.prepared_population_seals WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)
 THEN RAISE EXCEPTION 'Frozen population input references required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER population_source_guard BEFORE INSERT ON mart.prepared_population_sources
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_source();

-- Statement-level guards avoid running a query once for each completed zero pair.
CREATE FUNCTION mart.guard_prepared_population_rows() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM(SELECT DISTINCT tenant_id,data_id,partition_key,chunk_no FROM inserted_population_rows) inserted
  WHERE EXISTS(SELECT 1 FROM mart.prepared_population_seals seal WHERE seal.tenant_id=inserted.tenant_id AND seal.data_id=inserted.data_id)
  OR EXISTS(SELECT 1 FROM mart.prepared_population_chunks chunk WHERE chunk.tenant_id=inserted.tenant_id AND chunk.data_id=inserted.data_id
   AND chunk.partition_key=inserted.partition_key AND chunk.chunk_no=inserted.chunk_no))
 THEN RAISE EXCEPTION 'Validated population content is immutable'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER population_rows_guard AFTER INSERT ON mart.prepared_population_rows REFERENCING NEW TABLE AS inserted_population_rows
 FOR EACH STATEMENT EXECUTE FUNCTION mart.guard_prepared_population_rows();

CREATE FUNCTION mart.guard_prepared_population_chunk() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE plan record; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('prepared-population:'||NEW.tenant_id||':'||NEW.data_id,0));
 IF EXISTS(SELECT 1 FROM mart.prepared_population_seals WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)
 THEN RAISE EXCEPTION 'Sealed population is immutable'; END IF;
 SELECT * INTO STRICT plan FROM mart.prepared_population_chunk_plan(NEW.tenant_id,NEW.data_id)
 WHERE partition_key=NEW.partition_key AND chunk_no=NEW.chunk_no;
 IF NEW.first_entity IS DISTINCT FROM plan.first_entity OR NEW.last_entity IS DISTINCT FROM plan.last_entity
 OR NEW.entity_count IS DISTINCT FROM plan.entity_count OR NEW.row_count IS DISTINCT FROM plan.expected_rows
 OR NOT mart.prepared_population_chunk_exact(NEW.tenant_id,NEW.data_id,NEW.partition_key,NEW.chunk_no)
 THEN RAISE EXCEPTION 'Population chunk differs from independent complete axes'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER population_chunk_guard BEFORE INSERT ON mart.prepared_population_chunks
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_chunk();

CREATE FUNCTION mart.guard_prepared_population_seal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dataset mart.prepared_population_datasets; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('prepared-population:'||NEW.tenant_id||':'||NEW.data_id,0));
 SELECT * INTO STRICT dataset FROM mart.prepared_population_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 IF (SELECT count(*) FROM mart.prepared_population_sources WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)<>3
 OR NEW.row_count IS DISTINCT FROM dataset.expected_rows
 OR (SELECT count(*) FROM mart.prepared_population_rows WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)<>dataset.expected_rows
 OR EXISTS(WITH expected AS(SELECT * FROM mart.prepared_population_chunk_plan(NEW.tenant_id,NEW.data_id)),
  actual AS(SELECT * FROM mart.prepared_population_chunks WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id)
  SELECT 1 FROM expected FULL JOIN actual USING(partition_key,chunk_no)
  WHERE expected.chunk_no IS NULL OR actual.chunk_no IS NULL OR expected.first_entity IS DISTINCT FROM actual.first_entity
   OR expected.last_entity IS DISTINCT FROM actual.last_entity OR expected.entity_count IS DISTINCT FROM actual.entity_count
   OR expected.expected_rows IS DISTINCT FROM actual.row_count)
 THEN RAISE EXCEPTION 'Complete validated population chunks required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER population_seal_guard BEFORE INSERT ON mart.prepared_population_seals
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_seal();

CREATE FUNCTION mart.guard_prepared_population_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dataset mart.prepared_population_datasets;details jsonb; BEGIN
 SELECT * INTO STRICT dataset FROM mart.prepared_population_datasets WHERE tenant_id=NEW.tenant_id AND data_id=NEW.data_id;
 IF dataset.definition_id IS DISTINCT FROM NEW.definition_id OR EXISTS(SELECT 1 FROM mart.prepared_revision_seals WHERE tenant_id=NEW.tenant_id AND revision_id=NEW.revision_id)
 THEN RAISE EXCEPTION 'Unsealed matching prepared population membership required'; END IF;
 details=mart.prepared_population_work_open(NEW.tenant_id,NEW.revision_id,NEW.definition_id,dataset.maximum_cells,dataset.maximum_chunks);
 IF NEW.data_id IS DISTINCT FROM details->>'dataId' OR NEW.inputs IS DISTINCT FROM details->'inputs'
 OR NEW.input_fingerprint IS DISTINCT FROM details->>'inputFingerprint'
 THEN RAISE EXCEPTION 'Prepared population input signature mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER population_binding_guard BEFORE INSERT ON mart.prepared_population_bindings
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_binding();

-- This extends the existing seal; it creates no parallel publication pointer.
CREATE FUNCTION mart.guard_prepared_population_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM mart.prepared_population_required(NEW.tenant_id,NEW.revision_id) required
  WHERE NOT EXISTS(SELECT 1 FROM mart.prepared_population_bindings binding
   WHERE binding.tenant_id=NEW.tenant_id AND binding.revision_id=NEW.revision_id AND binding.definition_id=required.definition_id))
 THEN RAISE EXCEPTION 'Prepared population coverage is not complete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prepared_population_revision_guard BEFORE INSERT ON mart.prepared_revision_seals
 FOR EACH ROW EXECUTE FUNCTION mart.guard_prepared_population_revision();
REVOKE ALL ON FUNCTION mart.guard_prepared_population_dataset(),mart.guard_prepared_population_source(),mart.guard_prepared_population_rows(),
 mart.guard_prepared_population_chunk(),mart.guard_prepared_population_seal(),mart.guard_prepared_population_binding(),mart.guard_prepared_population_revision() FROM PUBLIC;
