import type { Pool } from 'pg';
import type { ReconciliationCase } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { PostgresReconciliation } from './reconciliation.ts';

/** Resolve the complete logical extraction to the existing immutable frozen evidence harness. */
export async function reconcileExtraction(pool: Pool,extractionId: string,expected: readonly Omit<ReconciliationCase,'batchIds'>[],currency: string) {
  const first = expected[0];
  if (!first) throw new Error('Extraction controls required');
  const batchIds = await tenantTransaction(pool,first.tenantId,async client => {
    const run = (await client.query("SELECT * FROM mart.extraction_runs WHERE tenant_id=$1 AND dataset_id=$2 AND extraction_id=$3 AND status='complete'",[first.tenantId,first.datasetId,extractionId])).rows[0];
    if (!run) throw new Error('Completed logical extraction required');
    return (await client.query('SELECT batch_id FROM mart.ingestion_batches WHERE tenant_id=$1 AND extraction_id=$2 ORDER BY page_number',[first.tenantId,extractionId])).rows.map(row => String(row.batch_id));
  });
  return new PostgresReconciliation(pool).record(expected.map(control => ({ ...control,batchIds })),currency);
}
