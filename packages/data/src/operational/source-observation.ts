import type { PoolClient } from 'pg';

/** A receipt cutoff is not an ERP-wide MVCC timestamp. Provenance comes from the durable cursor run. */
export async function observedImportMetadata(client: PoolClient, tenantId: string, cutoff: string): Promise<{ sourceConsistency?: 'api_observed' }> {
  const row = (await client.query(`SELECT run.source_revision FROM mart.analytics_source_cursors cursor
    JOIN mart.analytics_operation_runs run USING(tenant_id,run_id)
    WHERE cursor.tenant_id=$1 AND cursor.cutoff=$2::timestamptz`, [tenantId, cutoff])).rows[0];
  return typeof row?.source_revision === 'string' && row.source_revision.startsWith('orm-observed-copy-v1:') ? { sourceConsistency: 'api_observed' } : {};
}
