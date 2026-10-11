import {operationalServingInput} from './serving-query.ts';
import {categoricalDimensions} from '@el-dabboos/domain';

/** Identity discovery includes activated history; amounts still use their existing executors. */
export const publishedDiscoveryInput=`(
  SELECT base.tenant_id,base.measure_id,base.dimensions,base.labels,base.business_date
  FROM ${operationalServingInput} WHERE trusted.tenant_id=$1
  UNION ALL
  SELECT fact.tenant_id,fact.measure_id,jsonb_build_object(${categoricalDimensions.map(dimension=>`'${dimension}',fact.${dimension}`).join(',')}),
    coalesce(fact.transaction_evidence->'labels','{}'::jsonb)||jsonb_strip_nulls(coalesce(fact.display_labels,'{}'::jsonb)),fact.business_date
  FROM mart.canonical_facts fact
  JOIN mart.historical_release_members member USING(tenant_id,dataset_id)
  JOIN mart.historical_serving_bindings binding USING(tenant_id,reference)
  WHERE fact.tenant_id=$1 AND member.kind='events'
) base JOIN (SELECT $1::text tenant_id) trusted USING(tenant_id)`;
