import type { Pool } from 'pg';
import type { AnalyticsCursor, AnalyticsPartition, AnalyticsOperationalSource, IngestionBatch } from '@el-dabboos/domain';
import { OdooSnapshotLease } from '../odoo/snapshot.ts';
import { OdooPostgresSourceBatchReader } from '../odoo/reader.ts';
import { mapOdooRecord } from '../odoo/mapper.ts';
import { odooIncrementalWindow } from '../odoo/incremental-watermark.ts';
import {measureOperationalWork} from './progress.ts';
import type {OperationalProgressObserver} from './progress.ts';
import type { OdooSourceConfig } from '../odoo/config.ts';
import type { OperationalBaseline, OperationalSnapshot } from './contracts.ts';
import { readExactEventControls } from './source-controls.ts';
import { receivableChangedFrom,readReceivableSnapshot,receivableControls,snapshotMetric,monthEnd } from './receivables.ts';

/** Dedicated owner and page pools keep the retained snapshot alive throughout the job. */
export class OdooOperationalSource implements AnalyticsOperationalSource {
 constructor(private readonly owner:Pool,private readonly reader:Pool,private readonly config:OdooSourceConfig,private readonly versions:{mappingVersion:string;definitionVersion:string},private readonly observeProgress?:OperationalProgressObserver) {}
 async open(tenantId:string):Promise<OdooOperationalSnapshot> {
  if(tenantId!==this.config.tenantId)throw new Error('Unauthorized operational source');
  const lease=await OdooSnapshotLease.open(this.owner,this.config,this.config.snapshotMaxDurationMs,this.config.credentialPolicy);
  return new OdooOperationalSnapshot(this.reader,this.config,lease,this.versions,{count:1,observeProgress:this.observeProgress});
 }
}
export class OdooOperationalSnapshot implements OperationalSnapshot {
 private closing:Promise<void>|undefined;
 private readonly snapshotControls=new Map<string,Record<string,string>>();
 readonly cutoff:string;readonly revision:string;readonly mappingVersion:string;readonly definitionVersion:string;
 constructor(private readonly pool:Pool,private readonly config:OdooSourceConfig,private readonly lease:OdooSnapshotLease,versions:{mappingVersion:string;definitionVersion:string},private readonly references:{count:number;observeProgress:OperationalProgressObserver|undefined}={count:1,observeProgress:undefined}) {
  this.cutoff=lease.evidence.sourceAsOf;this.revision=lease.evidence.frozenRevision;this.mappingVersion=versions.mappingVersion;this.definitionVersion=versions.definitionVersion;
 }
 close(){return this.closing??=this.closeSource();}
 retain(){if(this.closing)throw new Error('Closed operational snapshot');this.references.count++;return new OdooOperationalSnapshot(this.pool,this.config,this.lease,this,this.references);}
 private async closeSource(){try{await this.lease.assertAlive();}finally{if(--this.references.count===0)await this.lease.close();}}
 async *records(baseline:OperationalBaseline,cursor:AnalyticsCursor|null) {
  const window=odooIncrementalWindow(cursor,this.cutoff);
  for(const object of ['sale_order','account_move'] as const) {
   const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.sourceObject===object));
   if(!mapping)throw new Error('Approved operational object mapping required');
   const scope={object,from:baseline.from,to:baseline.to,timeZone:mapping.measures[0]!.timeZone,...this.lease.evidence,mode:'incremental' as const,modificationFrom:window.modificationFrom};
   const reader=new OdooPostgresSourceBatchReader(this.pool,this.config,scope,this.lease);
   let position:string|undefined;
   do {
    const page=await measureOperationalWork(this.references.observeProgress,'source_page',()=>reader.readBatch({...this.config,limit:this.config.batchSize,frozenRevision:this.revision,...(position?{cursor:position}:{})}));
    const batch=operationalBatch(mapping,this.config,this.lease);
    const retired=page.rows.filter(row=>row.object==='account_move'&&row.payload.state!=='posted'&&!row.payload.business_date);
    const facts=page.rows.filter(row=>!retired.includes(row)).flatMap(row=>mapOdooRecord(row,mapping,batch));
    yield {object,cursor:page.nextCursor??page.watermarkEnd??position,facts,rows:page.rows.length,retired:retired.map(row=>({object:row.object,id:row.recordId,version:row.version,revision:row.revision,updatedAt:row.sourceUpdatedAt!}))};
    position=page.nextCursor;
   }while(position);
  }
  yield* this.snapshots(baseline,cursor);
 }
 async *recordsMonth(baseline:OperationalBaseline,month:string) {
  for(const object of ['sale_order','account_move'] as const) {
   const mapping=baseline.mappings.find(mapping=>mapping.measures.some(rule=>rule.sourceObject===object));if(!mapping)throw new Error('Approved partition mapping required');
   const reader=new OdooPostgresSourceBatchReader(this.pool,this.config,{object,from:`${month}-01`,to:monthEnd(month),timeZone:mapping.measures[0]!.timeZone,...this.lease.evidence},this.lease);
   let position:string|undefined;
   do {
    const page=await measureOperationalWork(this.references.observeProgress,'source_page',()=>reader.readBatch({...this.config,limit:this.config.batchSize,frozenRevision:this.revision,...(position?{cursor:position}:{})}));
    yield {object,facts:page.rows.flatMap(row=>mapOdooRecord(row,mapping,operationalBatch(mapping,this.config,this.lease))),rows:page.rows.length};
    position=page.nextCursor;
   }while(position);
  }
 }
 async *snapshots(baseline:OperationalBaseline,cursor:AnalyticsCursor|null,force=false) {
  if(!baseline.mappings.some(mapping=>mapping.measures.some(rule=>rule.measureId==='net_aged_receivable')))return;
  const changed=force?baseline.from:await measureOperationalWork(this.references.observeProgress,'source_receivable_discovery',()=>receivableChangedFrom(this.pool,this.lease,this.config,cursor));
  if(!changed)return;
  // Phase-A summaries have no component-level previous-date ledger. Every published
  // cutoff is the smallest provably complete dependency set for a possible date move.
  const dependencyFrom=baseline.from;
  for(let month=baseline.from.slice(0,7);month<=baseline.to.slice(0,7);month=followingMonth(month)) {
   const cutoff=monthEnd(month);if(cutoff<dependencyFrom||(baseline.coveredMonths&&!baseline.coveredMonths.includes(month)))continue;
   const result=await measureOperationalWork(this.references.observeProgress,'source_receivable_snapshot',()=>readReceivableSnapshot(this.pool,this.lease,this.config,baseline,cutoff));
   this.snapshotControls.set(month,result.expected);
   yield {object:'receivable_cutoff',facts:result.facts,rows:1};
  }
 }
 async controls(baseline:OperationalBaseline,partitions:readonly AnalyticsPartition[]) {
  const eventControls=await readExactEventControls(this.pool,this.lease,this.config,baseline,partitions.filter(partition=>!snapshotMetric(partition.metric)));
  for(const month of new Set(partitions.filter(partition=>snapshotMetric(partition.metric)).map(partition=>partition.month))) {
   if(!this.snapshotControls.has(month)){const result=await readReceivableSnapshot(this.pool,this.lease,this.config,baseline,monthEnd(month));this.snapshotControls.set(month,result.expected);}
  }
  return [...eventControls,...receivableControls(partitions,this.snapshotControls)];
 }
 async *presence(object:string,pages:AsyncIterable<readonly string[]>) {
  if(!['sale_order','account_move'].includes(object))throw new Error('Governed presence object required');
  const client=await this.pool.connect();
  try {
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await this.lease.importInto(client);
   await client.query("SELECT set_config('statement_timeout',$1,true)",[String(this.config.statementTimeoutMs)]);
   for await(const ids of pages) {
    if(ids.length>1000||ids.some(id=>!/^\d+$/.test(id)))throw new Error('Bounded presence IDs required');
    const result=await client.query(`SELECT id::text FROM ${object} WHERE company_id=ANY($1::int[]) AND id=ANY($2::bigint[])`,[this.config.companyIds,ids]);
    this.lease.assertScope(this.lease.evidence,this.config);yield {ids,present:result.rows.map(row=>String(row.id))};
   }
   await this.lease.assertAlive();await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async present(object:string,ids:readonly string[]) {
  if(!['sale_order','account_move'].includes(object)||ids.length>1000||ids.some(id=>!/^\d+$/.test(id)))throw new Error('Bounded governed presence scope required');
  const client=await this.pool.connect();
  try {
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await this.lease.importInto(client);
   await client.query("SELECT set_config('statement_timeout',$1,true)",[String(this.config.statementTimeoutMs)]);
   const result=await client.query(`SELECT id::text FROM ${object} WHERE company_id=ANY($1::int[]) AND id=ANY($2::bigint[])`,[this.config.companyIds,ids]);
   await this.lease.assertAlive();await client.query('COMMIT');return result.rows.map(row=>String(row.id));
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
function operationalBatch(mapping:OperationalBaseline['mappings'][number],config:OdooSourceConfig,lease:OdooSnapshotLease):IngestionBatch {
 return {...config,datasetId:mapping.datasetId,mappingId:mapping.mappingId,mappingVersion:mapping.mappingVersion,batchId:lease.evidence.freezeReference,adapterVersion:'operational-odoo-pg-v1',startedAt:lease.evidence.sourceAsOf,sourceAsOf:lease.evidence.sourceAsOf,frozenRevision:lease.evidence.frozenRevision,status:'running',rowsRead:0,rowsAccepted:0,rowsRejected:0,factsInserted:0,factsUpdated:0,factsTombstoned:0,factsReplayed:0};
}

function followingMonth(month:string){const date=new Date(`${month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1);return date.toISOString().slice(0,7);}
