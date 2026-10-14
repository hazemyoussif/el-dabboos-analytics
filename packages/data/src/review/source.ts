import {reviewBusinessDate} from './cutoff.ts';
import type {Pool,PoolClient} from 'pg';
import type {SourceMapping,ProductionFact} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import {reviewSourceSql} from './source-sql.ts';
import type {ReviewSourceFamily} from './source-sql.ts';
import {mapReviewRow} from './mapper.ts';
import type {ReviewSourceRow} from './mapper.ts';
export interface ReviewControl {measure:string;dimensions:Record<string,string>|null;value:string;count:string|null}
export class OdooReviewReader {
 constructor(private readonly pool:Pool,private readonly config:OdooSourceConfig,private readonly lease:OdooSnapshotLease,private readonly scope:{month:string;mapping:SourceMapping}){
  if(!Number.isInteger(config.batchSize)||config.batchSize<1||config.batchSize>1000)throw new Error('Bounded review source page size required');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month)||monthEnd(scope.month)>reviewBusinessDate(lease.evidence.sourceAsOf,scope.mapping.measures[0]!.timeZone))throw new Error('Completed review month required');
  if(scope.mapping.tenantId!==config.tenantId||scope.mapping.sourceId!==config.sourceId)throw new Error('Review source identity conflict');
  lease.assertScope(lease.evidence,config);
 }
 async *facts():AsyncIterable<ProductionFact[]> {
  for(const family of ['payments','orders','products','due'] as const)yield* this.familyFacts(family);
 }
 private async *familyFacts(family:ReviewSourceFamily):AsyncIterable<ProductionFact[]> {
  const client=await this.pool.connect();let broken=false;
  try{
   await this.begin(client);
   // Transaction-local cursor: one source calculation, bounded fetches, no source DDL/DML.
   await client.query(`DECLARE review_source NO SCROLL CURSOR FOR WITH source AS (${reviewSourceSql(family)}) SELECT source.*,jsonb_strip_nulls(jsonb_build_object(
     'customer',(SELECT name FROM res_partner WHERE id=source.customer::int),
     'salesperson',(SELECT partner.name FROM res_users rep JOIN res_partner partner ON partner.id=rep.partner_id WHERE rep.id=source.salesperson::int),
     'businessLine',(SELECT name::text FROM business_line WHERE id=source.business_line::int AND company_id=source.company_id::int),
     'product',(SELECT template.name::text FROM product_product product JOIN product_template template ON template.id=product.product_tmpl_id WHERE product.id=source.product::int),
     'product_category',(SELECT name::text FROM product_category WHERE id=source.product_category::int))) labels
     FROM source ORDER BY source_object,source_record_id,component_id,measure_id`,this.parameters(family));
   for(;;){
    await this.lease.assertAlive();
    const rows=(await client.query(`FETCH FORWARD ${this.config.batchSize} FROM review_source`)).rows;
    await this.lease.assertAlive();
    if(!rows.length)break;
    yield rows.map(row=>mapReviewRow(row as ReviewSourceRow,this.scope.mapping,{cutoff:this.lease.evidence.sourceAsOf,revision:this.lease.evidence.frozenRevision,companyIds:this.config.companyIds}));
   }
  }finally{
   // Also runs when a consumer stops early or mapping/persistence fails.
   try{await client.query('ROLLBACK');}catch{broken=true;}finally{client.release(broken);}
  }
 }
 async controls():Promise<ReviewControl[]> {
  const controls:ReviewControl[]=[];
  for(const family of ['payments','orders','products','due'] as const){
   const rows=await this.read(family,(sql,params)=>{
    params.push(this.config.sourceId);const source=`$${params.length}::text`;
    const dimensions=family==='orders'?['customer','salesperson','business_line']:family==='products'?['customer','salesperson','business_line','product','product_category']:['customer'];
    const pairs=dimensions.flatMap(dimension=>[`'${dimension}'`,`CASE WHEN ${dimension} IS NULL THEN 'unassigned' ELSE ${source}||':'||${dimension==='business_line'?"company_id||':'||":''}${dimension} END`]).join(',');
    return `WITH source AS (${sql}),scoped AS (SELECT *,jsonb_build_object(${pairs}) dimensions FROM source)
     SELECT measure_id,dimensions,sum(value::numeric)::numeric(30,6)::text value,count(*)::text count,bool_or(invalid) invalid
     FROM scoped GROUP BY GROUPING SETS ((measure_id,dimensions),(measure_id))`;
   });
   if(rows.some(row=>row.invalid))throw new Error('Independent review source quality control failed');
   controls.push(...rows.map(row=>({measure:String(row.measure_id),dimensions:row.dimensions as Record<string,string>|null,value:String(row.value),count:String(row.count)})));
  }
  const summary=await this.headerControls();
  for(const header of summary){const existing=controls.find(control=>control.measure===header.measure&&control.dimensions===null);if((existing?.value??'0.000000')!==header.value)throw new Error('Product lines do not reconcile to invoice headers');}
  for(const rule of this.scope.mapping.measures)if(!controls.some(control=>control.measure===rule.measureId&&control.dimensions===null))controls.push({measure:rule.measureId,dimensions:null,value:'0.000000',count:'0'});
  return controls;
 }
 private async headerControls():Promise<ReviewControl[]> {
  const client=await this.pool.connect();
  try{
   await this.begin(client);
   const rows=(await client.query(`SELECT value.measure_id,coalesce(sum(value.amount),0)::numeric(30,6)::text value
    FROM account_move record CROSS JOIN LATERAL (VALUES ('net_invoiced_revenue',record.amount_untaxed_signed),
    ('invoiced_revenue',CASE WHEN move_type='out_invoice' THEN amount_untaxed_signed ELSE 0 END),
    ('refund_value',CASE WHEN move_type='out_refund' THEN -amount_untaxed_signed ELSE 0 END)) value(measure_id,amount)
    WHERE company_id=ANY($1::int[]) AND state='posted' AND move_type IN ('out_invoice','out_refund')
    AND invoice_date BETWEEN $2::date AND $3::date GROUP BY value.measure_id`,[this.config.companyIds,this.scope.month+'-01',monthEnd(this.scope.month)])).rows;
   await this.lease.assertAlive();await client.query('COMMIT');
   return rows.map(row=>({measure:String(row.measure_id),dimensions:null,value:String(row.value),count:null}));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 private async read(family:ReviewSourceFamily,build:(sql:string,params:unknown[])=>string) {
  const params=this.parameters(family);
  // Parameter types are explicit even when a closed recipe does not use timezone/date operands.
  const sql=build(reviewSourceSql(family),params),client=await this.pool.connect();
  try{await this.begin(client);const rows=(await client.query(sql,params)).rows;await this.lease.assertAlive();await client.query('COMMIT');return rows;}
  catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 private parameters(family:ReviewSourceFamily):unknown[] {
  if(this.config.companyIds.length!==1)throw new Error('Review extraction requires one explicit source company');
  const params:unknown[]=family==='due'?[this.config.companyIds[0],monthEnd(this.scope.month)]:[this.config.companyIds,this.scope.month+'-01',monthEnd(this.scope.month),this.scope.mapping.measures[0]!.timeZone];
  if(family==='payments')params.push(reviewBusinessDate(this.lease.evidence.sourceAsOf,this.scope.mapping.measures[0]!.timeZone));
  return params;
 }
 private async begin(client:PoolClient){
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await this.lease.importInto(client);
  await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(this.config.statementTimeoutMs)]);
 }
}
function monthEnd(month:string){return new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);}
