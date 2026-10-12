import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReconciliationCase } from '../../packages/domain/src/index.ts';
import { semanticCatalog,reconcileDerivedRatio } from '../../packages/domain/src/index.ts';
import { createMartPool,PostgresMappingReleases,PostgresReleaseCertification,PostgresDerivedMetricCertification,PostgresReleasePromotion,promoteLocalBoundedRelease,tenantTransaction } from '../../packages/data/src/index.ts';
import { historicalPublicationOptions } from '../../apps/api/src/historical-publication-options.ts';
import { verifyHistoricalCheckpoint,verifyGroupedSums } from '../../apps/api/src/historical-months.ts';
import { writeHistoricalCheckpoint } from './historical-checkpoint.ts';

const {periods,tenantId,outputDirectory,inPlace,sourceUrl,targetUrl}=historicalPublicationOptions(process.argv.slice(2),process.env);
// Explicit authorized approver evidence belongs to publication, never extraction.
const approval=JSON.parse(await readFile(join(outputDirectory,'business-approval.json'),'utf8')) as {reference:string;approverReference:string;approvedAt:string};
if (!approval.reference?.trim() || !approval.approverReference?.trim() || new Date(approval.approvedAt).toISOString()!==approval.approvedAt) throw new Error('Explicit historical business approval required');
const source=createMartPool(sourceUrl,1),target=inPlace?source:createMartPool(targetUrl,1);
try {
  for (const period of periods) for (const kind of ['events','aging'] as const) {
    const evidence=JSON.parse(await readFile(join(outputDirectory,`${period.month}.${kind}.json`),'utf8')) as {datasetId:string;month:string;status:string;cases:ReconciliationCase[];snapshot:{frozenRevision:string}};
    if (!['passed','reconciled'].includes(evidence.status) || !evidence.datasetId.startsWith(`el-dabboos-history-${period.month.replace('-','')}-${kind}-`)) throw new Error('Successful bounded historical checkpoint required');
    const rows=await tenantTransaction(source,tenantId,async client=>(await client.query('SELECT specification,status,group_completeness FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2',[tenantId,evidence.datasetId])).rows,true);
    verifyHistoricalCheckpoint(period,evidence,rows); verifyGroupedSums(evidence.cases);
    const reference=`${approval.reference}:${period.month}:${kind}`;
    const mapping=await tenantTransaction(source,tenantId,async client=>(await client.query('SELECT approval_status,approval_reference FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[tenantId,evidence.datasetId])).rows[0],true);
    const caseIds=evidence.cases.map(control=>control.caseId),mappingVersion=evidence.cases[0]!.mappingVersion;
    const prior=await tenantTransaction(source,tenantId,async client=>(await client.query('SELECT specification FROM mart.release_certifications WHERE tenant_id=$1 AND dataset_id=$2 AND reference=$3',[tenantId,evidence.datasetId,reference])).rows[0],true);
    if (prior && (prior.specification.approverReference!==approval.approverReference || prior.specification.approvedAt!==approval.approvedAt || JSON.stringify([...prior.specification.caseIds].sort())!==JSON.stringify([...caseIds].sort()))) throw new Error('Historical business approval conflict');
    if (!prior) await new PostgresReleaseCertification(source).record({tenantId,datasetId:evidence.datasetId,mappingVersion,reference,approverReference:approval.approverReference,approvedAt:approval.approvedAt,companyIds:['1'],from:period.from,to:period.to,caseIds,technicalReference:`Exact immutable bounded source/mart controls ${evidence.datasetId}`,evidenceKind:'authorized_business_approval',approvedValues:evidence.cases.filter(control=>control.grouping===null).map(control=>({measureId:control.measureId,value:control.actualValue})),businessSemantics:kind==='events'?['Unchanged September confirmed-order and own-issue-date signed untaxed invoice/refund definitions','Stable partner/business user/Business Line identities; native IQD']:['Unchanged signed historical residual reconstruction, maturity aging and post-cutoff payment exclusion','Phase A company summary at one month-end; no sum across dates']});
    if (mapping.approval_status==='pending') await new PostgresMappingReleases(source).approve({tenantId,datasetId:evidence.datasetId,caseIds,reference,approvedAt:approval.approvedAt});
    else if (mapping.approval_reference!==reference) throw new Error('Immutable historical approval conflict');
    await recordRatios(source,evidence,kind,reference,period);
    const scope={tenantId,datasetId:evidence.datasetId,reference};
    const promotion=inPlace?await promoteLocalBoundedRelease(source,scope):await new PostgresReleasePromotion(source,target).promoteBounded(scope);
    // Newly committed bulk copies need current statistics before exact live-input guards.
    if (!inPlace) await target.query('ANALYZE mart.mapping_releases,mart.reconciliation_evidence,mart.fact_revisions,mart.fact_heads,mart.reconciliation_batches,mart.batch_facts,mart.ingestion_batches,mart.extraction_runs');
    // Ratio output certification is a separate existing lifecycle, outside base transfer fingerprints.
    if (!inPlace) await recordRatios(target,evidence,kind,reference,period);
    const receiptPath=join(outputDirectory,`${period.month}.${kind}.publication.json`);
    try { await writeHistoricalCheckpoint(receiptPath,{month:period.month,kind,datasetId:evidence.datasetId,reference,promotion,servingBound:false}); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error;
      const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
      if (receipt.datasetId!==evidence.datasetId || receipt.reference!==reference || receipt.promotion.fingerprint!==promotion.fingerprint) throw new Error('Immutable historical promotion receipt conflict');
    }
    console.log(JSON.stringify({month:period.month,kind,status:'promoted-unbound',alreadyPromoted:promotion.alreadyPromoted}));
  }
} finally { await Promise.all([...new Set([source,target])].map(pool=>pool.end())); }

async function recordRatios(pool:Parameters<typeof tenantTransaction>[0],evidence:{datasetId:string;cases:ReconciliationCase[]},kind:'events'|'aging',reference:string,period:{from:string;to:string}) {
  const ratios=kind==='events'?['average_confirmed_order_value','average_invoice_value'] as const:['overdue_receivable_percentage'] as const;
  for (const metric of ratios) for (const grouping of [null,'business_line','salesperson','customer'] as const) {
    const semantics=semanticCatalog[metric].semantics;
    if (semantics.kind!=='ratio') throw new Error('Governed ratio required');
    const inputs=evidence.cases.filter(control=>control.grouping===grouping && [semantics.numerator,semantics.denominator].includes(control.measureId));
    if (!inputs.length) continue;
    reconcileDerivedRatio(metric,inputs);
    const derivedReference=`${reference}:${metric}:${grouping ?? 'summary'}`;
    const exists=await tenantTransaction(pool,tenantId,async client=>(await client.query('SELECT specification FROM mart.derived_metric_certifications WHERE tenant_id=$1 AND dataset_id=$2 AND reference=$3',[tenantId,evidence.datasetId,derivedReference])).rows[0],true);
    const certification={tenantId,datasetId:evidence.datasetId,mappingVersion:inputs[0]!.mappingVersion,reference:derivedReference,metric,grouping,from:period.from,to:period.to,caseIds:inputs.map(control=>control.caseId),approvalReference:approval.reference,approvedAt:approval.approvedAt,businessSemantics:'Unchanged approved ratio of exact signed operands; zero denominator returns null',technicalReference:`Exact rational control ${derivedReference}`};
    if (!exists) await new PostgresDerivedMetricCertification(pool,120000).record(certification);
    else if (JSON.stringify(exists.specification.caseIds)!==JSON.stringify(certification.caseIds) || exists.specification.approvalReference!==approval.reference) throw new Error('Immutable ratio approval conflict');
  }
}
