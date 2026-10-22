import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {AnalyticsPartition,FactRevisionChange,ProductionFact} from '@el-dabboos/domain';
import type {OperationalPage} from './contracts.ts';
import {operationalFactKey} from './facts.ts';
import type {SyncContext} from './sync-context.ts';
import {measureOperationalWork} from './progress.ts';

/** Transaction-local database staging. No source page survives in a JS-wide buffer.
 * This is not a resumable source snapshot: only the final sealed capture commits.
 */
export class SyncCaptureWorkspace {
 private readonly dependencyPages={receivable:0,lookup:0};
 private readonly dependencyRows={receivable:0,lookup:0};
 private receivablesComplete=false;
 private lookupProjection:string|null=null;
 constructor(private readonly client:PoolClient){}
 async open(){
  await this.client.query(`CREATE TEMP TABLE sync_capture_heads (
   fact_key text PRIMARY KEY,revision_id text NOT NULL,payload jsonb NOT NULL
  ) ON COMMIT DROP`);
  await this.client.query(`CREATE TEMP TABLE sync_capture_identities (
   source_object text,source_record_id text,has_previous boolean NOT NULL,
   PRIMARY KEY(source_object,source_record_id)
  ) ON COMMIT DROP`);
  await this.client.query('CREATE TEMP TABLE sync_capture_partitions (partition jsonb PRIMARY KEY) ON COMMIT DROP');
  await this.client.query('CREATE TEMP TABLE sync_capture_days (day text PRIMARY KEY) ON COMMIT DROP');
  await this.client.query(`CREATE TEMP TABLE sync_capture_dependencies (
   kind text,page integer,payload jsonb NOT NULL,PRIMARY KEY(kind,page)
  ) ON COMMIT DROP`);
 }
 async heads(facts:readonly ProductionFact[]):Promise<Map<string,ProductionFact>>{
  if(!facts.length)return new Map();
  const rows=(await this.client.query('SELECT fact_key,payload FROM pg_temp.sync_capture_heads WHERE fact_key=ANY($1::text[])',[facts.map(operationalFactKey)])).rows;
  return new Map(rows.map(row=>[row.fact_key,row.payload]));
 }
 async accept(changes:readonly FactRevisionChange[],partitions:readonly AnalyticsPartition[]){
  if(!changes.length)return;
  const heads=new Map<string,{key:string;revision:string;payload:ProductionFact}>(),days=new Set<string>();
  for(const {previous,next} of changes){
   const key=operationalFactKey(next);
   heads.set(key,{key,revision:createHash('sha256').update(JSON.stringify(next)).digest('hex'),payload:next});
   if(previous)days.add(previous.businessDate);days.add(next.businessDate);
  }
  await this.client.query(`INSERT INTO pg_temp.sync_capture_heads
   SELECT record.key,record.revision,record.payload FROM jsonb_to_recordset($1::jsonb) record(key text,revision text,payload jsonb) WHERE true
   ON CONFLICT(fact_key) DO UPDATE SET revision_id=EXCLUDED.revision_id,payload=EXCLUDED.payload`,[JSON.stringify([...heads.values()])]);
  await this.client.query(`INSERT INTO pg_temp.sync_capture_identities
   SELECT record.object,record.id,record.previous FROM jsonb_to_recordset($1::jsonb) record(object text,id text,previous boolean) WHERE true
   ON CONFLICT DO NOTHING`,[JSON.stringify(changes.map(({previous,next})=>({object:next.sourceObject,id:next.sourceRecordId,previous:!!previous})))]);
  await this.client.query('INSERT INTO pg_temp.sync_capture_days SELECT unnest($1::text[]) ON CONFLICT DO NOTHING',[[...days]]);
  await this.client.query('INSERT INTO pg_temp.sync_capture_partitions SELECT value FROM jsonb_array_elements($1::jsonb) WHERE true ON CONFLICT DO NOTHING',[JSON.stringify(partitions)]);
 }
 async dependencies(page:OperationalPage){
  for(const [kind,records] of [['receivable',page.receivableDependencies],['lookup',page.lookupDependencies]] as const){
   if(!records)continue;
   for(let offset=0;offset<records.length;offset+=1000)await this.dependencyPage(kind,records.slice(offset,offset+1000));
  }
  if(page.receivableDependenciesComplete)this.receivablesComplete=true;
  if(page.lookupProjectionVersion){
   if(this.lookupProjection&&this.lookupProjection!==page.lookupProjectionVersion)throw new Error('Conflicting captured lookup projection');
   this.lookupProjection=page.lookupProjectionVersion;
  }
 }
 async complete(){
  if(this.dependencyPages.receivable&&!this.receivablesComplete)throw new Error('Incomplete receivable dependency discovery');
  if(this.dependencyPages.lookup&&!this.lookupProjection)throw new Error('Incomplete lookup dependency discovery');
  if(this.receivablesComplete&&!this.dependencyPages.receivable)await this.dependencyPage('receivable',[]);
  if(this.lookupProjection&&!this.dependencyPages.lookup)await this.dependencyPage('lookup',[]);
  const counts=(await this.client.query(`SELECT count(*)::int records,
   count(*) FILTER(WHERE has_previous)::int updated FROM pg_temp.sync_capture_identities`)).rows[0];
  const partitions=(await this.client.query('SELECT partition FROM pg_temp.sync_capture_partitions ORDER BY partition')).rows.map(row=>row.partition as AnalyticsPartition);
  const days=(await this.client.query('SELECT day FROM pg_temp.sync_capture_days ORDER BY day')).rows.map(row=>String(row.day));
  const heads=(await this.client.query('SELECT count(*)::int count FROM pg_temp.sync_capture_heads')).rows[0].count;
  return {recordsChanged:counts.records as number,updatedRows:counts.updated as number,expectedHeads:heads as number,partitions,days,
   receivablePages:this.dependencyPages.receivable,lookupPages:this.dependencyPages.lookup,lookupProjection:this.lookupProjection,
   receivableRows:this.receivablesComplete?this.dependencyRows.receivable:undefined,lookupRows:this.lookupProjection?this.dependencyRows.lookup:undefined};
 }
 async persist(context:SyncContext,candidateId:string){
  let after='';
  for(;;){
   const last=await this.persistHeadPage(context,candidateId,after);
   if(!last)break;after=last;
  }
  await this.client.query(`INSERT INTO mart.analytics_sync_dependencies
   SELECT $1,$2,kind,page,payload FROM pg_temp.sync_capture_dependencies`,[context.tenantId,candidateId]);
 }
 private async dependencyPage(kind:'receivable'|'lookup',records:readonly unknown[]){
  await this.client.query('INSERT INTO pg_temp.sync_capture_dependencies VALUES($1,$2,$3)',[kind,this.dependencyPages[kind],JSON.stringify(records)]);
  this.dependencyPages[kind]++;this.dependencyRows[kind]+=records.length;
 }
 private async persistHeadPage(context:SyncContext,candidateId:string,after:string):Promise<string|undefined>{
  const page=await measureOperationalWork(context.observe,'mart_revision_write',()=>this.client.query(`WITH selected AS MATERIALIZED (
   SELECT fact_key,revision_id,payload FROM pg_temp.sync_capture_heads WHERE fact_key>$2 ORDER BY fact_key LIMIT 1000
  ), written AS (
   INSERT INTO mart.analytics_fact_revisions(tenant_id,fact_key,revision_id,payload)
   SELECT $1,fact_key,revision_id,payload FROM selected WHERE true ON CONFLICT DO NOTHING
  ) SELECT max(fact_key) last_key FROM selected`,[context.tenantId,after]));
  const last=page.rows[0]?.last_key;if(!last)return;
  await measureOperationalWork(context.observe,'mart_head_write',()=>this.client.query(`INSERT INTO mart.analytics_sync_heads
   SELECT $1,$2,fact_key,revision_id,left(payload->>'businessDate',7),payload->>'measureId',payload->>'status',payload->>'sourceObject',payload->>'sourceRecordId'
   FROM pg_temp.sync_capture_heads WHERE fact_key>$3 AND fact_key<=$4`,[context.tenantId,candidateId,after,last]));
  return last;
 }
}
