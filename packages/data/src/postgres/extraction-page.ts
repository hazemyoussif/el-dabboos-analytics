import type { PoolClient } from 'pg';
import type { IngestionBatch, ProductionFact } from '@el-dabboos/domain';
import type { ExtractionEvidence } from './writer.ts';
import { lockExtraction } from './extractions.ts';

export async function validateExtractionPage(client: PoolClient,batch: IngestionBatch,evidence: ExtractionEvidence,facts: readonly ProductionFact[]): Promise<void> {
  const page = evidence.page;
  if (!page) return;
  const stored = await lockExtraction(client,batch.tenantId,page.extractionId);
  const run = stored.specification;
  if (stored.status!=='running' || page.pageNumber!==stored.page_count+1 || (evidence.cursorStart ?? null)!==stored.cursor_checkpoint) throw new Error('Extraction checkpoint conflict');
  for (const key of ['tenantId','datasetId','sourceId','mappingId','mappingVersion','sourceAsOf','frozenRevision'] as const) {
    if (batch[key]!==run[key]) throw new Error('Extraction page scope');
  }
  validatePageScope(batch,evidence,run,facts);
  validatePageBounds(evidence);
}
function validatePageScope(batch: IngestionBatch,evidence: ExtractionEvidence,run: import('@el-dabboos/domain').ExtractionRun,facts: readonly ProductionFact[]): void {
  if (JSON.stringify(batch.companyIds)!==JSON.stringify(run.companyIds) || JSON.stringify(evidence.sourceObjects)!==JSON.stringify(run.sourceObjects) || evidence.completeness!==run.completeness) throw new Error('Extraction page scope');
  if (facts.some(fact => fact.status==='active' && (fact.businessDate<run.from || fact.businessDate>run.to))) throw new Error('Extraction fact period');
}
function validatePageBounds(evidence: ExtractionEvidence): void {
  const page = evidence.page!;
  if (!Number.isSafeInteger(page.pageNumber) || page.pageNumber<1 || !page.extractionId.trim() || page.extractionId.length>200) throw new Error('Invalid extraction page');
  if (!evidence.paginationComplete && (!page.cursorEnd || page.cursorEnd===evidence.cursorStart)) throw new Error('Nonterminal extraction must advance cursor');
  if (page.cursorEnd!==undefined && (!page.cursorEnd.trim() || page.cursorEnd.length>200)) throw new Error('Invalid extraction cursor');
  if (evidence.watermarkEnd && !evidence.paginationComplete) throw new Error('Partial extraction cannot publish watermark');
}
export async function commitExtractionPage(client: PoolClient,batch: IngestionBatch,evidence: ExtractionEvidence): Promise<void> {
  if (!evidence.page) return;
  await client.query(`UPDATE mart.extraction_runs SET page_count=page_count+1,row_count=row_count+$3,cursor_checkpoint=coalesce($4,cursor_checkpoint),
    status=$5,completed_at=$6 WHERE tenant_id=$1 AND extraction_id=$2`,
  [batch.tenantId,evidence.page.extractionId,batch.rowsRead,evidence.page.cursorEnd ?? null,evidence.paginationComplete ? 'complete' : 'running',evidence.paginationComplete ? batch.completedAt : null]);
}
