-- Called inside the existing publication transaction and tenant writer lock.
-- An established sparse Business revision must use its prepared parent; it may
-- never silently fall back to rebuilding the full month.
CREATE FUNCTION mart.prepare_business_delta_dataset(selected_tenant text,selected_revision text,config jsonb,maximum_cells bigint)
 RETURNS TABLE(data_id text) LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,pg_temp SET row_security=on AS $$
 DECLARE parent record;signature record;parent_revision text;created_data text;copied bigint;
 BEGIN
 PERFORM mart.prepared_work_authorize(selected_tenant);
 IF config->>'family' IS DISTINCT FROM 'business' THEN RETURN; END IF;
 IF maximum_cells IS NULL OR maximum_cells<1 OR config IS DISTINCT FROM mart.prepared_configuration(
  selected_tenant,selected_revision,'business',config->>'kind',(config->>'from')::date,(config->>'through')::date)
 THEN RAISE EXCEPTION 'Governed Business configuration and finite cell bound required'; END IF;
 SELECT revision.parent_revision INTO STRICT parent_revision FROM mart.analytics_serving_revisions revision
 WHERE revision.tenant_id=selected_tenant AND revision.revision_id=selected_revision;
 IF NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member LEFT JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
  LEFT JOIN mart.analytics_serving_members previous ON previous.tenant_id=member.tenant_id AND previous.revision_id=parent_revision
   AND previous.family=member.family AND previous.month=member.month
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
  AND member.partition_id IS DISTINCT FROM previous.partition_id
  AND (sparse.partition_id IS NOT NULL OR config->>'kind'='snapshot' AND previous.partition_id IS NULL)
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date)))
 THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM mart.analytics_serving_members member
  LEFT JOIN mart.analytics_serving_members previous ON previous.tenant_id=member.tenant_id AND previous.revision_id=parent_revision
   AND previous.family=member.family AND previous.month=member.month
  WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business'
  AND member.partition_id IS DISTINCT FROM previous.partition_id
  AND previous.partition_id IS NOT NULL
  AND (config->>'kind'='event' AND member.month=(config->>'from')::date
   OR config->>'kind'='snapshot' AND member.month<=date_trunc('month',(config->>'through')::date))
  AND NOT EXISTS(SELECT 1 FROM mart.business_delta_storage sparse WHERE sparse.tenant_id=member.tenant_id AND sparse.partition_id=member.partition_id))
 THEN RAISE EXCEPTION 'Sparse Business preparation requires complete delta lineage'; END IF;
 SELECT binding.data_id,dataset.configuration INTO parent FROM mart.prepared_bindings binding
 JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id) JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
 WHERE binding.tenant_id=selected_tenant AND binding.revision_id=parent_revision AND binding.family='business' AND binding.kind=config->>'kind'
 AND (config->>'kind'='event' AND binding.period=(config->>'from')::date
  OR config->>'kind'='snapshot' AND binding.period<=(config->>'through')::date)
 AND (dataset.configuration-ARRAY['from','through','measures','grains'])=(config-ARRAY['from','through','measures','grains'])
 ORDER BY binding.period DESC LIMIT 1;
 IF parent IS NULL THEN
  -- The first complete Business dataset has no prepared parent to reuse. This
  -- initialization exception never applies to a sparse input or existing kind.
  IF NOT EXISTS(SELECT 1 FROM mart.prepared_bindings binding WHERE binding.tenant_id=selected_tenant
    AND binding.revision_id=parent_revision AND binding.family='business' AND binding.kind=config->>'kind')
   AND NOT EXISTS(SELECT 1 FROM mart.analytics_serving_members member JOIN mart.business_delta_storage sparse USING(tenant_id,partition_id)
    WHERE member.tenant_id=selected_tenant AND member.revision_id=selected_revision AND member.family='business')
  THEN RETURN; END IF;
  RAISE EXCEPTION 'Accepted compatible Business prepared baseline required; no full-month fallback';
 END IF;
 SELECT * INTO STRICT signature FROM mart.prepared_input_signature(selected_tenant,selected_revision,config);
 created_data:=encode(sha256(convert_to('business-prepared-delta-v1:'||config::text||':'||parent.data_id||':'||signature.fingerprint,'UTF8')),'hex');
 INSERT INTO mart.prepared_datasets VALUES(selected_tenant,created_data,config);
 INSERT INTO mart.business_prepared_origins VALUES(selected_tenant,created_data,parent.data_id,selected_revision,parent_revision);
 INSERT INTO mart.business_prepared_keys SELECT selected_tenant,created_data,keys.*
 FROM mart.business_prepared_affected_keys(selected_tenant,selected_revision,config,parent.configuration) keys LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Business affected cell-key bound exceeded'; END IF;
 INSERT INTO mart.prepared_cells SELECT selected_tenant,created_data,cells.*
 FROM mart.business_prepared_replacement_cells(selected_tenant,selected_revision,config,parent.configuration) cells LIMIT maximum_cells+1;
 GET DIAGNOSTICS copied=ROW_COUNT;
 IF copied>maximum_cells THEN RAISE EXCEPTION 'Business replacement cell bound exceeded'; END IF;
 RETURN QUERY SELECT created_data;
 END $$;
REVOKE ALL ON FUNCTION mart.prepare_business_delta_dataset(text,text,jsonb,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.prepare_business_delta_dataset(text,text,jsonb,bigint) TO dabboos_ingestor;
