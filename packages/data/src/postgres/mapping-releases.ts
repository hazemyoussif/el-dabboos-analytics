import type { Pool } from 'pg';
import { validateSourceMapping } from '@el-dabboos/domain';
import type { SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';

export interface MappingApproval {
  tenantId: string; datasetId: string;
  caseIds: readonly string[];
  reference: string;
  approvedAt: string;
}
/** Trusted migrator composition only. No public/admin HTTP operation, source writes or binding activation. */
export class PostgresMappingReleases {
  constructor(private readonly pool: Pool) {}
  async registerCandidate(mapping: SourceMapping): Promise<void> {
    validateSourceMapping(mapping);
    if (mapping.approval.status!=='pending') throw new Error('Register an immutable candidate before reconciliation');
    await tenantTransaction(this.pool,mapping.tenantId,async client => {
      await client.query(`INSERT INTO mart.mapping_releases(tenant_id,dataset_id,source_id,mapping_id,mapping_version,business_basis,reporting_currency,approval_status,specification)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
      [mapping.tenantId,mapping.datasetId,mapping.sourceId,mapping.mappingId,mapping.mappingVersion,mapping.businessBasis,mapping.reportingCurrency,JSON.stringify(mapping)]);
    });
  }
  async approve(approval: MappingApproval): Promise<void> {
    if (![approval.tenantId,approval.datasetId,approval.reference].every(value => value.trim()===value && value.length>0 && value.length<=200) || !approval.caseIds.length || approval.caseIds.length>1000 || !Number.isFinite(Date.parse(approval.approvedAt)) || new Date(approval.approvedAt).toISOString()!==approval.approvedAt) throw new Error('Invalid mapping approval');
    await tenantTransaction(this.pool,approval.tenantId,async client => {
      const result = await client.query(`UPDATE mart.mapping_releases SET approval_status='approved',approval_reference=$3,approved_at=$4,approval_case_ids=$5
        WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status='pending'`,
      [approval.tenantId,approval.datasetId,approval.reference,approval.approvedAt,approval.caseIds]);
      if (result.rowCount!==1) throw new Error('Candidate release required');
    });
  }
}
/** Persisted approval is metadata; never mutate the immutable candidate specification. */
export function certifiedMapping(row: Record<string,unknown>): SourceMapping {
  const mapping = row.specification as SourceMapping;
  validateSourceMapping(mapping);
  if (row.approval_status!=='approved' || typeof row.approval_reference!=='string' || !(row.approved_at instanceof Date)) throw new Error('Unapproved certification metadata');
  return { ...mapping,approval: { status: 'approved',reference: row.approval_reference,approvedAt: row.approved_at.toISOString() } };
}
