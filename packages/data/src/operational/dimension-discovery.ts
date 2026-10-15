import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsContext,AnalyticsQuery,DateRange,DimensionId,DimensionDiscoveryRequest,DimensionDiscoveryPage,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {dimensionDiscoveryScope} from '../postgres/discovery-scope.ts';
import {sourceDisplayLabel,dimensionLabelField} from '../postgres/query-labels.ts';
import {servingFilters} from './serving-query.ts';
import {isSnapshotQuery} from './coverage.ts';
import {publishedDiscoveryInput} from './discovery-input.ts';
import {financeMetric,financeFilters} from './finance-repository.ts';
/** Bounded, policy-bound keyset discovery. Selected identities hydrate independently of a page. */
export async function discoverTrustedDimensions(pool:Pool,scope:{dimension:DimensionId;context:AnalyticsContext;request:DimensionDiscoveryRequest;capabilities:PublishedAnalyticsCapabilities;timeout:number}):Promise<DimensionDiscoveryPage>{
 const {dimension,context,request,capabilities,timeout}=scope;
 const {limit,search,selected,metric,range}=dimensionDiscoveryScope(dimension,context,request,capabilities);
 const finance=financeMetric(metric);
 const fingerprint=createHash('sha256').update(JSON.stringify({dimension,context,search,metric,range})).digest('hex');
 const after=decodeCursor(request.cursor,fingerprint);
 return tenantTransaction(pool,context.tenantId,async client=>{
  const params:unknown[]=[context.tenantId];
  let input:string,identity:string,label:string;
  if(finance){
   params.push(range?.to??'9999-12-31');
   input=`mart.finance_snapshot_customers customer JOIN (SELECT * FROM mart.trusted_finance_snapshots WHERE tenant_id=$1 AND snapshot_date<=$2::date ORDER BY snapshot_date DESC LIMIT 1) publication USING(tenant_id,snapshot_id)`;
   const filters=financeFilters({metric},context,params);input+=` WHERE customer.tenant_id=$1 AND ${filters}`;identity='customer.customer_id';label='customer.label';
  }else{
   params.push(requiredMeasures(metric));const measures=`$${params.length}`;
   const filters=servingFilters({metric},context,params);
   params.push(dimension,dimensionLabelField(dimension));identity=`base.dimensions->>$${params.length-1}`;label=`base.labels->>$${params.length}`;
   const period=discoveryPeriod(metric,range,params);
   input=`${publishedDiscoveryInput} WHERE trusted.tenant_id=$1 AND base.measure_id=ANY(${measures}::text[]) AND ${filters} ${period}`;
  }
  params.push(after,`%${search.replace(/[\\%_]/g,'\\$&')}%`,selected);const offset=params.length-2;
  const result=await client.query(`WITH candidates AS MATERIALIZED (SELECT ${identity} id,CASE WHEN count(DISTINCT ${label})=1 THEN min(${label}) END label FROM ${input} AND ${identity} IS NOT NULL GROUP BY ${identity}),
   page AS (SELECT * FROM candidates WHERE id COLLATE "C">$${offset} AND (coalesce(label,'') ILIKE $${offset+1} ESCAPE '\\' OR id ILIKE $${offset+1} ESCAPE '\\') ORDER BY id COLLATE "C" LIMIT ${limit+1})
   SELECT 'page' kind,* FROM page UNION ALL SELECT 'selected' kind,* FROM candidates WHERE id=ANY($${offset+2}::text[])`,params);
  const options=(kind:string)=>result.rows.filter(row=>row.kind===kind).map(row=>({id:String(row.id),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  const page=options('page'),values=page.slice(0,limit);
  return {values,selected:options('selected'),...(page.length>limit?{nextCursor:Buffer.from(JSON.stringify({scope:fingerprint,after:values.at(-1)!.id})).toString('base64url')}:{})};
 },true,timeout);
}
function decodeCursor(cursor:string|undefined,scope:string){
 if(!cursor)return '';
 if(cursor.length>2000)throw new Error('Invalid dimension continuation');
 try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString());if(parsed.scope!==scope||typeof parsed.after!=='string'||parsed.after.length>500)throw new Error();return parsed.after as string;}catch{throw new Error('Invalid dimension continuation');}
}


function discoveryPeriod(metric:AnalyticsQuery['metric'],range:DateRange|undefined,params:unknown[]){
 if(!range)return '';
 const through=`$${params.push(range.to)}::date`;
 if(isSnapshotQuery({metric}))return `AND base.business_date=(SELECT max(selected.business_date) FROM ${publishedDiscoveryInput.replace(/\bbase\b/g,'selected')} WHERE trusted.tenant_id=$1 AND selected.measure_id=ANY($2::text[]) AND selected.business_date<=${through})`;
 return `AND base.business_date BETWEEN $${params.push(range.from)}::date AND ${through}`;
}
