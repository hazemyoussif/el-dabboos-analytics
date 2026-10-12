import type {AnalyticsContext,AnalyticsQuery} from '@el-dabboos/domain';

/** Two evidence grains in one manifest. Summary evidence never supplies customer rows. */
export function financeSnapshotCandidates(query:AnalyticsQuery,context:AnalyticsContext) {
 const customers=`SELECT publication.tenant_id,publication.snapshot_date,publication.snapshot_id,evidence.source_cutoff,
 evidence.definition_version,evidence.source_revision,1 priority
 FROM mart.trusted_finance_snapshots publication JOIN mart.finance_snapshot_evidence evidence USING(tenant_id,snapshot_id) WHERE publication.tenant_id=$1`;
 if(query.groupBy==='customer'||query.filters?.length||context.enforcedFilters?.length)return customers;
 return `${customers} UNION ALL SELECT trusted.tenant_id,base.business_date,member.partition_id,revision.cutoff,baseline.definition_version,revision.revision_id,0
 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) JOIN mart.analytics_baselines baseline USING(tenant_id)
 JOIN mart.analytics_aggregate_bases base USING(tenant_id,partition_id)
 WHERE trusted.tenant_id=$1 AND member.family='facts' AND base.kind='snapshot' AND base.measure_id='net_aged_receivable'
 GROUP BY trusted.tenant_id,base.business_date,member.partition_id,revision.cutoff,baseline.definition_version,revision.revision_id`;
}
export const financeSelectedBalances=`SELECT customer_id,label,actual_values FROM mart.finance_snapshot_customers
 WHERE tenant_id=slot.tenant_id AND snapshot_id=slot.snapshot_id AND slot.priority=1
 UNION ALL SELECT NULL::text,NULL::text,jsonb_object_agg(measure_id,value) FROM (
 SELECT measure_id,sum(value)::numeric(30,6)::text value FROM mart.analytics_aggregate_bases
 WHERE tenant_id=slot.tenant_id AND partition_id=slot.snapshot_id AND business_date=slot.snapshot_date AND kind='snapshot' AND slot.priority=0 GROUP BY measure_id
 ) summary HAVING count(*)>0`;
