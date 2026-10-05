import type { Pool, PoolClient } from 'pg';
import { validateExtractionRun, validateSourceMapping } from '@el-dabboos/domain';
import type { ExtractionCheckpoint, ExtractionRun, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';

interface RunRow {
  specification: ExtractionRun;
  status: ExtractionCheckpoint['status'];
  page_count: number;
  row_count: string;
  cursor_checkpoint: string | null;
  completed_at: Date | null;
}
export function checkpoint(row: RunRow): ExtractionCheckpoint {
  return { extractionId: row.specification.extractionId,status: row.status,pageCount: row.page_count,rowCount: Number(row.row_count),
    ...(row.cursor_checkpoint ? { cursor: row.cursor_checkpoint } : {}),...(row.completed_at ? { completedAt: row.completed_at.toISOString() } : {}) };
}
export async function lockExtraction(client: PoolClient, tenantId: string, extractionId: string): Promise<RunRow> {
  const row = (await client.query('SELECT * FROM mart.extraction_runs WHERE tenant_id=$1 AND extraction_id=$2 FOR UPDATE',[tenantId,extractionId])).rows[0] as RunRow | undefined;
  if (!row) throw new Error('Unknown extraction');
  return row;
}
export class PostgresExtractionRuns {
  constructor(private readonly pool: Pool,private readonly companies: Readonly<Record<string,readonly string[]>>) {}
  async begin(run: ExtractionRun): Promise<ExtractionCheckpoint> {
    validateExtractionRun(run);
    if (!run.companyIds.every(company => this.companies[run.tenantId]?.includes(company))) throw new Error('Unauthorized extraction company');
    return tenantTransaction(this.pool,run.tenantId,async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([run.tenantId,run.datasetId])]);
      const mapping = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[run.tenantId,run.datasetId])).rows[0]?.specification as SourceMapping;
      validateSourceMapping(mapping);
      if (mapping.sourceId!==run.sourceId || mapping.mappingId!==run.mappingId || mapping.mappingVersion!==run.mappingVersion || run.sourceObjects.some(object => !mapping.measures.some(measure => measure.sourceObject===object))) throw new Error('Extraction mapping scope');
      await client.query(`INSERT INTO mart.extraction_runs(tenant_id,extraction_id,dataset_id,source_id,mapping_id,mapping_version,specification,cursor_checkpoint)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (tenant_id,extraction_id) DO NOTHING`,
      [run.tenantId,run.extractionId,run.datasetId,run.sourceId,run.mappingId,run.mappingVersion,JSON.stringify(run),run.initialCursor ?? null]);
      const stored = await lockExtraction(client,run.tenantId,run.extractionId);
      // PostgreSQL JSONB normalizes property order; compare semantics rather than JSON formatting.
      const same = (await client.query('SELECT specification=$3::jsonb equal FROM mart.extraction_runs WHERE tenant_id=$1 AND extraction_id=$2',[run.tenantId,run.extractionId,JSON.stringify(run)])).rows[0].equal;
      if (!same) throw new Error('Extraction identity conflict');
      return checkpoint(stored);
    });
  }
  async resume(tenantId: string,extractionId: string): Promise<{ run: ExtractionRun; checkpoint: ExtractionCheckpoint }> {
    return tenantTransaction(this.pool,tenantId,async client => {
      const stored = await lockExtraction(client,tenantId,extractionId);
      return { run: stored.specification,checkpoint: checkpoint(stored) };
    });
  }
}
