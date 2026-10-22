import type {FactRevisionChange,AnalyticsCursor,AnalyticsPartition,ProductionFact} from '@el-dabboos/domain';
import type {OperationalBaseline,OperationalSnapshot,OperationDetails,OperationalPage} from './contracts.ts';
import type {SyncContext} from './sync-context.ts';
import {SyncCaptureWorkspace} from './capture-workspace.ts';
import {missingOperationalMonths} from './ingestion.ts';
import {planOperationalFacts,retiredOperationalFacts} from './facts.ts';
import {coveredOperationalFacts} from './ingestion-scope.ts';
import {readLookupDependencyContext} from './lookup-dependency-store.ts';
import {readReceivableDependencyContext} from './receivable-dependency-store.ts';
import {measureOperationalWork} from './progress.ts';
import {CandidateChangeAccumulator} from './candidate-change-summary.ts';

/** Consume and discard each source page after its changes and impact reach SQL staging. */
export async function captureOperationalPages(context:SyncContext,scope:{baseline:OperationalBaseline;source:OperationalSnapshot;cursor:AnalyticsCursor|null;parent:string;details:OperationDetails;resolveImpact:(changes:readonly FactRevisionChange[])=>readonly AnalyticsPartition[]}){
 const {client,tenantId,observe}=context,{baseline,source,cursor,details}=scope;
 const workspace=new SyncCaptureWorkspace(client);await workspace.open();
 const months=(await client.query("SELECT to_char(month,'YYYY-MM') period FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND family='facts'",[tenantId,scope.parent])).rows.map(row=>String(row.period));
 const knownMonths=new Set(months),newMonths=new Set(missingOperationalMonths(baseline,source.cutoff,knownMonths));
 const dependencies=await readReceivableDependencyContext(client,baseline,cursor),lookups=await readLookupDependencyContext(client,baseline,cursor);
 const summary=observe?new CandidateChangeAccumulator():undefined;
 const objects={...cursor?.objects},started=performance.now();
 for await(const page of source.records(baseline,cursor,dependencies,lookups)){
  await workspace.dependencies(page);details.rowsDiscovered+=page.rows;if(page.cursor)objects[page.object]=page.cursor;
  const facts=[...page.facts,...await retirements(context,source,page)];
  await acceptPages(context,{workspace,baseline,facts,knownMonths,newMonths,details,summary,resolveImpact:scope.resolveImpact});
 }
 for(const month of newMonths)for await(const page of source.recordsMonth(baseline,month)){
  details.partitionRowsSeeded=(details.partitionRowsSeeded??0)+page.rows;
  await acceptPages(context,{workspace,baseline,facts:page.facts,knownMonths,newMonths,details,summary,resolveImpact:scope.resolveImpact});
 }
 const result=await workspace.complete();
 details.newRows=result.recordsChanged-result.updatedRows;details.updatedRows=result.updatedRows;
 if(result.receivableRows!==undefined){details.receivableDependencyRows=result.receivableRows;details.receivableDependencyInitialization=!dependencies?.initialized;}
 if(result.lookupRows!==undefined)details.lookupDependencyRows=result.lookupRows;
 details.durations.ingestionMs=performance.now()-started;details.newCursor={cutoff:source.cutoff,objects};
 if(summary)observe?.({step:'mart_candidate_changes',state:'completed',durationMs:details.durations.classificationMs??0,summary:summary.summary()});
 return {...result,cursor:details.newCursor,workspace};
}
async function retirements(context:SyncContext,source:OperationalSnapshot,page:OperationalPage):Promise<ProductionFact[]>{
 const facts:ProductionFact[]=[];
 for(const retired of page.retired??[])facts.push(...await measureOperationalWork(context.observe,'mart_retirement',()=>retiredOperationalFacts(context.client,context.tenantId,retired,source)));
 return facts;
}
async function acceptPages(context:SyncContext,scope:{workspace:SyncCaptureWorkspace;baseline:OperationalBaseline;facts:readonly ProductionFact[];knownMonths:ReadonlySet<string>;newMonths:Set<string>;details:OperationDetails;summary:CandidateChangeAccumulator|undefined;resolveImpact:(changes:readonly FactRevisionChange[])=>readonly AnalyticsPartition[]}){
 // Source adapters can yield several measures per row. Bound canonical pages too.
 for(let offset=0;offset<scope.facts.length;offset+=1000){
  const page=scope.facts.slice(offset,offset+1000),months=new Set([...scope.knownMonths,...scope.newMonths]);
  if(page.some(fact=>fact.tenantId!==context.tenantId))throw new Error('Cross-tenant sync fact');
  const scoped=await measureOperationalWork(context.observe,'mart_scope',()=>coveredOperationalFacts(context.client,context.tenantId,page,months));
  scope.details.outsideCoverageFacts=(scope.details.outsideCoverageFacts??0)+page.length-scoped.length;
  const pending=await scope.workspace.heads(scoped);
  const planned=performance.now();
  const changes=await measureOperationalWork(context.observe,'mart_candidate',()=>planOperationalFacts(context.client,scope.baseline,scoped,{pending,observeProgress:context.observe}));
  scope.details.durations.candidateReadMs=(scope.details.durations.candidateReadMs??0)+performance.now()-planned;
  const classified=performance.now();scope.summary?.add(changes);
  scope.details.durations.classificationMs=(scope.details.durations.classificationMs??0)+performance.now()-classified;
  const partitions=await measureOperationalWork(context.observe,'mart_impact',()=>Promise.resolve(scope.resolveImpact(changes)));
  await scope.workspace.accept(changes,partitions);scope.details.canonicalRevisions+=changes.length;
  for(const {next} of changes)if(next.status==='active'&&!scope.knownMonths.has(next.businessDate.slice(0,7)))scope.newMonths.add(next.businessDate.slice(0,7));
 }
}
