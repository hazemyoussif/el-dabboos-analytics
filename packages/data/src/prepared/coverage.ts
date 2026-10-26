import {createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AnalyticsPublicationChangedError,CustomerProductCoverageUnavailable,validateCoverageInput,validateCoverageFilters,validateCustomerProductPopulationBasis} from '@el-dabboos/domain';
import type {AnalyticsContext,CustomerProductCoverageInput,CustomerProductCoverageRepository,CustomerProductCoverageResult,CustomerProductCoverageRow,DimensionId} from '@el-dabboos/domain';
import {tenantTransaction} from '../postgres/session.ts';
import {sourceDisplayLabel} from '../postgres/display-labels.ts';
import {coverageSelectionSql} from './coverage-sql.ts';
interface Binding {revision_id:string;data_id:string;inputs:Record<string,unknown>}
interface CoverageObservation {businessDay:string;sourceAsOf:string;sourceRevision:string}
interface RawRow {
 entity_key:string;item_key:string;amount:string;recorded:boolean;forecast:string;
 customer_dimensions:Record<string,string>;customer_labels:Record<string,string>;
 product_dimensions:Record<string,string>;product_labels:Record<string,string>;tags:Array<{id:string;label:string|null}>;
}
interface RawResult {rows:RawRow[];total:string;sold:string;unsold:string;excluded:string}
export class PreparedCustomerProductCoverage implements CustomerProductCoverageRepository {
 constructor(private readonly pool:Pool,private readonly timeout=15000){}
 async readCoverage(input:CustomerProductCoverageInput,context:AnalyticsContext):Promise<CustomerProductCoverageResult>{
  validateCoverageInput(input);validateCoverageFilters(context.enforcedFilters);
  const result=await tenantTransaction(this.pool,context.tenantId,client=>readCoverage(client,{input,context}),true,this.timeout);
  const current=await tenantTransaction(this.pool,context.tenantId,async client=>(await client.query('SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1',[context.tenantId])).rows[0]?.revision_id,true,this.timeout);
  if(result.revision!==current)throw new AnalyticsPublicationChangedError();
  return result;
 }
}
async function coverageBinding(client:PoolClient,tenantId:string){
 const binding=(await client.query<Binding>(`SELECT binding.* FROM mart.prepared_population_bindings binding
  JOIN mart.analytics_trusted_serving trusted USING(tenant_id,revision_id)
  JOIN mart.prepared_revision_seals seal USING(tenant_id,revision_id)
  JOIN mart.prepared_activation activation USING(tenant_id)
  WHERE binding.tenant_id=$1 AND binding.definition_id='customer-products-v1'`,[tenantId])).rows[0];
 if(!binding)throw new CustomerProductCoverageUnavailable();
 return binding;
}
async function readCoverage(client:PoolClient,scope:{input:CustomerProductCoverageInput;context:AnalyticsContext}){
 const {input,context}=scope,binding=await coverageBinding(client,context.tenantId);
 await client.query("SELECT set_config('jit','off',true)");
 const yearStates=(await client.query<{year:string}>(`SELECT DISTINCT dimensions->>'coverage_year' AS year FROM mart.business_prepared_cells($1,
  $2::jsonb->'axes'->'entity'->>'data_id',$2::jsonb->'axes'->'entity'->>'grain_id','cutoff',ARRAY['coverage_customer_population'],
  ($2::jsonb->>'through')::date,($2::jsonb->>'through')::date) WHERE fact_count>0 ORDER BY year`,[context.tenantId,JSON.stringify(binding.inputs)])).rows;
 const basis=binding.inputs.basis;validateCustomerProductPopulationBasis(basis);
 const years=[...basis.years].sort((first,second)=>first-second);
 const year=input.year??years.at(-1);
 if(year===undefined||!years.includes(year))throw new CustomerProductCoverageUnavailable();
 const status=input.status??'all',limit=input.limit??100,filters=[...(input.filters??[]),...(context.enforcedFilters??[])];
 const fingerprint=createHash('sha256').update(JSON.stringify([context,binding.revision_id,year,status,filters])).digest('hex');
 const after=decodeCoverageCursor(input.cursor,fingerprint);
 const partition=yearStates.find(row=>Number(row.year.split(':').at(-1))===year)?.year??String(year);
 const raw=(await client.query<{result:RawResult}>(coverageSelectionSql,[context.tenantId,JSON.stringify(binding.inputs),binding.data_id,partition,JSON.stringify(filters),status,...after,limit+1])).rows[0]!.result;
 const page=raw.rows.slice(0,limit),last=page.at(-1);
 const observation=binding.inputs.observation as CoverageObservation|undefined;
 if(!observation?.businessDay||!observation.sourceAsOf)throw new CustomerProductCoverageUnavailable();
 return {rows:page.map(row=>coverageRow(row,context)),years,year,through:observation.businessDay,sourceAsOf:observation.sourceAsOf,revision:binding.revision_id,
 total:Number(raw.total),sold:Number(raw.sold),unsold:Number(raw.unsold),excludedProducts:Number(raw.excluded),
 ...(observation.sourceRevision.startsWith('orm-observed-copy-v1:')?{sourceConsistency:'api_observed' as const}:{}),
 ...(raw.rows.length>limit&&last?{nextCursor:Buffer.from(JSON.stringify({scope:fingerprint,after:[last.entity_key,last.item_key]})).toString('base64url')}:{})};
}
function coverageRow(row:RawRow,context:AnalyticsContext):CustomerProductCoverageRow {
 const caption=(dimension:DimensionId)=>{
  const customer=['customer','customer_salesperson','customer_state'].includes(dimension),dimensions=customer?row.customer_dimensions:row.product_dimensions,labels=customer?row.customer_labels:row.product_labels;
  const id=dimensions[dimension]??'unassigned';return {id,label:labels[dimension]?sourceDisplayLabel(labels[dimension],context.locale):id};
 };
 return {customer:caption('customer'),salesperson:caption('customer_salesperson'),state:caption('customer_state'),tags:row.tags.map(tag=>({id:tag.id,label:tag.label?sourceDisplayLabel(tag.label,context.locale):tag.id})),product:caption('product'),category:caption('product_category'),brand:caption('brand'),uom:caption('uom'),forecast:row.forecast,netQuantity:String(row.amount),status:Number(row.amount)>0?'sold':'unsold',recorded:row.recorded};
}
function decodeCoverageCursor(cursor:string|undefined,fingerprint:string):[string,string]{
 if(!cursor)return ['',''];
 try{
  const value=JSON.parse(Buffer.from(cursor,'base64url').toString());
  if(value.scope!==fingerprint||!Array.isArray(value.after)||value.after.length!==2||value.after.some((key:unknown)=>typeof key!=='string'||key.length>200))throw new Error();
  return value.after;
 }catch{throw new AnalyticsPublicationChangedError();}
}
