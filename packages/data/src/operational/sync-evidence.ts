import type {OperationalReconciliation} from '@el-dabboos/domain';
import {compareCandidate,exactCaseEvidence,persistExactCases} from './reconciliation.ts';
import {measureOperationalWork} from './progress.ts';
import type {SyncContext,StoredSyncCandidate} from './sync-context.ts';

/** Resume only evidence already compared against this sealed source capture. */
export async function readSyncEvidence(context:SyncContext,candidate:StoredSyncCandidate):Promise<OperationalReconciliation|null>{
 const saved=(await context.client.query('SELECT evidence FROM mart.analytics_sync_reconciliations WHERE tenant_id=$1 AND candidate_id=$2',[context.tenantId,candidate.candidateId])).rows[0]?.evidence as OperationalReconciliation|undefined;
 if(!saved)return null;
 const actual=candidate.recordsChanged?await exactCaseEvidence(context.client,context.tenantId,saved.caseIds):emptyEvidence();
 if(actual.caseCount!==saved.caseCount||actual.mismatchCount!==saved.mismatchCount||actual.evidenceHash!==saved.evidenceHash||actual.caseCount!==saved.caseIds.length)throw new Error('Frozen reconciliation evidence changed');
 return actual;
}
export async function reconcileSyncCandidate(context:SyncContext,candidate:StoredSyncCandidate):Promise<OperationalReconciliation>{
 const saved=await readSyncEvidence(context,candidate);
 if(saved)return saved;
 const {client,tenantId}=context;
 const cases=candidate.recordsChanged?await measureOperationalWork(context.observe,'mart_reconciliation',()=>compareCandidate(client,tenantId,candidate.controls,true)):[];
 const evidence=candidate.recordsChanged?await persistExactCases(client,tenantId,candidate.source,cases):emptyEvidence();
 if(candidate.recordsChanged&&!evidence.caseCount)throw new Error('Frozen source controls are incomplete');
 await client.query('INSERT INTO mart.analytics_sync_reconciliations VALUES($1,$2,$3)',[tenantId,candidate.candidateId,JSON.stringify(evidence)]);
 return evidence;
}
function emptyEvidence():OperationalReconciliation{return {caseIds:[],caseCount:0,mismatchCount:0,evidenceHash:'no-changes'};}
