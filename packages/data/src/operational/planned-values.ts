import type {PoolClient} from 'pg';
import type {AnalyticsQuery} from '@el-dabboos/domain';
import {timeDimensions} from '@el-dabboos/domain';
import type {QuerySlot} from '../postgres/query-slots.ts';
import {planTrustedRange} from './range-plan.ts';
import type {TrustedRangePartition,TrustedRangeSegment} from './range-plan.ts';
/** Categorical slots share a range: scan each partition once, then group selected identities. */
export async function plannedEventValues(client:PoolClient,scope:{query:AnalyticsQuery;slots:QuerySlot[];partitions:TrustedRangePartition[]},sql:{params:unknown[];predicates:string;expression:string}) {
 const group=scope.query.groupBy&&!timeDimensions.includes(scope.query.groupBy)?scope.query.groupBy:null;
 const segments=planTrustedRange(scope.slots,scope.partitions);
 const params=[...sql.params,JSON.stringify(group?categoricalSegments(segments):segments)],plans=`$${params.length}`;
 params.push(group);const grouping=`$${params.length}`;
 params.push(scope.slots.map(slot=>slot.key));const keys=`$${params.length}`;
 const key=`CASE WHEN ${grouping}::text IS NULL THEN plan.key ELSE base.dimensions->>${grouping} END`;
 const selection=`(${grouping}::text IS NULL OR base.dimensions->>${grouping}=ANY(${keys}::text[]))`;
 return client.query(`WITH plan AS (
 SELECT * FROM jsonb_to_recordset(${plans}::jsonb) AS selected(key text,"from" date,"to" date,partition_id text,grain text)
 ), selected AS (
 SELECT ${key} key,base.measure_id,base.dimensions,base.value,base.business_date data_through FROM plan
 JOIN mart.analytics_aggregate_bases base ON base.tenant_id=$1 AND base.partition_id=plan.partition_id AND base.business_date BETWEEN plan."from" AND plan."to"
 WHERE plan.grain='daily' AND base.kind='event' AND base.measure_id=ANY($2::text[]) AND ${sql.predicates} AND ${selection}
 UNION ALL
 SELECT ${key} key,base.measure_id,base.dimensions,base.value,base.data_through FROM plan
 JOIN mart.analytics_monthly_bases base ON base.tenant_id=$1 AND base.partition_id=plan.partition_id
 WHERE plan.grain='monthly' AND base.measure_id=ANY($2::text[]) AND ${sql.predicates} AND ${selection}
 ) SELECT base.key,${sql.expression},max(base.data_through)::text through FROM selected base GROUP BY base.key`,params);
}
function categoricalSegments(segments:TrustedRangeSegment[]) {
 return [...new Map(segments.map(segment=>[JSON.stringify([segment.partition_id,segment.from,segment.to,segment.grain]),{...segment,key:null}])).values()];
}
