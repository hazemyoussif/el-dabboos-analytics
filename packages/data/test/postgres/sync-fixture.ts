import {randomUUID} from 'node:crypto';
import {requiredMeasures} from '@el-dabboos/domain';
import type {AnalyticsPartition,ProductionFact} from '@el-dabboos/domain';
import {CheckpointedAnalyticsSync} from '../../../application/src/analytics-sync.ts';
import {database} from './support.ts';
import {deploy,mapping,fact} from './fixtures.ts';
import {tenantTransaction} from '../../src/postgres/session.ts';
import {bootstrapOperationalServing,readBaseline} from '../../src/operational/baseline.ts';
import {PostgresCheckpointedSyncStore} from '../../src/operational/sync-store.ts';
import {prepareRevision} from '../../src/prepared/preparation.ts';
import type {OperationalSnapshot,ExactControl} from '../../src/operational/contracts.ts';
import type {OperationalProgressObserver} from '../../src/operational/progress.ts';

export const request={tenantId:'a',actorId:'synthetic-sync',kind:'sync' as const,trigger:'operator' as const};
export const impact={through:'2026-12-31',movingAverageWindows:[],runningTotals:false,yearOverYear:false,contribution:false,snapshotDependencies:()=>[]};
export async function syncFixture(prepared=false){
 const db=await database();
 try {
  await deploy(db.migrator,mapping());await bootstrapOperationalServing(db.migrator,'a');
  const baseline=await tenantTransaction(db.ingestor,'a',client=>readBaseline(client,'a'),true);
  const initial=await acceptedState(db);
  if(prepared){
   const bounds={maxCellsPerChunk:50000,maxChunks:100};
   await tenantTransaction(db.ingestor,'a',client=>prepareRevision(client,{tenantId:'a',revisionId:initial.release},bounds));
   await tenantTransaction(db.migrator,'a',client=>client.query('INSERT INTO mart.prepared_activation VALUES($1,$2,$3,$4)',['a',initial.release,bounds.maxCellsPerChunk,bounds.maxChunks]));
  }
  let opens=0,closes=0;
  const state={changed:[syntheticFact('one','2026-01-15'),syntheticFact('two','2026-02-15')],population:[] as ProductionFact[],failControls:false,interrupt:false};
  state.population=state.changed;
  const snapshot:OperationalSnapshot={cutoff:'2026-03-01T00:00:00.000Z',revision:'synthetic-freeze',definitionVersion:baseline.definitionVersion,mappingVersion:baseline.mappingVersion,
   close:async()=>{closes++;},
   async *records(){
    yield {object:'fixture',cursor:'synthetic-cursor',facts:state.changed.map(row=>({...row,sourceAsOf:snapshot.cutoff,frozenRevision:snapshot.revision})),rows:state.changed.length,
     receivableDependencies:[{object:'account_move_line',id:'1',from:'2026-01-15'}],receivableDependenciesComplete:true,
     lookupDependencies:[{object:'business_line',id:'1',fingerprint:'a'.repeat(64)}],lookupProjectionVersion:'b'.repeat(64)};
    if(state.interrupt)throw new Error('Synthetic capture interruption');
   },
   async *recordsMonth(){yield* [];},async *snapshots(){yield* [];},async *presence(){yield* [];},present:async(_object,ids)=>ids,
   controls:async(_baseline,partitions)=>controls(state.population,partitions,state.failControls)};
  const source={open:async()=>{opens++;return snapshot;}};
  const run=(observe?:OperationalProgressObserver)=>new CheckpointedAnalyticsSync({store:new PostgresCheckpointedSyncStore(db.ingestor,observe),source,impact,clock:()=>new Date(),runId:randomUUID}).run(request);
  return {db,baseline,initial,state,snapshot,source,run,opens:()=>opens,closes:()=>closes};
 }catch(error){await db.close();throw error;}
}
export function syntheticFact(id:string,date:string,patch:Partial<ProductionFact>={}):ProductionFact{
 return fact(id,{businessDate:date,sourceRevision:'2',sourceVersion:'synthetic-update',displayLabels:{businessLine:'SYNTHETIC ORIGINAL'},...patch});
}
function controls(facts:ProductionFact[],partitions:readonly AnalyticsPartition[],fail:boolean):ExactControl[]{
 const seen=new Set<string>();
 return partitions.flatMap(partition=>requiredMeasures(partition.metric).flatMap(measure=>{
  const key=JSON.stringify([partition.month,partition.dimension,partition.identity,measure]);if(seen.has(key))return [];seen.add(key);
  const selected=facts.filter(row=>row.status==='active'&&row.measureId===measure&&row.businessDate.slice(0,7)===partition.month&&(!partition.dimension||row.dimensions[partition.dimension]===partition.identity));
  const value=selected.reduce((sum,row)=>sum+Number(row.value),0)+(fail?1:0);
  return [{partition,measure,value:value.toFixed(6),count:String(selected.length)}];
 }));
}
export async function acceptedState(db:Awaited<ReturnType<typeof database>>){
 const release=(await db.admin.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id='a'")).rows[0].revision_id as string;
 const cursor=(await db.admin.query("SELECT run_id,cutoff,object_cursors FROM mart.analytics_source_cursors WHERE tenant_id='a'")).rows;
 const heads=(await db.admin.query("SELECT fact_key,revision_id FROM mart.analytics_fact_heads WHERE tenant_id='a' ORDER BY fact_key")).rows;
 const dependencies=(await db.admin.query("SELECT run_id,cutoff FROM mart.analytics_receivable_dependency_checkpoints WHERE tenant_id='a'")).rows;
 const lookups=(await db.admin.query("SELECT run_id,cutoff FROM mart.analytics_lookup_dependency_checkpoints WHERE tenant_id='a'")).rows;
 return {release,cursor,heads,dependencies,lookups};
}
