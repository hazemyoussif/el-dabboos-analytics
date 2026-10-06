import type { Pool } from 'pg';
import { tenantTransaction } from './session.ts';
import { assertPublicationOperator } from './release-certification.ts';
import { assertCertifiedRelease,insertReleaseRows,martSchemaFingerprint,readReleaseRows,releaseFingerprint } from './release-transfer.ts';
import type { ReleaseTransfer } from './release-transfer.ts';

export interface ReleasePromotionScope { tenantId: string; datasetId: string; reference: string }
/** One frozen source read and one atomic target write. Promotion never binds serving. */
export class PostgresReleasePromotion {
  constructor(private readonly source: Pool,private readonly target: Pool) {}
  async promote(scope: ReleasePromotionScope): Promise<{ fingerprint: string; alreadyPromoted: boolean }> {
    validatePromotionScope(scope);
    const transfer = await tenantTransaction(this.source,scope.tenantId,async client => {
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      await assertCertifiedRelease(client,scope);
      const tables = await readReleaseRows(client,scope);
      return { ...scope,tables,fingerprint: releaseFingerprint(tables),schema: await martSchemaFingerprint(client) };
    },true,120000);
    return tenantTransaction(this.target,scope.tenantId,async client => {
      await assertPublicationOperator(client);
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope.tenantId,scope.datasetId])]);
      if (await martSchemaFingerprint(client)!==transfer.schema) throw new Error('Promotion schema mismatch');
      const prior = (await client.query('SELECT release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,scope.datasetId])).rows[0];
      if (prior) {
        await assertCertifiedRelease(client,scope);
        if (prior.release_fingerprint!==transfer.fingerprint || releaseFingerprint(await readReleaseRows(client,scope))!==transfer.fingerprint) throw new Error('Promoted release fingerprint mismatch');
        return { fingerprint: transfer.fingerprint,alreadyPromoted: true };
      }
      await insertReleaseRows(client,transfer);
      await approvePromotedMapping(client,transfer);
      if (releaseFingerprint(await readReleaseRows(client,scope))!==transfer.fingerprint) throw new Error('Promotion changed immutable release evidence');
      await client.query('INSERT INTO mart.release_promotions(tenant_id,dataset_id,reference,release_fingerprint) VALUES ($1,$2,$3,$4)',[scope.tenantId,scope.datasetId,scope.reference,transfer.fingerprint]);
      return { fingerprint: transfer.fingerprint,alreadyPromoted: false };
    },false,120000);
  }
  async bind(scope: ReleasePromotionScope): Promise<string> {
    validatePromotionScope(scope);
    return tenantTransaction(this.target,scope.tenantId,async client => {
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope.tenantId,scope.datasetId])]);
      await assertCertifiedRelease(client,scope);
      const receipt = (await client.query('SELECT release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,scope.datasetId])).rows[0];
      if (!receipt) throw new Error('Promotion receipt required before staging binding');
      if (releaseFingerprint(await readReleaseRows(client,scope))!==receipt.release_fingerprint) throw new Error('Promoted release changed before binding');
      await client.query('INSERT INTO mart.serving_bindings(tenant_id,dataset_id) VALUES ($1,$2) ON CONFLICT (tenant_id) DO NOTHING',[scope.tenantId,scope.datasetId]);
      const binding = (await client.query('SELECT dataset_id FROM mart.serving_bindings WHERE tenant_id=$1',[scope.tenantId])).rows[0];
      if (binding?.dataset_id!==scope.datasetId) throw new Error('Existing serving binding belongs to another release');
      return `${scope.tenantId}/${scope.datasetId}`;
    });
  }
  /** Explicit compare-and-swap activation; the old release and its approvals remain immutable. */
  async replaceBinding(scope: ReleasePromotionScope,expectedDatasetId: string): Promise<string> {
    validatePromotionScope(scope);
    if (!expectedDatasetId.trim() || expectedDatasetId.trim()!==expectedDatasetId || expectedDatasetId.length>200 || expectedDatasetId===scope.datasetId) throw new Error('Distinct expected serving release required');
    return tenantTransaction(this.target,scope.tenantId,async client => {
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope.tenantId,scope.datasetId])]);
      await assertCertifiedRelease(client,scope);
      const receipt=(await client.query('SELECT release_fingerprint FROM mart.release_promotions WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,scope.datasetId])).rows[0];
      if (!receipt || releaseFingerprint(await readReleaseRows(client,scope))!==receipt.release_fingerprint) throw new Error('Exact promoted release required before activation');
      const changed=await client.query('UPDATE mart.serving_bindings SET dataset_id=$3 WHERE tenant_id=$1 AND dataset_id=$2',[scope.tenantId,expectedDatasetId,scope.datasetId]);
      if (changed.rowCount!==1) throw new Error('Serving release changed; activation conflict');
      return `${scope.tenantId}/${scope.datasetId}`;
    });
  }
}
async function approvePromotedMapping(client: import('pg').PoolClient,transfer: ReleaseTransfer): Promise<void> {
  const mapping = JSON.parse(transfer.tables.mapping_releases![0]!);
  await client.query(`UPDATE mart.mapping_releases SET approval_status='approved',approval_reference=$3,approved_at=$4,approval_case_ids=$5
    WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='pending'`,[transfer.tenantId,transfer.datasetId,mapping.approval_reference,mapping.approved_at,mapping.approval_case_ids]);
}
function validatePromotionScope(scope: ReleasePromotionScope): void {
  if (![scope.tenantId,scope.datasetId,scope.reference].every(value => typeof value==='string' && value.trim()===value && value.length>0 && value.length<=200)) throw new Error('Invalid promotion scope');
}
