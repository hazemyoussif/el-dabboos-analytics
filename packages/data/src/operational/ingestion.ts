import type { PoolClient } from 'pg';
import type { AnalyticsCursor,FactRevisionChange,ProductionFact } from '@el-dabboos/domain';
import type { OperationDetails,OperationalBaseline,OperationalSnapshot } from './contracts.ts';
import { persistOperationalFact,retiredOperationalFacts } from './facts.ts';
/** New calendar partitions need a complete initial base; existing months use changed identities only. */
export async function ingestOperationalCandidate(client:PoolClient,scope:{baseline:OperationalBaseline;source:OperationalSnapshot;cursor:AnalyticsCursor|null;details:OperationDetails;parent:string|null}) {
 const {baseline,source,cursor,details,parent}=scope;
 const start=performance.now(),objects={...cursor?.objects};details.previousCursor=cursor;
 const months=(await client.query("SELECT to_char(month,'YYYY-MM') AS period FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2",[baseline.tenantId,parent])).rows.map(row=>String(row.period));
 const candidate=new CandidateFacts(client,baseline,details,new Set(months));
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
