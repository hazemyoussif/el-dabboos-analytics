import type { PoolClient } from 'pg';
import type { ReconciliationCase } from '@el-dabboos/domain';
/** Bounded append-only evidence writes on the reconciliation owner's transaction.
 * Database triggers, forced tenant RLS and history uniqueness still validate every row. */
export async function persistReconciliationCases(client: PoolClient, cases: readonly ReconciliationCase[], result: {status: string; complete: boolean; missingGroups: string[]; unexpectedGroups: string[]}) {
  for (let offset = 0; offset < cases.length; offset += 200) {
    const page = cases.slice(offset,offset + 200);
    const payload = JSON.stringify(page);
    await client.query(`INSERT INTO mart.reconciliation_evidence(tenant_id,case_id,dataset_id,specification,status,group_completeness,missing_groups,unexpected_groups)
      SELECT control->>'tenantId',control->>'caseId',control->>'datasetId',control,$2,$3,$4,$5
      FROM jsonb_array_elements($1::jsonb) control`,[payload,result.status,result.complete,result.missingGroups,result.unexpectedGroups]);
    await client.query(`INSERT INTO mart.reconciliation_batches(tenant_id,case_id,dataset_id,batch_id)
      SELECT control->>'tenantId',control->>'caseId',control->>'datasetId',batch_id
      FROM jsonb_array_elements($1::jsonb) control CROSS JOIN LATERAL jsonb_array_elements_text(control->'batchIds') batch_id`,[payload]);
  }
}
