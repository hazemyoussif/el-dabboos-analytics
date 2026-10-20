/** Fixed operation names and timings only; no source rows, identities or SQL. */
export type OperationalStep='source_page'|'source_receivable_discovery'|'source_receivable_snapshot'|'source_controls'|'mart_scope'|'mart_candidate'|'mart_page'|'mart_reconciliation'|'mart_heads'|'mart_revision_write'|'mart_head_write'|'mart_retirement';
export interface OperationalProgress {
 step:OperationalStep;state:'started'|'completed'|'failed';durationMs?:number;
}
export type OperationalProgressObserver=(progress:OperationalProgress)=>void;

/** Observation is optional and does not own transaction or source lifetime. */
export async function measureOperationalWork<T>(observe:OperationalProgressObserver|undefined,step:OperationalStep,operation:()=>Promise<T>):Promise<T> {
 if(!observe)return operation();
 const started=performance.now();observe({step,state:'started'});
 try {
  const result=await operation();
  observe({step,state:'completed',durationMs:performance.now()-started});return result;
 }catch(error){observe({step,state:'failed',durationMs:performance.now()-started});throw error;}
}
