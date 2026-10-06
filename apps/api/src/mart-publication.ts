import type { ReleaseCertification } from '@el-dabboos/domain';
import { createMartPool,PostgresMappingReleases,PostgresReleaseCertification,PostgresReleasePromotion,tenantTransaction } from '@el-dabboos/data';
import type { ReleasePromotionScope } from '@el-dabboos/data';

function publicationUrl(environment: NodeJS.ProcessEnv,key: string): string {
  const url = environment[key];
  if (!url) throw new Error('Missing publication operator configuration');
  return url;
}
/** Offline composition only; runtime never receives publication credentials. */
export async function executeMartPublication(command: string,manifest: unknown,environment: NodeJS.ProcessEnv) {
  if (command==='certify') {
    const pool = createMartPool(publicationUrl(environment,'MART_PUBLICATION_SOURCE_URL'),1);
    try { await new PostgresReleaseCertification(pool).record(manifest as ReleaseCertification); return { status: 'certified' }; }
    finally { await pool.end(); }
  }
  const scope = publicationScope(manifest);
  if (command==='approve') return approveRelease(scope,environment);
  if (!['promote','bind'].includes(command)) throw new Error('Unknown publication operation');
  const source = createMartPool(publicationUrl(environment,'MART_PUBLICATION_SOURCE_URL'),1);
  const target = createMartPool(publicationUrl(environment,'MART_PUBLICATION_TARGET_URL'),1);
  try {
    const promotion = new PostgresReleasePromotion(source,target);
    return command==='promote' ? await promotion.promote(scope) : { bindingId: await promotion.bind(scope) };
  } finally { await Promise.all([source.end(),target.end()]); }
}
function publicationScope(value: unknown): ReleasePromotionScope {
  if (!value || typeof value!=='object' || Object.keys(value).sort().join(',')!=='datasetId,reference,tenantId') throw new Error('Invalid publication manifest');
  return value as ReleasePromotionScope;
}
async function approveRelease(scope: ReleasePromotionScope,environment: NodeJS.ProcessEnv) {
  const pool = createMartPool(publicationUrl(environment,'MART_PUBLICATION_SOURCE_URL'),1);
  try {
    const certification = await tenantTransaction(pool,scope.tenantId,async client => (await client.query('SELECT specification FROM mart.release_certifications WHERE tenant_id=$1 AND dataset_id=$2 AND reference=$3',[scope.tenantId,scope.datasetId,scope.reference])).rows[0]?.specification as ReleaseCertification | undefined,true);
    if (!certification) throw new Error('Completed certification required');
    await new PostgresMappingReleases(pool).approve({ ...scope,caseIds: certification.caseIds,approvedAt: certification.approvedAt });
    return { status: 'approved' };
  } finally { await pool.end(); }
}
