import type {CandidateChangeSummary} from './candidate-change-summary.ts';
/** Fixed operation names, timings and aggregate counts only; no row values, identities or SQL. */
export type OperationalStep='source_page'|'source_lookup_discovery'|'source_receivable_discovery'|'source_receivable_snapshot'|'source_controls'|'mart_scope'|'mart_candidate'|'mart_page'|'mart_reconciliation'|'mart_heads'|'mart_revision_write'|'mart_head_write'|'mart_retirement'
 |'refresh_manifest'|'refresh_carry_manifest'|'refresh_month'|'refresh_prior_proofs'|'refresh_partition'
 |'refresh_copy_daily'|'refresh_rebuild_daily'|'refresh_copy_membership'|'refresh_rebuild_membership'
 |'refresh_rollup_lookup'|'refresh_monthly_rollup'|'refresh_aggregate_proof'|'refresh_drill_proof'|'refresh_membership_guard';
interface OperationalTimingProgress {
 step:OperationalStep;state:'started'|'completed'|'failed';durationMs?:number;
 month?:string;monthIndex?:number;totalMonths?:number;
}
export type OperationalProgress=OperationalTimingProgress|{
 step:'mart_candidate_changes';state:'completed';durationMs:number;summary:CandidateChangeSummary;
};
export type OperationalProgressObserver=(progress:OperationalProgress)=>void;

/** Observation is optional and does not own transaction or source lifetime. */
export async function measureOperationalWork<T>(observe:OperationalProgressObserver|undefined,step:OperationalStep,operation:()=>Promise<T>,context:Pick<OperationalTimingProgress,'month'|'monthIndex'|'totalMonths'>={}):Promise<T> {
 if(!observe)return operation();
 const started=performance.now();observe({step,state:'started',...context});
 try {
  const result=await operation();
  observe({step,state:'completed',durationMs:performance.now()-started,...context});return result;
 }catch(error){observe({step,state:'failed',durationMs:performance.now()-started,...context});throw error;}
}
