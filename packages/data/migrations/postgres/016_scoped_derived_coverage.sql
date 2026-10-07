-- Validate only requested metric/group certificates per bounded statement; never skip their exact live-input guard.
CREATE FUNCTION mart.published_derived_coverage(requested_tenant text,requested_dataset text,requested_metric text,requested_grouping text,include_all_groupings boolean)
 RETURNS TABLE(metric text,"grouping" text,period_from text,period_to text,reference text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
 SELECT certificate.metric,certificate.grouping,certificate.period_from::text,certificate.period_to::text,certificate.reference
 FROM mart.derived_metric_certifications certificate JOIN mart.serving_bindings binding USING(tenant_id,dataset_id)
 WHERE requested_tenant=nullif(current_setting('mart.tenant_id',true),'')
 AND certificate.tenant_id=requested_tenant AND certificate.dataset_id=requested_dataset
 AND certificate.metric=requested_metric
 AND (include_all_groupings OR certificate.grouping IS NOT DISTINCT FROM requested_grouping)
 AND mart.derived_inputs_exact(certificate.tenant_id,certificate.dataset_id,certificate.metric,certificate.grouping,certificate.period_from,certificate.period_to,certificate.case_ids)
$$;
REVOKE ALL ON FUNCTION mart.published_derived_coverage(text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mart.published_derived_coverage(text,text,text,text,boolean) TO dabboos_runtime;
