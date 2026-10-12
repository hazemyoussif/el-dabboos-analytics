import { periodKeys } from '../calendar.ts';
import type { Pool,PoolClient } from 'pg';
import { DrillUnavailableError, drillQuery, requiredMeasures, validateDrillRequest, publishedQueryIssues } from '@el-dabboos/domain';
import type { AnalyticsContext, DrillPage, DrillRequest, DrillRow, DrillThroughRepository, PublishedAnalyticsCapabilities } from '@el-dabboos/domain';
import { tenantTransaction } from '../postgres/session.ts';
import { financeMetric } from './finance-repository.ts';
import { decodeDrillCursor,detailProjection,drillIdentity,drillPredicates,drillSort,drillValueExpression,encodeDrillCursor } from './drill-query.ts';
interface DetailInput {sql:string;params:unknown[];snapshotAsOf?:string;grain:DrillPage['grain']}
/** Only immutable trusted mart lineage. No source transport or source credentials. */
export class TrustedDrillThroughRepository implements DrillThroughRepository {
  constructor(private readonly pool:Pool,private readonly capabilities:(context:AnalyticsContext)=>Promise<PublishedAnalyticsCapabilities>,private readonly timeout=15000){}
  async drill(request:DrillRequest,context:AnalyticsContext):Promise<DrillPage> {
    validateDrillRequest(request,context);
    const query=drillQuery(request);
    if(publishedQueryIssues({...query,filters:[...(query.filters??[]),...(context.enforcedFilters??[])]},await this.capabilities(context)).length)throw new DrillUnavailableError('DRILL_CONTEXT_INVALID');
    return tenantTransaction(this.pool,context.tenantId,async client=>{
      // Short interactive reads avoid JIT compilation of nested RLS predicates.
      await client.query('SET LOCAL jit=off');
      const input=financeMetric(query.metric)?await financeInput(client,request,context):await eventInput(client,request,context);
      return detailPage(client,input,request,context);
    },true,this.timeout);
  }
}
async function eventInput(client:PoolClient,request:DrillRequest,context:AnalyticsContext):Promise<DetailInput> {
  const trusted=(await client.query(`SELECT trusted.revision_id,coalesce(cursor.cutoff,revision.cutoff) cutoff,baseline.period_from::text coverage_from,
    CASE WHEN EXISTS(SELECT 1 FROM mart.analytics_serving_members member WHERE member.tenant_id=trusted.tenant_id AND member.revision_id=trusted.revision_id AND member.family='facts' AND member.month>baseline.period_to)
    THEN (coalesce(cursor.cutoff,revision.cutoff) AT TIME ZONE (baseline.specification->0->'measures'->0->>'timeZone'))::date::text ELSE baseline.period_to::text END coverage_to
    FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_baselines baseline USING(tenant_id)
    JOIN mart.analytics_serving_revisions revision USING(tenant_id,revision_id) LEFT JOIN mart.analytics_source_cursors cursor USING(tenant_id)
    WHERE trusted.tenant_id=$1`,[context.tenantId])).rows[0];
  if(trusted?.revision_id!==request.release||trusted.cutoff.toISOString()!==request.sourceAsOf)throw new DrillUnavailableError('DRILL_RELEASE_CHANGED');
  const query=drillQuery(request),params:unknown[]=[context.tenantId,request.release,requiredMeasures(query.metric)];
  const from=query.dateRange?.from&&query.dateRange.from>trusted.coverage_from?query.dateRange.from:trusted.coverage_from;
  const to=query.dateRange?.to&&query.dateRange.to<trusted.coverage_to?query.dateRange.to:trusted.coverage_to;
  if(from>to)throw new DrillUnavailableError('DRILL_NOT_READY');
  params.push(from,to);
  const members=(await client.query(`SELECT member.month::text,member.partition_id,EXISTS(SELECT 1 FROM mart.analytics_drill_partitions ready WHERE ready.tenant_id=member.tenant_id AND ready.partition_id=member.partition_id) exact FROM mart.analytics_serving_members member WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='facts' AND member.month BETWEEN date_trunc('month',$3::date)::date AND date_trunc('month',$4::date)::date`,[context.tenantId,request.release,params[3],params[4]])).rows;
  if(members.length!==periodKeys({from,to},'month').length||members.some(row=>!row.exact))throw new DrillUnavailableError('DRILL_NOT_READY');
  const filters=drillPredicates(query,context,params,false);
  return {params,grain:'canonical_measure_fact',sql:`SELECT revision.fact_key row_key,payload->'dimensions' identities,revision.business_date date,
    coalesce(payload->'displayLabels'->>'customer',payload->'transaction'->'labels'->>'customer') customer,
    coalesce(payload->'displayLabels'->>'salesperson',payload->'transaction'->'labels'->>'salesperson') salesperson,
    coalesce(payload->'displayLabels'->>'businessLine',payload->'transaction'->'labels'->>'businessLine') "businessLine",
    payload->'transaction'->>'documentType' "documentType",payload->'transaction'->>'state' status,
    payload->>'measureId' measure,payload->>'value' amount,payload->'currency'->>'reportingCurrency' currency
    FROM mart.analytics_fact_revisions revision
    WHERE revision.tenant_id=$1 AND payload->>'kind'='event' AND payload->>'status'='active'
    -- Keep the indexed revision range as the driver; membership probes remain RLS-protected.
    AND EXISTS (SELECT 1 FROM mart.analytics_partition_facts link
      WHERE link.tenant_id=revision.tenant_id AND link.fact_key=revision.fact_key AND link.revision_id=revision.revision_id
      AND link.partition_id=ANY(ARRAY(SELECT member.partition_id FROM mart.analytics_serving_members member
        WHERE member.tenant_id=$1 AND member.revision_id=$2
        AND member.month BETWEEN date_trunc('month',$4::date)::date AND date_trunc('month',$5::date)::date)) OFFSET 0)
    AND revision.measure_id=ANY($3::text[]) AND revision.business_date BETWEEN $4::text AND $5::text AND ${filters}`};
}
async function financeInput(client:PoolClient,request:DrillRequest,context:AnalyticsContext):Promise<DetailInput> {
  const query=drillQuery(request);
  // Immutable summary-selected snapshot stays pinned even if later snapshots are published.
  const selected=(await client.query(`SELECT publication.snapshot_date::text,publication.snapshot_id,evidence.reporting_currency
    FROM mart.trusted_finance_snapshots publication JOIN mart.finance_snapshot_evidence evidence USING(tenant_id,snapshot_id)
    WHERE publication.tenant_id=$1 AND publication.snapshot_id=$2 AND publication.snapshot_date<=coalesce($3::date,publication.snapshot_date)`,[context.tenantId,request.release,query.dateRange?.to??null])).rows[0];
  if(!selected)throw new DrillUnavailableError('DRILL_NOT_READY');
  const params:unknown[]=[context.tenantId,request.release,requiredMeasures(query.metric),selected.snapshot_date,selected.reporting_currency];
  const filters=drillPredicates(query,context,params,true);
  return {params,snapshotAsOf:selected.snapshot_date,grain:'customer_snapshot',sql:`SELECT customer_id||':'||measure row_key,jsonb_build_object('customer',customer_id) identities,$4::text date,label customer,NULL::text salesperson,NULL::text "businessLine",NULL::text "documentType",NULL::text status,measure,actual_values->>measure amount,$5::text currency
    FROM mart.finance_snapshot_customers CROSS JOIN unnest($3::text[]) measure
    WHERE tenant_id=$1 AND snapshot_id=$2 AND ${filters}`};
}
async function detailPage(client:PoolClient,input:DetailInput,request:DrillRequest,context:AnalyticsContext):Promise<DrillPage> {
  const params=[...input.params],sort=drillSort(request),identity=drillIdentity(request,context),conditions:string[]=[];
  if(request.search){params.push(request.search);conditions.push(`strpos(lower(coalesce(customer,'')),lower($${params.length}::text))>0`);}
  if(request.cursor){const cursor=decodeDrillCursor(request.cursor,identity);params.push(cursor.sort,cursor.key);conditions.push(`(${sort.expression},row_key COLLATE "C") ${sort.direction==='ASC'?'>':'<'} ($${params.length-1}${sort.numeric?'::numeric':'::text'},$${params.length}::text COLLATE "C")`);}
  const limit=request.limit??50;
  params.push(limit+1);
  // One statement shares exact eligible membership between totals and the bounded page.
  // Search/cursor affect only the page; supporting bases describe the full context.
  const result=(await client.query(`WITH eligible AS MATERIALIZED (${input.sql}),
    summed AS (SELECT measure,coalesce(sum(amount::numeric),0)::text total FROM unnest($3::text[]) measure LEFT JOIN eligible USING(measure) GROUP BY measure),
    totals AS (SELECT coalesce(jsonb_object_agg(measure,total),'{}'::jsonb) bases FROM summed),
    page AS (SELECT *,(${sort.expression})::text sort_value FROM eligible WHERE ${conditions.join(' AND ')||'true'} ORDER BY ${sort.expression} ${sort.direction},row_key COLLATE "C" ${sort.direction} LIMIT $${params.length})
    SELECT bases,${drillValueExpression(drillQuery(request))} value,
      coalesce((SELECT json_agg(page ORDER BY ${sort.expression} ${sort.direction},row_key COLLATE "C" ${sort.direction}) FROM page),'[]'::json) rows FROM totals`,params)).rows[0];
  const rows=result.rows as Array<DrillRow&{row_key:string;sort_value:string;identities:Record<string,string>}>;
  const hasMore=rows.length>limit,visible=rows.slice(0,limit),last=visible.at(-1);
  return {rows:visible.map(row=>detailProjection(row,context)),hasMore,...(hasMore&&last?{nextCursor:encodeDrillCursor(identity,last.sort_value,last.row_key)}:{}),release:request.release,grain:input.grain,...(input.snapshotAsOf?{snapshotAsOf:input.snapshotAsOf}:{}),bases:result.bases,value:result.value};
}
