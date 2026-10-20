import { resolveAnalyticsImpact } from '@el-dabboos/domain';
import type { AnalyticsCursor, FactRevisionChange, AnalyticsJobRequest, AnalyticsJobRun, AnalyticsOperationsOptions, AnalyticsOperationalTransaction, AnalyticsSourceSnapshot, OperationalReconciliation } from '@el-dabboos/domain';

export type AnalyticsOperationPhase='source_open'|'source_read'|'source_reconciliation'|'source_handoff'|'offline_refresh'|'prepare_and_publish'|'audit'|'cursor'|'mart_commit';

/** Scheduler and HTTP adapters invoke this named job; no planner or model port exists. */
export class AnalyticsOperations {
  constructor(private readonly options: AnalyticsOperationsOptions,private readonly observePhase?:(phase:AnalyticsOperationPhase)=>void) {}
  async run(request: AnalyticsJobRequest): Promise<AnalyticsJobRun> {
    validateRequest(request);
    const startedAt = this.options.clock().toISOString(), runId = this.options.runId();
    let snapshot: AnalyticsSourceSnapshot | undefined;
    try {
      this.observePhase?.('source_open');
      snapshot = await this.options.source.open(request.tenantId);
      const source = snapshot;
      const completeSourceRead=async()=>{await source.close();snapshot=undefined;};
      return await this.options.store.transaction(request.tenantId,async transaction=>{
        const run=await this.execute({ request, runId, startedAt, source },transaction,completeSourceRead);
        this.observePhase?.('mart_commit');return run;
      });
    } catch (error) {
      await this.options.store.recordFailure(request, runId, startedAt);
      throw error;
    } finally { await snapshot?.close(); }
  }
  private async execute(scope: { request: AnalyticsJobRequest; runId: string; startedAt: string; source: AnalyticsSourceSnapshot }, transaction: AnalyticsOperationalTransaction,completeSourceRead:()=>Promise<void>) {
    const { request, source } = scope;
    const previousRelease = await transaction.trustedRelease();
    this.observePhase?.('source_read');
    const {ingested,changes,recordsChanged}=await discoverCandidate(transaction,{request,source});
    const partitions=resolveAnalyticsImpact(changes,this.options.impact);
    const unchanged = (request.kind === 'sync' || request.kind === 'sweep') && recordsChanged === 0;
    this.observePhase?.('source_reconciliation');
    const evidence = unchanged ? emptyEvidence() : await transaction.reconcile(source, partitions, request.kind);
    validateEvidence(evidence, unchanged);
    this.observePhase?.('source_handoff');
    await completeSourceRead();
    let servingRelease = previousRelease;
    const status = unchanged ? 'unchanged' : evidence.mismatchCount ? 'failed' : 'passed';
    if (status === 'failed') await transaction.discardCandidate();
    else {
      if (partitions.length) {
        this.observePhase?.('offline_refresh');
        servingRelease = await transaction.refresh(partitions);
        this.observePhase?.('prepare_and_publish');
        await transaction.promote(servingRelease, evidence);
      }

    }
    const run: AnalyticsJobRun = { ...request, runId: scope.runId, startedAt: scope.startedAt, completedAt: this.options.clock().toISOString(), sourceCutoff: source.cutoff, sourceRevision: source.revision, mappingVersion: source.mappingVersion, definitionVersion: source.definitionVersion, status, recordsChanged, partitionsAffected: partitions.length, caseCount: evidence.caseCount, mismatchCount: evidence.mismatchCount, evidenceHash: evidence.evidenceHash, servingRelease };
    this.observePhase?.('audit');
    await transaction.record(run, evidence.caseIds);
    if(ingested && status!=='failed'){this.observePhase?.('cursor');await transaction.commitCursor(ingested.cursor);}
    return run;
  }
}
function validateRequest(request: AnalyticsJobRequest) {
  if (![request.tenantId, request.actorId].every(value => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value) || !['sync', 'affected', 'daily', 'deep', 'sweep'].includes(request.kind) || !['manual', 'operator', 'scheduled'].includes(request.trigger)) throw new Error('Invalid analytics job request');
}
function emptyEvidence(): OperationalReconciliation { return { caseIds: [], caseCount: 0, mismatchCount: 0, evidenceHash: 'no-changes' }; }
function validateEvidence(evidence: OperationalReconciliation, unchanged: boolean) {
  if (!Number.isSafeInteger(evidence.caseCount) || !Number.isSafeInteger(evidence.mismatchCount) || evidence.mismatchCount < 0 || evidence.mismatchCount > evidence.caseCount || evidence.caseCount !== evidence.caseIds.length || new Set(evidence.caseIds).size !== evidence.caseCount || !evidence.evidenceHash || !unchanged && !evidence.caseCount) throw new Error('Incomplete reconciliation evidence');
}

function validateCandidate(request:AnalyticsJobRequest,source:AnalyticsSourceSnapshot,ingested:{cursor:AnalyticsCursor;recordsChanged:number;changes:readonly FactRevisionChange[]}|undefined,changes:readonly FactRevisionChange[]) {
 if(changes.some(change=>change.next.tenantId!==request.tenantId))throw new Error('Cross-tenant candidate');
 if(!ingested)return;
 if(!Number.isSafeInteger(ingested.recordsChanged) || ingested.recordsChanged<0 || ingested.cursor.cutoff!==source.cutoff || (ingested.recordsChanged===0)!==(changes.length===0))throw new Error('Incomplete bounded sync result');
}

/** Source discovery owns watermark safety before downstream validation/serving decisions. */
async function discoverCandidate(transaction:AnalyticsOperationalTransaction,scope:{request:AnalyticsJobRequest;source:AnalyticsSourceSnapshot}) {
 const {request,source}=scope;
 const cursor=await transaction.cursor();
 if(cursor && Date.parse(cursor.cutoff)>Date.parse(source.cutoff))throw new Error('Source cutoff cannot regress');
 const ingested=request.kind==='sync'?await transaction.ingest(source,cursor):undefined;
 const changes=request.kind==='sweep'?await transaction.sweep(source):ingested?.changes??[];
 const recordsChanged=ingested?.recordsChanged??new Set(changes.map(change=>JSON.stringify([change.next.sourceId,change.next.sourceObject,change.next.sourceRecordId]))).size;
 validateCandidate(request,source,ingested,changes);
 return {ingested,changes,recordsChanged};
}
