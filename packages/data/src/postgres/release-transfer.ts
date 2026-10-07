import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { validateSourceMapping } from '@el-dabboos/domain';
import { assertPublicationOperator } from './release-certification.ts';

/** Fixed dependency order; no caller-selected SQL, tables or tenant remapping. */
export const releaseTables = ['mapping_releases','extraction_runs','ingestion_batches','fact_revisions','fact_heads','snapshot_owners','batch_facts','data_quality_rejects','reconciliation_evidence','reconciliation_batches','release_certifications'] as const;
export interface ReleaseTransfer {
  tenantId: string; datasetId: string;
  tables: Record<string,string[]>;
  fingerprint: string;
  schema: string;
}
export async function readReleaseRows(client: PoolClient,scope: Pick<ReleaseTransfer,'tenantId'|'datasetId'>): Promise<Record<string,string[]>> {
  const tables: Record<string,string[]> = {};
  for (const table of releaseTables) {
    const predicate = table==='data_quality_rejects' ? 'tenant_id=$1 AND batch_id IN (SELECT batch_id FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=$2)' : 'tenant_id=$1 AND dataset_id=$2';
    const rows = (await client.query(`SELECT to_jsonb(record)::text payload FROM mart.${table} record WHERE ${predicate} ORDER BY to_jsonb(record)::text COLLATE "C" LIMIT 100001`,[scope.tenantId,scope.datasetId])).rows;
    if (rows.length>100000) throw new Error('Release promotion row limit exceeded');
    tables[table] = rows.map(row => row.payload as string);
  }
  if (releasePayloadBytes(tables)>128*1024*1024) throw new Error('Release promotion byte limit exceeded');
  return tables;
}
export function releaseFingerprint(tables: Record<string,string[]>): string {
  return createHash('sha256').update(JSON.stringify(releaseTables.map(table => [table,tables[table]]))).digest('hex');
}
export async function assertCertifiedRelease(client: PoolClient,scope: Pick<ReleaseTransfer,'tenantId'|'datasetId'>): Promise<void> {
  await assertPublicationOperator(client);
  const mapping = (await client.query(`SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2
    AND approval_status='approved' AND mart.reconciliation_certified(tenant_id,dataset_id,mapping_version,approval_case_ids)
    AND mart.business_certified(tenant_id,dataset_id,approval_reference,approval_case_ids)`,[scope.tenantId,scope.datasetId])).rows[0];
  if (!mapping) throw new Error('Approved certified release required for promotion');
  validateSourceMapping(mapping.specification);
}
export async function martSchemaFingerprint(client: PoolClient): Promise<string> {
  return JSON.stringify((await client.query('SELECT version,name,sha256 FROM mart_admin.mart_schema_migrations ORDER BY version')).rows);
}
export async function insertReleaseRows(client: PoolClient,transfer: ReleaseTransfer): Promise<void> {
  for (const table of releaseTables) {
    const rows = transfer.tables[table]!;
    for (let offset=0;offset<rows.length;offset+=250) {
      const page = rows.slice(offset,offset+250);
      const payload = table==='mapping_releases' ? pendingMapping(page[0]!) : `[${page.join(',')}]`;
      await client.query(`INSERT INTO mart.${table} OVERRIDING SYSTEM VALUE SELECT * FROM jsonb_populate_recordset(NULL::mart.${table},$1::jsonb)`,[payload]);
    }
  }
}
function pendingMapping(payload: string): string {
  const mapping = JSON.parse(payload);
  return JSON.stringify([{ ...mapping,approval_status: 'pending',approval_reference: null,approved_at: null,approval_case_ids: [] }]);
}

/** UTF-8 bytes of the immutable JSON records plus framing, without quoting every JSON record a second time. */
export function releasePayloadBytes(tables: Record<string, readonly string[]>): number {
  const framing = JSON.stringify(Object.fromEntries(Object.keys(tables).map(table => [table,[]])));
  return Buffer.byteLength(framing,'utf8') + Object.values(tables).reduce((total,rows) => total + Math.max(0,rows.length-1) + rows.reduce((bytes,row) => bytes + Buffer.byteLength(row,'utf8'),0),0);
}
