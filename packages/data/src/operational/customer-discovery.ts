import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {publishedQueryIssues,validDateRange,requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsContext,DimensionDiscoveryRequest,DimensionDiscoveryPage,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {sourceDisplayLabel} from '../postgres/query-labels.ts';
import {operationalServingInput,servingFilters} from './serving-query.ts';
import {financeMetric,financeFilters} from './finance-repository.ts';
/** Bounded, policy-bound keyset discovery. Selected identities hydrate independently of a page. */
export async function discoverCustomers(pool:Pool,context:AnalyticsContext,request:DimensionDiscoveryRequest,capabilities:PublishedAnalyticsCapabilities,timeout:number):Promise<DimensionDiscoveryPage>{
 const {limit,search,selected,metric,finance}=discoveryScope(request,context,capabilities);
 const scope=createHash('sha256').update(JSON.stringify({context,search,metric,asOf:request.asOf??null})).digest('hex');
 const after=decodeCursor(request.cursor,scope);
 return tenantTransaction(pool,context.tenantId,async client=>{
  const params:unknown[]=[context.tenantId];
  let input:string,identity:string,label:string;
  if(finance){
   params.push(request.asOf??'9999-12-31');
   input=`mart.finance_snapshot_customers customer JOIN (SELECT * FROM mart.finance_snapshot_publications WHERE tenant_id=$1 AND snapshot_date<=$2::date ORDER BY snapshot_date DESC LIMIT 1) publication USING(tenant_id,snapshot_id)`;
   const filters=financeFilters({metric},context,params);input+=` WHERE customer.tenant_id=$1 AND ${filters}`;identity='customer.customer_id';label='customer.label';
  }else{
   params.push(requiredMeasures(metric));const measures=`$${params.length}`;
   const filters=servingFilters({metric},context,params);
   input=`${operationalServingInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY(${measures}::text[]) AND ${filters}`;identity="base.dimensions->>'customer'";label="base.labels->>'customer'";
  }
  params.push(after,`%${search.replace(/[\\%_]/g,'\\$&')}%`,selected);const offset=params.length-2;
  const result=await client.query(`WITH candidates AS MATERIALIZED (SELECT ${identity} id,min(${label}) label FROM ${input} AND ${identity} IS NOT NULL GROUP BY ${identity}),
   page AS (SELECT * FROM candidates WHERE id COLLATE "C">$${offset} AND coalesce(label,'') ILIKE $${offset+1} ESCAPE '\\' ORDER BY id COLLATE "C" LIMIT ${limit+1})
   SELECT 'page' kind,* FROM page UNION ALL SELECT 'selected' kind,* FROM candidates WHERE id=ANY($${offset+2}::text[])`,params);
  const options=(kind:string)=>result.rows.filter(row=>row.kind===kind).map(row=>({id:String(row.id),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  const page=options('page'),values=page.slice(0,limit);
  return {values,selected:options('selected'),...(page.length>limit?{nextCursor:Buffer.from(JSON.stringify({scope,after:values.at(-1)!.id})).toString('base64url')}:{})};
 },true,timeout);
}
function decodeCursor(cursor:string|undefined,scope:string){
 if(!cursor)return '';
 if(cursor.length>2000)throw new Error('Invalid customer continuation');
 try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString());if(parsed.scope!==scope||typeof parsed.after!=='string'||parsed.after.length>500)throw new Error();return parsed.after as string;}catch{throw new Error('Invalid customer continuation');}
}

function discoveryScope(request:DimensionDiscoveryRequest,context:AnalyticsContext,capabilities:PublishedAnalyticsCapabilities){
 const limit=request.limit??50,search=request.search??'',selected=request.selectedIds??[];
 validateDiscoveryBounds(request,limit,search,selected);
 const metric=request.metric??capabilities.releases.flatMap(release=>release.capabilities).find(capability=>capability.dimensions.includes('customer'))?.metric;
 const asOf=request.asOf??capabilities.releases.flatMap(release=>release.period?[release.period.to]:[]).sort().at(-1)??'0001-01-01';
 if(!metric||publishedQueryIssues({metric,groupBy:'customer',filters:[...(context.enforcedFilters??[])],dateRange:{from:asOf,to:asOf}},capabilities).length)throw new Error('Uncertified customer discovery');
 return {limit,search,selected,metric,finance:financeMetric(metric)};
}

function validateDiscoveryBounds(request:DimensionDiscoveryRequest,limit:number,search:string,selected:readonly string[]){
 if(!Number.isInteger(limit)||limit<1||limit>100||search.length>100||selected.length>1000)throw new Error('Invalid bounded customer discovery');
 if(request.asOf&&!validDateRange({from:request.asOf,to:request.asOf}))throw new Error('Invalid customer cutoff');
}
