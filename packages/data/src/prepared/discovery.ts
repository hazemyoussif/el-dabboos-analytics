import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import type {AnalyticsContext,DimensionId,DimensionDiscoveryRequest,DimensionDiscoveryPage,PublishedAnalyticsCapabilities} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {dimensionDiscoveryScope} from '../postgres/discovery-scope.ts';
import {sourceDisplayLabel} from '../postgres/display-labels.ts';
import {preparedPublication,preparedQueryRelease} from './publication-metadata.ts';
import {planPreparedRead} from './read-plan.ts';
import type {PreparedBinding} from './read-plan.ts';
import {preparedReduction} from './read-sql.ts';
import {preparedMetricBasis} from '@el-dabboos/domain';
export async function discoverPreparedDimensions(pool:Pool,scope:{dimension:DimensionId;context:AnalyticsContext;request:DimensionDiscoveryRequest;capabilities:PublishedAnalyticsCapabilities;timeout:number}):Promise<DimensionDiscoveryPage>{
 const {dimension,context,request,capabilities,timeout}=scope,selection=dimensionDiscoveryScope(dimension,context,request,capabilities);
 return tenantTransaction(pool,context.tenantId,async client=>{
  await client.query("SELECT set_config('jit','off',true)");
  const publication=await preparedPublication(client,context),query={metric:selection.metric,groupBy:dimension,...(selection.range?{dateRange:selection.range}:{})};
  const {family,release}=preparedQueryRelease(query,context,publication),range=selection.range??release.period!;
  const fingerprint=createHash('sha256').update(JSON.stringify([dimension,context,selection.search,selection.metric,range,publication.revision])).digest('hex');
  const after=decodeCursor(request.cursor,fingerprint);
  const bindings=(await client.query<PreparedBinding>(`SELECT binding.data_id,binding.period::text,binding.statistics,binding.source_cutoff,dataset.configuration
   FROM mart.prepared_bindings binding JOIN mart.prepared_datasets dataset USING(tenant_id,data_id)
   WHERE binding.tenant_id=$1 AND binding.revision_id=$2 AND binding.family=$3 AND binding.kind=$4 ORDER BY binding.period`,[context.tenantId,publication.revision,family,preparedMetricBasis(query.metric)])).rows;
  const segments=planPreparedRead(bindings,query,context,[{key:null,match_key:null,from:range.from,to:range.to}]),input=preparedReduction(query,context,segments,true,family);
  const params=[...input.params,after,selection.search,selection.selected,selection.limit+1],offset=input.params.length;
  const result=await client.query(`WITH candidates AS MATERIALIZED (${input.text}),page AS (
   SELECT * FROM candidates WHERE key COLLATE "C">$${offset+1}::text COLLATE "C" AND (position(lower($${offset+2}) in lower(coalesce(label,'')))>0 OR position(lower($${offset+2}) in lower(key))>0)
   ORDER BY key COLLATE "C" LIMIT $${offset+4})
   SELECT 'page' kind,key,label FROM page UNION ALL SELECT 'selected' kind,key,label FROM candidates WHERE key=ANY($${offset+3}::text[])`,params);
  const options=(kind:string)=>result.rows.filter(row=>row.kind===kind).map(row=>({id:String(row.key),...(row.label?{label:sourceDisplayLabel(row.label,context.locale)}:{})}));
  const page=options('page'),values=page.slice(0,selection.limit);
  return {values,selected:options('selected'),...(page.length>selection.limit?{nextCursor:Buffer.from(JSON.stringify({scope:fingerprint,after:values.at(-1)!.id})).toString('base64url')}:{})};
 },true,timeout);
}
function decodeCursor(cursor:string|undefined,scope:string){
 if(!cursor)return '';
 if(cursor.length>2000)throw new Error('Invalid dimension continuation');
 try{const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString());if(parsed.scope!==scope||typeof parsed.after!=='string'||parsed.after.length>500)throw new Error();return parsed.after as string;}catch{throw new Error('Invalid dimension continuation');}
}
