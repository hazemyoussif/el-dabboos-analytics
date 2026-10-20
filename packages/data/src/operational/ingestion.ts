import {OperationalDependencyCandidate} from './dependency-candidate.ts';
import {readLookupDependencyContext} from './lookup-dependency-store.ts';
import type { PoolClient } from 'pg';
import type { AnalyticsCursor,FactRevisionChange,ProductionFact } from '@el-dabboos/domain';
import type { OperationDetails,OperationalBaseline,OperationalSnapshot } from './contracts.ts';
import { planOperationalFacts,retiredOperationalFacts } from './facts.ts';
import {readReceivableDependencyContext} from './receivable-dependency-store.ts';
import { coveredOperationalFacts } from './ingestion-scope.ts';
import {measureOperationalWork} from './progress.ts';
import type {OperationalProgressObserver} from './progress.ts';
/** New calendar partitions need a complete initial base; existing months use changed identities only. */
export async function ingestOperationalCandidate(client:PoolClient,scope:{baseline:OperationalBaseline;source:OperationalSnapshot;cursor:AnalyticsCursor|null;details:OperationDetails;parent:string|null;observeProgress?:OperationalProgressObserver|undefined}) {
 const {baseline,source,cursor,details,parent,observeProgress}=scope;
 const start=performance.now(),objects={...cursor?.objects};details.previousCursor=cursor;
 const months=(await client.query("SELECT to_char(month,'YYYY-MM') AS period FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND family='facts'",[baseline.tenantId,parent])).rows.map(row=>String(row.period));
 const knownMonths=new Set(months);
 const candidate=new CandidateFacts(client,baseline,details,knownMonths,observeProgress);
 const dependencyContext=await readReceivableDependencyContext(client,baseline,cursor);
 const dependencies=new OperationalDependencyCandidate();
 const lookupContext=await readLookupDependencyContext(client,baseline,cursor);
 for(const month of missingOperationalMonths(baseline,source.cutoff,knownMonths))candidate.newMonths.add(month);
 for await(const page of source.records(baseline,cursor,dependencyContext,lookupContext)) {
  dependencies.accept(page);
  details.rowsDiscovered+=page.rows;if(page.cursor)objects[page.object]=page.cursor;
  const facts=[...page.facts];for(const retired of page.retired??[])facts.push(...await measureOperationalWork(observeProgress,'mart_retirement',()=>retiredOperationalFacts(client,baseline.tenantId,retired,source)));
  await candidate.accept(facts);
 }
 for(const month of candidate.newMonths)for await(const page of source.recordsMonth(baseline,month)) {
  details.partitionRowsSeeded=(details.partitionRowsSeeded??0)+page.rows;await candidate.accept(page.facts);
 }
 details.canonicalRevisions=candidate.changes.length;details.durations.ingestionMs=performance.now()-start;
 details.newCursor={cutoff:source.cutoff,objects};
 return {changes:candidate.changes,cursor:details.newCursor,recordsChanged:candidate.identities.size,
  ...dependencies.complete(details,dependencyContext?.initialized??false)};
}
class CandidateFacts {
 private readonly pending=new Map<string,ProductionFact>();
 readonly changes:FactRevisionChange[]=[];readonly newMonths=new Set<string>();readonly identities=new Set<string>();
 constructor(private readonly client:PoolClient,private readonly baseline:OperationalBaseline,private readonly details:OperationDetails,private readonly knownMonths:ReadonlySet<string>,private readonly observeProgress?:OperationalProgressObserver){}
 async accept(facts:readonly ProductionFact[]) {
  const months=new Set([...this.knownMonths,...this.newMonths]);
  const scoped=await measureOperationalWork(this.observeProgress,'mart_scope',()=>coveredOperationalFacts(this.client,this.baseline.tenantId,facts,months));
  this.details.outsideCoverageFacts=(this.details.outsideCoverageFacts??0)+facts.length-scoped.length;
  const start=performance.now();
  const changes=await measureOperationalWork(this.observeProgress,'mart_candidate',()=>planOperationalFacts(this.client,this.baseline,scoped,{observeProgress:this.observeProgress,pending:this.pending}));
  this.details.durations.candidateReadMs=(this.details.durations.candidateReadMs??0)+performance.now()-start;
  for(const change of changes) {
   const fact=change.next;
   if(fact.status==='active'&&!this.knownMonths.has(fact.businessDate.slice(0,7)))this.newMonths.add(fact.businessDate.slice(0,7));
   this.changes.push(change);const key=JSON.stringify([fact.sourceObject,fact.sourceRecordId]);
   if(!this.identities.has(key)){this.identities.add(key);if(change.previous)this.details.updatedRows++;else this.details.newRows++;}
  }
 }
}

export function missingOperationalMonths(
 baseline:Pick<OperationalBaseline,'to'|'mappings'>,
 sourceCutoff:string,
 knownMonths:ReadonlySet<string>,
):string[] {
 const timeZone=baseline.mappings[0]?.measures[0]?.timeZone;
 if(!timeZone)throw new Error('Approved operational timezone required');
 const cutoff=new Date(sourceCutoff);
 if(!Number.isFinite(cutoff.getTime()))throw new Error('Valid source cutoff required');
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit'}).formatToParts(cutoff);
 const year=parts.find(part=>part.type==='year')?.value,month=parts.find(part=>part.type==='month')?.value;
 if(!year||!month)throw new Error('Operational cutoff month unavailable');
 const through=`${year}-${month}`,result:string[]=[];
 for(let candidate=nextOperationalMonth(baseline.to.slice(0,7));candidate<=through;candidate=nextOperationalMonth(candidate)) {
  if(result.length>=120)throw new Error('Operational month catch-up exceeds bound');
  if(!knownMonths.has(candidate))result.push(candidate);
 }
 return result;
}
function nextOperationalMonth(month:string) {
 const date=new Date(`${month}-01T00:00:00Z`);
 if(!Number.isFinite(date.getTime()))throw new Error('Valid operational month required');
 date.setUTCMonth(date.getUTCMonth()+1);
 return date.toISOString().slice(0,7);
}
