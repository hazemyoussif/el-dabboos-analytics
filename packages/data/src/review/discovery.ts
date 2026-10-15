import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {publishedQueryIssues,requiredMeasures,validDateRange} from '@el-dabboos/domain';
import type {AnalyticsContext,DimensionId,DimensionDiscoveryRequest,DimensionDiscoveryPage,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {sourceDisplayLabel,dimensionLabelField} from '../postgres/query-labels.ts';
export async function discoverReviewDimensions(pool:Pool,scope:{dimension:DimensionId;context:AnalyticsContext;request:DimensionDiscoveryRequest;capabilities:PublishedAnalyticsCapabilities;timeout:number;family?:'review'|'business'}):Promise<DimensionDiscoveryPage>{
 const {dimension,context,request,capabilities}=scope,limit=request.limit??50,search=request.search??'',selected=request.selectedIds??[];
 validateBounds(request);
 const metric=request.metric??capabilities.releases.flatMap(release=>release.capabilities).find(capability=>capability.dimensions.includes(dimension))?.metric;
 const asOf=request.asOf??capabilities.releases.flatMap(release=>release.period?[release.period.to]:[]).sort().at(-1);
 if(!metric||!asOf||publishedQueryIssues({metric,groupBy:dimension,dateRange:{from:asOf,to:asOf},filters:[...(context.enforcedFilters??[])]},capabilities).length)throw new Error('Unexposed review discovery');
 const fingerprint=createHash('sha256').update(JSON.stringify({dimension,context,metric,asOf,search})).digest('hex'),after=continuation(request.cursor,fingerprint);
 return tenantTransaction(pool,context.tenantId,async client=>{
  const params:unknown[]=[context.tenantId,dimension,dimensionLabelField(dimension),requiredMeasures(metric),asOf,after,'%'+search.replace(/[\\%_]/g,'\\$&')+'%',selected];
  const filters=(context.enforcedFilters??[]).map(filter=>{params.push(filter.dimension,filter.values);return `fact.payload->'dimensions'->>$${params.length-1}=ANY($${params.length}::text[])`;});
  const rows=(await client.query(`WITH candidates AS MATERIALIZED (
   SELECT fact.payload->'dimensions'->>$2 id,CASE WHEN count(DISTINCT fact.payload->'displayLabels'->>$3)=1 THEN min(fact.payload->'displayLabels'->>$3) END label
   FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
   JOIN mart.review_facts fact USING(tenant_id,partition_id)
   WHERE trusted.tenant_id=$1 AND member.family='${scope.family??'review'}' AND fact.payload->>'measureId'=ANY($4::text[])
   AND (fact.payload->>'businessDate')::date<=$5::date AND fact.payload->'dimensions'->>$2 IS NOT NULL
   ${filters.length?'AND '+filters.join(' AND '):''} GROUP BY fact.payload->'dimensions'->>$2),
   page AS (SELECT * FROM candidates WHERE id COLLATE "C">$6 AND (coalesce(label,'') ILIKE $7 ESCAPE '\\' OR id ILIKE $7 ESCAPE '\\') ORDER BY id COLLATE "C" LIMIT ${limit+1})
   SELECT 'page' kind,* FROM page UNION ALL SELECT 'selected' kind,* FROM candidates WHERE id=ANY($8::text[])`,params)).rows;
  const options=(kind:string)=>rows.filter(row=>row.kind===kind).map(row=>({id:String(row.id),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  const page=options('page'),values=page.slice(0,limit);
  return {values,selected:options('selected'),...(page.length>limit?{nextCursor:Buffer.from(JSON.stringify({scope:fingerprint,after:values.at(-1)!.id})).toString('base64url')}:{})};
 },true,scope.timeout);
}
function continuation(cursor:string|undefined,scope:string){
 if(!cursor)return '';
 if(cursor.length>2000)throw new Error('Invalid review continuation');
 try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString());if(parsed.scope!==scope||typeof parsed.after!=='string'||parsed.after.length>500)throw new Error();return parsed.after as string;}catch{throw new Error('Invalid review continuation');}
}

function validateBounds(request:DimensionDiscoveryRequest){
 const limit=request.limit??50;
 if(!Number.isInteger(limit)||limit<1||limit>100||(request.search??'').length>100||(request.selectedIds??[]).length>1000)throw new Error('Invalid review discovery bounds');
 if(request.asOf&&!validDateRange({from:request.asOf,to:request.asOf}))throw new Error('Invalid review discovery cutoff');
}
