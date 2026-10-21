import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import type {AnalyticsPartition,ProductionFact} from '@el-dabboos/domain';
import type {OperationalBaseline,OperationalSnapshot} from '../../src/operational/contracts.ts';
import {captureSyncCandidate} from '../../src/operational/sync-capture.ts';
import {SyncContext} from '../../src/operational/sync-context.ts';
import {fact,mapping} from '../postgres/fixtures.ts';

// Explicit opt-in command: node --max-old-space-size=2048 --experimental-transform-types
// --disable-warning=ExperimentalWarning --test packages/data/test/performance/sync-capture-memory.test.ts
// This exercises real capture/planning/serialization with a recording SQL boundary.
// Database sealing/RLS/rollback are verified separately by checkpointed-sync tests.
test('570k-change source capture fits a 2 GiB heap and preserves final heads and bounded writes',{timeout:180000},async()=>{
 assert.ok(process.execArgv.includes('--max-old-space-size=2048'),'Run with the approved 2 GiB heap limit');
 const population=570000,previousPopulation=366671,pageSize=500;
 const m=mapping(),cutoff='2026-02-28T12:00:00.000Z';
 const partition:AnalyticsPartition={metric:'revenue',month:'2026-02',dimension:null,identity:null,dependency:'base'};
 const baseline:OperationalBaseline={tenantId:'a',sourceId:m.sourceId,reportingCurrency:'IQD',datasets:[m.datasetId],mappingVersion:m.mappingVersion,definitionVersion:'synthetic-definition',
  mappings:[m],from:'2026-02-01',to:'2026-02-28',capabilities:{tenantId:'a',mode:'synthetic',releases:[{
   datasetId:m.datasetId,sourceId:m.sourceId,mappingId:m.mappingId,mappingVersion:m.mappingVersion,certificationReference:'SYNTHETIC ONLY',
   capabilities:m.capabilities.map(capability=>({...capability,summary:true,analyses:[]}))}]}};
 let currentPage:ProductionFact[]=[],closed=false,committed=false,sealed=false,pending=false;
 let revisionCount=0,headCount=0,receivableCount=0,lookupCount=0,dependencyPages=0,peakHeapBytes=0;
 let finalFact:ProductionFact|undefined,finalHeadRevision:string|undefined;
 const sample=()=>{peakHeapBytes=Math.max(peakHeapBytes,process.memoryUsage().heapUsed);};
 const client={query:async(text:string,values:unknown[]=[])=>{
  sample();let rows:Record<string,unknown>[]=[];
  if(text.startsWith('SELECT revision_id FROM mart.analytics_trusted_serving'))rows=[{revision_id:'synthetic-parent'}];
  else if(text.startsWith('SELECT to_char(month'))rows=[{period:'2026-02'}];
  else if(text.startsWith('SELECT head.fact_key,revision.payload')){
   rows=currentPage.filter(row=>Number(row.sourceRecordId)<previousPopulation).map(next=>{
    const previous=JSON.parse(JSON.stringify(next)) as ProductionFact;
    previous.sourceRevision='1';previous.sourceVersion='synthetic-previous';
    previous.transaction!.labels!.businessLine='SYNTHETIC OLD LINE';
    return {fact_key:JSON.stringify(['a','fixture','fixture',next.sourceRecordId,'whole','revenue']),payload:previous};
   });
  }else if(text.startsWith('INSERT')){
   assert.ok(closed,'No capture payload writes before source handoff');
   if(text.startsWith('INSERT INTO mart.analytics_fact_revisions')){
    const records=JSON.parse(String(values[1])) as {payload:ProductionFact}[];
    assert.ok(records.length<=10000);revisionCount+=records.length;
   }else if(text.startsWith('INSERT INTO mart.analytics_sync_heads')){
    const records=JSON.parse(String(values[2])) as {key:string;revision:string}[];
    assert.ok(records.length<=10000);headCount+=records.length;
    for(const record of records)if(record.key===JSON.stringify(['a','fixture','fixture',String(population-1),'whole','revenue']))finalHeadRevision=record.revision;
   }else if(text.startsWith('INSERT INTO mart.analytics_sync_dependencies')){
    const records=JSON.parse(String(values[4])) as unknown[];
    assert.ok(records.length<=1000);dependencyPages++;
    if(values[2]==='receivable')receivableCount+=records.length;else lookupCount+=records.length;
   }else if(text.startsWith('INSERT INTO mart.analytics_sync_seals'))sealed=true;
   else if(text.startsWith('INSERT INTO mart.analytics_sync_pending'))pending=true;
  }else if(text==='COMMIT')committed=true;
  else if(text==='ROLLBACK')assert.fail('Capture unexpectedly rolled back');
  return {rows,rowCount:rows.length};
 }} as unknown as PoolClient;
 const source:OperationalSnapshot={cutoff,revision:'synthetic-memory-capture',definitionVersion:baseline.definitionVersion,mappingVersion:m.mappingVersion,
  async *records(){
   for(let offset=0;offset<population;offset+=pageSize){
    currentPage=Array.from({length:Math.min(pageSize,population-offset)},(_,index)=>captureFact(String(offset+index),cutoff));
    yield {object:'fixture',facts:currentPage,rows:currentPage.length,cursor:String(offset+currentPage.length),
     receivableDependencies:currentPage.map(row=>({object:'account_move_line' as const,id:row.sourceRecordId,from:row.businessDate})),receivableDependenciesComplete:offset+pageSize>=population,
     lookupDependencies:offset<1500?currentPage.map(row=>({object:'customer' as const,id:row.sourceRecordId,fingerprint:'a'.repeat(64)})):[],lookupProjectionVersion:'b'.repeat(64)};
   }
   finalFact={...captureFact(String(population-1),cutoff),sourceRevision:'3',sourceVersion:'synthetic-final',businessDate:'2026-02-16',status:'tombstone'};
   currentPage=[finalFact];yield {object:'fixture',facts:currentPage,rows:1,cursor:'synthetic-final'};
  },
  async *recordsMonth(){yield* [];},async *snapshots(){yield* [];},async *presence(){yield* [];},present:async(_object,ids)=>ids,
  controls:async()=>{assert.equal(closed,false);return [{partition,measure:'revenue',value:`${(population-1)*100}.000000`,count:String(population-1)}];},
  close:async()=>{closed=true;}};
 const context=new SyncContext(client,'a',sample);context.baseline=async()=>baseline;
 const candidate=await captureSyncCandidate(context,{source,request:{tenantId:'a',actorId:'synthetic-memory',kind:'sync',trigger:'operator'},identity:{runId:'synthetic-memory-run',startedAt:cutoff},
  resolveImpact:()=>[partition],releaseSource:()=>source.close()});
 assert.ok(committed&&sealed&&pending);assert.equal(candidate.expectedHeads,population);assert.equal(candidate.recordsChanged,population);
 assert.equal(revisionCount,population+1);assert.equal(headCount,population);assert.deepEqual(candidate.days,['2026-02-15','2026-02-16']);
 assert.equal(receivableCount,population);assert.equal(lookupCount,1500);assert.equal(dependencyPages,candidate.receivablePages+candidate.lookupPages);
 assert.equal(finalHeadRevision,createHash('sha256').update(JSON.stringify(finalFact)).digest('hex'));
 sample();process.stdout.write(`capture-memory ${JSON.stringify({changes:revisionCount,finalHeads:headCount,heapCapMiB:2048,observedPeakHeapMiB:Math.ceil(peakHeapBytes/1024/1024),maxRssKiB:process.resourceUsage().maxRSS})}\n`);
});
function captureFact(id:string,cutoff:string):ProductionFact{
 return fact(id,{sourceRevision:'2',sourceVersion:'synthetic-current',sourceAsOf:cutoff,frozenRevision:'synthetic-memory-capture',transaction:{
  sourceCompanyId:'fixture-company',state:'confirmed',documentType:'synthetic',paymentState:null,untaxedAmount:'100.000000',taxAmount:'0.000000',totalAmount:'100.000000',currency:'IQD',
  labels:{customer:`SYNTHETIC CUSTOMER ${id}`,salesperson:'SYNTHETIC SALES',businessLine:'SYNTHETIC NEW LINE',state:null},area:null,relatedLines:[],location:{latitude:null,longitude:null,shopGps:null}}});
}
