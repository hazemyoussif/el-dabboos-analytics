import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsOperations } from '../src/analytics-operations.ts';
import type { AnalyticsCursor, AnalyticsJobRun, AnalyticsOperationalStore, AnalyticsOperationalTransaction, ProductionFact, FactRevisionChange } from '@el-dabboos/domain';

const previous: ProductionFact = {tenantId:'a',datasetId:'release',sourceId:'source',sourceObject:'account_move',sourceRecordId:'1',componentId:'whole',measureId:'net_invoiced_revenue',kind:'event',businessDate:'2026-01-15',value:'100.000000',dimensions:{salesperson:'A'},sourceVersion:'v1',sourceRevision:'1',mappingId:'map',mappingVersion:'1',batchId:'batch',sourceAsOf:'2026-01-31T00:00:00Z',frozenRevision:'freeze',status:'active'};
const next={...previous,value:'120.000000',sourceVersion:'v2',sourceRevision:'2',sourceAsOf:'2026-10-08T00:00:00Z',dimensions:{salesperson:'B'}};
const request={tenantId:'a',actorId:'admin',trigger:'manual' as const,kind:'sync' as const};

function fixture(options: { mismatch?:boolean; failure?:string; unchanged?:boolean; changes?:FactRevisionChange[] } = {}) {
  let state:{cursor:AnalyticsCursor|null;release:string;runs:AnalyticsJobRun[];fact:ProductionFact}={cursor:null,release:'trusted-september',runs:[],fact:previous};
  const calls:string[]=[],phases:string[]=[];
  const store:AnalyticsOperationalStore={
    async transaction(tenantId,operation) {
      assert.equal(tenantId,'a');
      const candidate=structuredClone(state);
      const step=(name:string)=>{calls.push(name);if(options.failure===name)throw new Error(`Synthetic ${name} failure`);};
      const transaction:AnalyticsOperationalTransaction={
        cursor:async()=>candidate.cursor,trustedRelease:async()=>candidate.release,
        ingest:async(snapshot)=>{step('ingest');const unchanged=options.unchanged || candidate.fact.sourceRevision===next.sourceRevision;candidate.fact=next;return {changes:unchanged?[]:options.changes??[{previous,next}],recordsChanged:unchanged?0:1,cursor:{cutoff:snapshot.cutoff,objects:{account_move:'modification-cursor'}}};},
        sweep:async()=>{step('sweep');return [{previous,next:{...next,status:'tombstone'}}];},
        reconcile:async(_snapshot,partitions)=>{step('reconcile');const changed=options.changes?.[0];const expected=changed?.previous??changed?.next??previous;assert.ok(partitions.some(partition=>partition.month===expected.businessDate.slice(0,7) && partition.dimension==='salesperson' && partition.identity===expected.dimensions.salesperson));return {caseIds:['source-mart-exact'],caseCount:1,mismatchCount:options.mismatch?1:0,evidenceHash:'immutable-exact-evidence'};},
        refresh:async(partitions)=>{step('refresh');assert.ok(partitions.every(partition=>partition.month!=='2026-10'));return 'trusted-correction';},
        promote:async(release,evidence)=>{step('promote');assert.equal(evidence.mismatchCount,0);candidate.release=release;},
        commitCursor:async(cursor)=>{step('cursor');candidate.cursor=cursor;},
        record:async(run)=>{step('audit');candidate.runs.push(run);},
        discardCandidate:async()=>{step('discard');candidate.fact=state.fact;},
      };
      const result=await operation(transaction);state=candidate;return result;
    },
    recordFailure:async()=>{calls.push('failure-audit');},
  };
  const jobs=new AnalyticsOperations({store,source:{open:async()=>({cutoff:'2026-10-08T00:00:00Z',revision:'frozen-source',mappingVersion:'1',definitionVersion:'1',close:async()=>{calls.push('source-close');if(options.failure==='source-close')throw new Error('Synthetic source-close failure');}})},impact:{through:'2026-09-30',movingAverageWindows:[3],runningTotals:true,yearOverYear:false,contribution:true,snapshotDependencies:()=>[]},clock:()=>new Date('2026-10-08T00:00:01Z'),runId:()=> 'run-1'},phase=>{phases.push(phase);});
  return {jobs,calls,phases,state:()=>state};
}

test('historical correction reconciles and refreshes old partitions before atomic promotion/cursor/audit',async()=>{
  const setup=fixture();const result=await setup.jobs.run(request);
  assert.equal(result.status,'passed');assert.equal(result.recordsChanged,1);assert.equal(result.actorId,'admin');
  assert.equal(setup.state().release,'trusted-correction');assert.equal(setup.state().fact.value,'120.000000');
  assert.deepEqual(setup.calls,['ingest','reconcile','source-close','refresh','promote','audit','cursor']);
  assert.equal(setup.phases.at(-1),'mart_commit');assert.ok(setup.phases.indexOf('source_handoff')<setup.phases.indexOf('prepare_and_publish'));
});
test('failed exact reconciliation stores investigation evidence and preserves serving/cursor',async()=>{
  const setup=fixture({mismatch:true});const result=await setup.jobs.run(request);
  assert.equal(result.status,'failed');assert.equal(result.servingRelease,'trusted-september');
  assert.equal(setup.state().cursor,null);assert.equal(setup.state().fact.value,'100.000000');assert.equal(setup.state().runs[0]?.mismatchCount,1);
  assert.deepEqual(setup.calls,['ingest','reconcile','source-close','discard','audit']);
});
for(const failure of ['ingest','reconcile','source-close','refresh','promote','audit','cursor'])test(`${failure} failure rolls back serving and cursor and remains retryable`,async()=>{
  const setup=fixture({failure});await assert.rejects(setup.jobs.run(request),/Synthetic/);
  assert.equal(setup.state().cursor,null);assert.equal(setup.state().release,'trusted-september');assert.equal(setup.state().runs.length,0);
  assert.ok(setup.calls.includes('failure-audit'));assert.ok(!setup.phases.includes('mart_commit'));
  if(['refresh','promote','audit','cursor'].includes(failure)){
   assert.ok(setup.calls.indexOf('source-close')<setup.calls.indexOf(failure));
   assert.equal(setup.calls.filter(call=>call==='source-close').length,1,'offline failure must not reopen or recheck the source');
  }else assert.equal(setup.calls.at(-1),'source-close');
  if(failure==='source-close')assert.ok(!setup.calls.includes('refresh')&&!setup.calls.includes('promote')&&!setup.calls.includes('cursor'));
});
test('zero changes skips expensive reconciliation and aggregate refresh',async()=>{
  const setup=fixture({unchanged:true});const result=await setup.jobs.run(request);
  assert.equal(result.status,'unchanged');assert.equal(result.caseCount,0);
  assert.deepEqual(setup.calls,['ingest','source-close','audit','cursor']);
});
test('presence sweep reconciles tombstone impact without advancing modification cursor',async()=>{
  const setup=fixture();const result=await setup.jobs.run({...request,kind:'sweep'});
  assert.equal(result.status,'passed');assert.equal(setup.state().cursor,null);assert.ok(setup.calls.includes('sweep'));assert.ok(!setup.calls.includes('ingest'));
});

test('idempotent rerun performs no new validation or promotion',async()=>{
 const setup=fixture();await setup.jobs.run(request);setup.calls.length=0;
 const result=await setup.jobs.run(request);assert.equal(result.status,'unchanged');assert.equal(result.recordsChanged,0);
 assert.deepEqual(setup.calls,['ingest','source-close','audit','cursor']);
});
test('new records and current business-period updates use the same deterministic lifecycle',async()=>{
 for(const changes of [[{next}],[{previous:{...previous,businessDate:'2026-09-15'},next:{...next,businessDate:'2026-09-15'}}]]) {
  const setup=fixture({changes});const result=await setup.jobs.run(request);assert.equal(result.status,'passed');assert.equal(result.recordsChanged,1);assert.equal(setup.state().release,'trusted-correction');
 }
});
