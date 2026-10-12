import type { PoolClient } from 'pg';
import type { AnalyticsCursor,FactRevisionChange,ProductionFact } from '@el-dabboos/domain';
import type { OperationDetails,OperationalBaseline,OperationalSnapshot } from './contracts.ts';
import { persistOperationalFact,retiredOperationalFacts } from './facts.ts';
/** New calendar partitions need a complete initial base; existing months use changed identities only. */
export async function ingestOperationalCandidate(client:PoolClient,scope:{baseline:OperationalBaseline;source:OperationalSnapshot;cursor:AnalyticsCursor|null;details:OperationDetails;parent:string|null}) {
 const {baseline,source,cursor,details,parent}=scope;
 const start=performance.now(),objects={...cursor?.objects};details.previousCursor=cursor;
 const months=(await client.query("SELECT to_char(month,'YYYY-MM') AS period FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND family='facts'",[baseline.tenantId,parent])).rows.map(row=>String(row.period));
 const knownMonths=new Set(months);
 const candidate=new CandidateFacts(client,baseline,details,knownMonths);
 for(const month of missingOperationalMonths(baseline,source.cutoff,knownMonths))candidate.newMonths.add(month);
 for await(const page of source.records(baseline,cursor)) {
  details.rowsDiscovered+=page.rows;if(page.cursor)objects[page.object]=page.cursor;
  const facts=[...page.facts];for(const retired of page.retired??[])facts.push(...await retiredOperationalFacts(client,baseline.tenantId,retired,source));
  await candidate.accept(facts);
 }
 for(const month of candidate.newMonths)for await(const page of source.recordsMonth(baseline,month)) {
  details.partitionRowsSeeded=(details.partitionRowsSeeded??0)+page.rows;await candidate.accept(page.facts);
 }
 details.canonicalRevisions=candidate.changes.length;details.durations.ingestionMs=performance.now()-start;
 details.newCursor={cutoff:source.cutoff,objects};
 return {changes:candidate.changes,cursor:details.newCursor,recordsChanged:candidate.identities.size};
}
class CandidateFacts {
 readonly changes:FactRevisionChange[]=[];readonly newMonths=new Set<string>();readonly identities=new Set<string>();
 constructor(private readonly client:PoolClient,private readonly baseline:OperationalBaseline,private readonly details:OperationDetails,private readonly knownMonths:ReadonlySet<string>){}
 async accept(facts:readonly ProductionFact[]) {
  for(const fact of facts) {
   const change=await persistOperationalFact(this.client,this.baseline,fact);if(!change)continue;
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
