import type { DerivedMetricCertification,DimensionId,MetricId,ReleaseCertification,ReconciliationCase } from '@el-dabboos/domain';
import { activateLocalRelease,createMartPool,PostgresDerivedMetricCertification,PostgresMappingReleases,PostgresReleaseCertification,PostgresReleasePromotion,tenantTransaction } from '@el-dabboos/data';
import type { ReleasePromotionScope } from '@el-dabboos/data';

function publicationUrl(environment: NodeJS.ProcessEnv,key: string): string {
  const url = environment[key];
  if (!url) throw new Error('Missing publication operator configuration');
  return url;
}
function localPublicationUrl(environment: NodeJS.ProcessEnv): string {
  return environment.MART_PUBLICATION_SOURCE_URL ?? publicationUrl(environment,'MART_MIGRATOR_URL');
}
/** Offline composition only; runtime never receives publication credentials. */
export async function executeMartPublication(command: string,manifest: unknown,environment: NodeJS.ProcessEnv) {
  if (command==='certify') {
    const pool = createMartPool(localPublicationUrl(environment),1);
    try { await new PostgresReleaseCertification(pool).record(manifest as ReleaseCertification); return { status: 'certified' }; }
    finally { await pool.end(); }
  }
  if (command==='certify-derived') return certifyDerivedOutputs(derivedApprovalManifest(manifest),environment);
  const scope = publicationScope(manifest);
  if (command==='approve') return approveRelease(scope,environment);
  if (command==='activate-local') {
    const pool = createMartPool(localPublicationUrl(environment),1);
    try { return { bindingId: await activateLocalRelease(pool,scope) }; }
    finally { await pool.end(); }
  }
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
  const pool = createMartPool(localPublicationUrl(environment),1);
  try {
    const certification = await tenantTransaction(pool,scope.tenantId,async client => (await client.query('SELECT specification FROM mart.release_certifications WHERE tenant_id=$1 AND dataset_id=$2 AND reference=$3',[scope.tenantId,scope.datasetId,scope.reference])).rows[0]?.specification as ReleaseCertification | undefined,true);
    if (!certification) throw new Error('Completed certification required');
    await new PostgresMappingReleases(pool).approve({ ...scope,caseIds: certification.caseIds,approvedAt: certification.approvedAt });
    return { status: 'approved' };
  } finally { await pool.end(); }
}


interface DerivedApprovalManifest {
  tenantId:string;
  datasetId:string;
  approvalReference:string;
  technicalReference:string;
}
function derivedApprovalManifest(value:unknown):DerivedApprovalManifest {
  if (!value || typeof value!=='object' || Object.keys(value).sort().join(',')!=='approvalReference,datasetId,technicalReference,tenantId') throw new Error('Invalid derived approval manifest');
  const manifest=value as Record<string,unknown>;
  for(const key of ['tenantId','datasetId','approvalReference','technicalReference'] as const) if(typeof manifest[key]!=='string'||!manifest[key]!.trim()) throw new Error('Invalid derived approval manifest');
  return manifest as unknown as DerivedApprovalManifest;
}
async function certifyDerivedOutputs(manifest:DerivedApprovalManifest,environment:NodeJS.ProcessEnv) {
  const pool=createMartPool(localPublicationUrl(environment),1);
  try {
    const evidence=await tenantTransaction(pool,manifest.tenantId,async client=>{
      const mapping=(await client.query('SELECT mapping_version,approval_status FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[manifest.tenantId,manifest.datasetId])).rows[0];
      if(!mapping||mapping.approval_status!=='approved')throw new Error('Approved mapping required');
      const rows=await client.query<{specification:ReconciliationCase}>(
        `SELECT evidence.specification
         FROM mart.reconciliation_evidence evidence
         JOIN mart.mapping_releases mapping USING(tenant_id,dataset_id)
         WHERE evidence.tenant_id=$1 AND evidence.dataset_id=$2
           AND evidence.case_id=ANY(mapping.approval_case_ids)
           AND evidence.status='passed' AND evidence.group_completeness=true
         ORDER BY evidence.case_id`,
        [manifest.tenantId,manifest.datasetId],
      );
      return {mappingVersion:String(mapping.mapping_version),cases:rows.rows.map(row=>row.specification)};
    },true);
    const approvedAt=new Date().toISOString();
    const definitions=[
      {metric:'average_confirmed_order_value' as MetricId,operands:['order_revenue','order_count'],businessSemantics:'Average confirmed order value = confirmed order revenue divided by confirmed order count.'},
      {metric:'average_invoice_value' as MetricId,operands:['invoiced_revenue','invoice_count'],businessSemantics:'Average invoice value = posted invoice value divided by posted customer invoice count; refunds are excluded from both operands.'},
    ] as const;
    const groupings:readonly (DimensionId|null)[]=[null,'business_line','salesperson'];
    const certification=new PostgresDerivedMetricCertification(pool);
    const recorded:string[]=[];
    for(const definition of definitions)for(const grouping of groupings){
      const cases=evidence.cases.filter(control=>control.grouping===grouping&&definition.operands.some(operand=>operand===control.measureId));
      if(!cases.length)throw new Error(`Exact derived inputs unavailable: ${definition.metric}/${grouping??'summary'}`);
      const periods=[...new Set(cases.map(control=>`${control.from}/${control.to}`))];
      if(periods.length!==1)throw new Error('One exact derived period required');
      const [from,to]=periods[0]!.split('/');
      const scope:DerivedMetricCertification={
        tenantId:manifest.tenantId,datasetId:manifest.datasetId,mappingVersion:evidence.mappingVersion,
        reference:`${manifest.approvalReference}:${definition.metric}:${grouping??'summary'}`,
        metric:definition.metric,grouping,from:from!,to:to!,caseIds:cases.map(control=>control.caseId),
        approvalReference:manifest.approvalReference,approvedAt,businessSemantics:definition.businessSemantics,
        technicalReference:manifest.technicalReference,
      };
      const exists=await tenantTransaction(pool,manifest.tenantId,async client=>(await client.query('SELECT 1 FROM mart.derived_metric_certifications WHERE tenant_id=$1 AND dataset_id=$2 AND reference=$3',[scope.tenantId,scope.datasetId,scope.reference])).rowCount===1,true);
      if(!exists)await certification.record(scope);recorded.push(`${definition.metric}:${grouping??'summary'}`);
    }
    await tenantTransaction(pool,manifest.tenantId,async client=>{await client.query('SELECT mart.refresh_proof_results($1,$2)',[manifest.tenantId,manifest.datasetId]);});
    return {status:'derived-certified',recorded};
  } finally {await pool.end();}
}
