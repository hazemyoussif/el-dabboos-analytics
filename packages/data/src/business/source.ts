import {BusinessSourceLabels} from './labels.ts';
import type {Pool,PoolClient} from 'pg';
import {requiredMeasures,semanticCatalog,validateProductionFact} from '@el-dabboos/domain';
import type {ProductionFact,SourceMapping,DimensionId,FactMeasureId} from '@el-dabboos/domain';
import type {OdooSourceConfig} from '../odoo/config.ts';
import type {OdooSnapshotLease} from '../odoo/snapshot.ts';
import type {ReviewControl} from '../review/source.ts';
import {reviewBusinessDate} from '../review/cutoff.ts';
import {invoiceRecipe,cashRecipe,invoiceQuantityRecipe} from './source-recipes.ts';
import {customerRecipe,receivableRecipe} from './customer-recipes.ts';
import {stockRecipe,movementRecipe,unbilledRecipe,cashLedgerRecipe,payableRecipe} from './stock-recipes.ts';
import {businessSourceObject,currentBusinessMetrics} from './definitions.ts';
interface SourceVector {id:string;business_date:string;company_id:number;currency:string;invalid:boolean;dimensions:Partial<Record<DimensionId,string|null>>;values:Partial<Record<FactMeasureId,string>>}
interface SourceRow {id:string;business_date:string;company_id:number;currency:string;measure_id:FactMeasureId;value:string;invalid:boolean;dimensions:Partial<Record<DimensionId,string|null>>;labels?:ProductionFact['displayLabels']}
const recipes=[['business_invoice_quantity',invoiceQuantityRecipe],['business_invoice',invoiceRecipe],['business_cash',cashRecipe],['business_customer',customerRecipe],['business_receivable',receivableRecipe],['business_stock',stockRecipe],['business_movement',movementRecipe],['business_sale_exception',unbilledRecipe(false)],['business_purchase_exception',unbilledRecipe(true)],['business_cash_ledger',cashLedgerRecipe],['business_payable',payableRecipe]] as const;
/** One exported, bounded read-only source snapshot; independent aggregate controls precede promotion. */
export class OdooBusinessReader {
 private readonly end:string;
 private readonly day:string;
 private readonly labels:BusinessSourceLabels;
 constructor(private readonly pool:Pool,private readonly config:OdooSourceConfig,private readonly lease:OdooSnapshotLease,private readonly scope:{month:string;mapping:SourceMapping}){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month)||config.companyIds.length!==1||config.batchSize<1||config.batchSize>1000)throw new Error('Explicit bounded business scope required');
  lease.assertScope(lease.evidence,config);
  this.labels=new BusinessSourceLabels(config.sourceId);
  if(scope.mapping.tenantId!==config.tenantId||scope.mapping.sourceId!==config.sourceId)throw new Error('Business source identity conflict');
  this.day=reviewBusinessDate(lease.evidence.sourceAsOf,scope.mapping.measures[0]!.timeZone);
  if(scope.month>this.day.slice(0,7))throw new Error('Future business period unavailable');
  if(scope.month!==this.day.slice(0,7)&&scope.mapping.capabilities.some(capability=>currentBusinessMetrics.includes(capability.metric as import('@el-dabboos/domain').BusinessMetricId)))throw new Error('Current snapshots cannot load into past months');
  const end=new Date(Date.UTC(Number(scope.month.slice(0,4)),Number(scope.month.slice(5)),0)).toISOString().slice(0,10);
  this.end=end<this.day?end:this.day;
 }
 async *facts():AsyncIterable<ProductionFact[]> {
  for(const [object,sql] of recipes){
   if(!this.scope.mapping.measures.some(rule=>rule.sourceObject===object))continue;
   const client=await this.pool.connect();let broken=false;const onError=()=>{broken=true;};client.on('error',onError);
   try{
    await this.begin(client);
    await client.query(`DECLARE business_source NO SCROLL CURSOR FOR ${this.vectorSql(sql)}`,this.parameters());
    for(;;){
     this.lease.assertActive();const rows=(await client.query(`FETCH FORWARD ${this.config.batchSize} FROM business_source`)).rows as SourceVector[];
     if(!rows.length)break;
     this.assertRows(rows);const labels=await this.labels.read(client,rows);await this.lease.assertAlive();
     const facts=rows.flatMap((row,index)=>Object.entries(row.values).map(([measure,value])=>this.map({id:row.id,business_date:row.business_date,company_id:row.company_id,currency:row.currency,invalid:row.invalid,dimensions:row.dimensions,measure_id:measure as FactMeasureId,value:value!,labels:labels[index]})));
     for(let offset=0;offset<facts.length;offset+=this.config.batchSize)yield facts.slice(offset,offset+this.config.batchSize);
    }
   }finally{try{await client.query('ROLLBACK');}catch{broken=true;}finally{client.removeListener('error',onError);client.release(broken);}}
  }
 }
 async controls():Promise<ReviewControl[]> {
  const controls:ReviewControl[]=[];
  for(const [object,sql] of recipes){
   if(!this.scope.mapping.measures.some(rule=>rule.sourceObject===object))continue;
   const client=await this.pool.connect();let broken=false;const onError=()=>{broken=true;};client.on('error',onError);
   try{
    await this.begin(client);
    await client.query(`DECLARE business_controls NO SCROLL CURSOR FOR WITH facts AS (${this.wrapped(sql)}) SELECT measure_id,dimensions,sum(value::numeric)::numeric(30,6)::text value,count(*)::text count,bool_or(invalid) invalid FROM facts GROUP BY GROUPING SETS ((measure_id,dimensions),(measure_id))`,this.parameters());
    for(;;){
     this.lease.assertActive();const rows=(await client.query(`FETCH FORWARD ${this.config.batchSize} FROM business_controls`)).rows;
     if(!rows.length)break;
     if(rows.some(row=>row.invalid))throw new Error('Independent business source quality failure');
     controls.push(...rows.map(row=>({measure:row.measure_id,dimensions:row.dimensions,value:row.value,count:row.count})));
     if(controls.length>500128)throw new Error('Bounded business source controls exceeded');
    }
    await this.lease.assertAlive();
   }finally{try{await client.query('ROLLBACK');}catch{broken=true;}client.removeListener('error',onError);client.release(broken);}
  }
  await this.assertInvoiceHeaders(controls);
  for(const rule of this.scope.mapping.measures)if(!controls.some(control=>control.measure===rule.measureId&&control.dimensions===null))controls.push({measure:rule.measureId,dimensions:null,value:'0.000000',count:'0'});
  return controls;
 }
 private parameters(){return [Number(this.config.companyIds[0]),this.scope.month+'-01',this.end,this.scope.mapping.measures[0]!.timeZone,this.day,this.lease.evidence.sourceAsOf,this.config.sourceId,this.scope.mapping.measures.map(rule=>rule.measureId),JSON.stringify(this.scope.mapping.measures)];}
 private vectorSql(sql:string){
  return `WITH source AS (${sql}),vectors AS(
   SELECT id,business_date,company_id,currency,dimensions,bool_or(invalid) invalid,jsonb_object_agg(measure_id,amount::numeric(30,6)::text) values
   FROM source WHERE $6::timestamptz IS NOT NULL AND measure_id=ANY($8::text[]) GROUP BY id,business_date,company_id,currency,dimensions
  ) SELECT id,business_date::text,company_id,currency,invalid,values,(SELECT jsonb_object_agg(dimension.key,CASE WHEN dimension.value IS NULL OR dimension.value IN('unknown','ambiguous') THEN coalesce(dimension.value,'unassigned') ELSE $7::text||':'||dimension.value END) FROM jsonb_each_text(vectors.dimensions) dimension) dimensions
  FROM vectors WHERE $9::jsonb IS NOT NULL`;
 }
 private wrapped(sql:string){
  return `WITH source AS (${sql}) SELECT source.id,source.business_date::text,source.company_id,source.currency,source.measure_id,source.amount::numeric(30,6)::text value,source.invalid,
   (SELECT jsonb_object_agg(dimension.key,CASE WHEN dimension.value IS NULL OR dimension.value IN('unknown','ambiguous') THEN coalesce(dimension.value,'unassigned') ELSE $7::text||':'||dimension.value END)
    FROM jsonb_each_text(source.dimensions) dimension WHERE rule."dimensionMappings"?dimension.key) dimensions
   FROM source JOIN jsonb_to_recordset($9::jsonb) rule("measureId" text,"dimensionMappings" jsonb) ON rule."measureId"=source.measure_id WHERE $6::timestamptz IS NOT NULL AND source.measure_id=ANY($8::text[])`;
 }
 private assertRows(rows:readonly Pick<SourceRow,'invalid'|'currency'|'company_id'>[]){if(rows.some(row=>row.invalid!==false||row.currency!==this.scope.mapping.reportingCurrency||String(row.company_id)!==this.config.companyIds[0]))throw new Error('Business source quality/scope failure');}
 private map(row:SourceRow):ProductionFact {
  const mapping=this.scope.mapping,rule=mapping.measures.find(rule=>rule.measureId===row.measure_id)!;
  if(row.invalid!==false||row.currency!==mapping.reportingCurrency||String(row.company_id)!==this.config.companyIds[0])throw new Error('Business source quality/scope failure');
  const snapshot=Object.values(semanticCatalog).some(metric=>metric.semantics.kind==='snapshot'&&metric.semantics.measure===row.measure_id);
  const monetary=Object.values(semanticCatalog).some(metric=>metric.type==='currency'&&requiredMeasures(metric.id).includes(row.measure_id));
  const fact:ProductionFact={tenantId:mapping.tenantId,datasetId:mapping.datasetId,measureId:row.measure_id,kind:snapshot?'snapshot':'event',businessDate:row.business_date,value:row.value,dimensions:Object.fromEntries(Object.keys(rule.dimensionMappings).map(dimension=>[dimension,row.dimensions[dimension as DimensionId]])) as ProductionFact['dimensions'],sourceId:mapping.sourceId,sourceObject:businessSourceObject(row.measure_id),sourceRecordId:row.id,componentId:'whole',sourceVersion:this.lease.evidence.sourceAsOf,sourceRevision:String(BigInt(Date.parse(this.lease.evidence.sourceAsOf))*1000n),mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:mapping.datasetId,sourceAsOf:this.lease.evidence.sourceAsOf,frozenRevision:this.lease.evidence.frozenRevision,status:'active',...(snapshot?{entityId:`${rule.sourceObject}:${row.id}`} :{}),...(row.labels?{displayLabels:row.labels}:{}),...(monetary?{currency:{mode:'native',transactionCurrency:row.currency,transactionValue:row.value,reportingCurrency:row.currency,policyReference:rule.currencyPolicy}}:{})};
  validateProductionFact(fact,mapping);return fact;
 }
 private async begin(client:PoolClient){await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await this.lease.importInto(client);await client.query("SELECT set_config('statement_timeout',$1,true),set_config('TimeZone','UTC',true)",[String(this.config.statementTimeoutMs)]);}
 private async assertInvoiceHeaders(controls:ReviewControl[]){
  const client=await this.pool.connect();let broken=false;const onError=()=>{broken=true;};client.on('error',onError);
  try{
   await this.begin(client);
   const rows=(await client.query(`SELECT value.measure_id,coalesce(sum(value.amount),0)::numeric(30,6)::text amount FROM account_move record
    CROSS JOIN LATERAL(VALUES ('period_net_sales',record.amount_untaxed_signed),('period_invoice_sales',CASE WHEN move_type='out_invoice' THEN amount_untaxed_signed ELSE 0 END),('period_invoice_refunds',CASE WHEN move_type='out_refund' THEN -amount_untaxed_signed ELSE 0 END)) value(measure_id,amount)
    WHERE record.company_id=$1 AND record.state='posted' AND record.move_type IN('out_invoice','out_refund') AND record.invoice_date BETWEEN $2::date AND $3::date GROUP BY value.measure_id`,[Number(this.config.companyIds[0]),this.scope.month+'-01',this.end])).rows;
   for(const row of rows)if((controls.find(control=>control.measure===row.measure_id&&control.dimensions===null)?.value??'0.000000')!==row.amount)throw new Error('Independent invoice header reconciliation failed');
   await this.lease.assertAlive();
  }finally{try{await client.query('ROLLBACK');}catch{broken=true;}client.removeListener('error',onError);client.release(broken);}
 }
}
