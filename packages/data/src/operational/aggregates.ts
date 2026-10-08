import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {reconcileEventRollup} from './aggregate-rollups.ts';
import type { AnalyticsPartition } from '@el-dabboos/domain';
/** Full dimension tuples preserve intersections of viewer policy and query filters. */
export async function refreshOperationalMonths(client:PoolClient,scope:{tenantId:string;revisionId:string;parent:string|null;runId:string|null;cutoff:string;days?:readonly string[]},months:readonly string[]) {
 const unique=[...new Set(months)].sort();
 await client.query('INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,run_id,cutoff,affected_months) VALUES($1,$2,$3,$4,$5,$6)',[scope.tenantId,scope.revisionId,scope.parent,scope.runId,scope.cutoff,unique.map(month=>`${month}-01`)]);
 if(scope.parent)await client.query(`INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3 AND NOT month=ANY($4::date[])`,[scope.tenantId,scope.revisionId,scope.parent,unique.map(month=>`${month}-01`)]);
 for(const month of unique)await refreshMonth(client,scope,month);
 return unique;
}
async function refreshMonth(client:PoolClient,scope:{tenantId:string;revisionId:string;parent:string|null;days?:readonly string[]},month:string) {
 const {tenantId,revisionId}=scope;
 const prior=scope.parent?(await client.query('SELECT partition_id FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND month=$3',[tenantId,scope.parent,`${month}-01`])).rows[0]:null;
 const priorExact=prior?(await client.query('SELECT mart.drill_partition_exact($1,$2) exact',[tenantId,prior.partition_id])).rows[0].exact:false;
 const days=prior&&priorExact&&scope.days?scope.days.filter(day=>day.startsWith(month)):null;
 const partitionId=randomUUID();
 await client.query('INSERT INTO mart.analytics_partitions VALUES($1,$2,$3)',[tenantId,partitionId,`${month}-01`]);
 if(days)await client.query(`INSERT INTO mart.analytics_aggregate_bases SELECT tenant_id,$2,measure_id,kind,business_date,dimensions,value,fact_count,labels FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$3 AND NOT business_date=ANY($4::date[])`,[tenantId,partitionId,prior.partition_id,days]);
 await client.query(`INSERT INTO mart.analytics_aggregate_bases
 SELECT head.tenant_id,$2,payload->>'measureId',payload->>'kind',(payload->>'businessDate')::date,payload->'dimensions',sum((payload->>'value')::numeric),count(*),
 (array_agg(coalesce(payload->'displayLabels',payload->'transaction'->'labels','{}'::jsonb) ORDER BY payload->>'sourceAsOf' DESC,head.fact_key))[1]
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=left($3,7) AND ($4::date[] IS NULL OR (payload->>'businessDate')::date=ANY($4::date[]))
 GROUP BY head.tenant_id,payload->>'measureId',payload->>'kind',payload->>'businessDate',payload->'dimensions'`,[tenantId,partitionId,`${month}-01`,days]);
 if(days)await client.query(`INSERT INTO mart.analytics_partition_facts SELECT link.tenant_id,$2,link.fact_key,link.revision_id FROM mart.analytics_partition_facts link JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE link.tenant_id=$1 AND link.partition_id=$3 AND NOT (payload->>'businessDate')::date=ANY($4::date[])`,[tenantId,partitionId,prior.partition_id,days]);
 await client.query(`INSERT INTO mart.analytics_partition_facts SELECT tenant_id,$2,fact_key,revision_id FROM mart.analytics_fact_heads WHERE tenant_id=$1 AND status='active' AND business_month=$3 AND ($4::date[] IS NULL OR (SELECT (payload->>'businessDate')::date FROM mart.analytics_fact_revisions revision WHERE revision.tenant_id=analytics_fact_heads.tenant_id AND revision.fact_key=analytics_fact_heads.fact_key AND revision.revision_id=analytics_fact_heads.revision_id)=ANY($4::date[]))`,[tenantId,partitionId,month,days]);
 await reconcileEventRollup(client,tenantId,partitionId);
 const exact=(await client.query('SELECT mart.drill_partition_exact($1,$2) exact',[tenantId,partitionId])).rows[0].exact;
 if(!exact)throw new Error('Canonical drill membership must reconcile to partition');
 await client.query('INSERT INTO mart.analytics_drill_partitions VALUES($1,$2)',[tenantId,partitionId]);
 await client.query('INSERT INTO mart.analytics_serving_members VALUES($1,$2,$3,$4)',[tenantId,revisionId,`${month}-01`,partitionId]);
}
export function affectedMonths(partitions:readonly AnalyticsPartition[]) {return [...new Set(partitions.map(partition=>partition.month))].sort();}
