import { resolveOdooSourceConfig } from './source-connections.ts';
import type { ExtractionRun } from '@el-dabboos/domain';
import { createMartPool, createOdooSourcePool, ingestRetainedOdooPilot, odooComparisonCandidate, OdooSnapshotLease, PostgresExtractionRuns, PostgresMappingReleases } from '@el-dabboos/data';
import type { OdooMappingIdentity } from '@el-dabboos/data';

export interface OdooPilotManifest { mapping: OdooMappingIdentity; extractionId: string }
export function validateOdooPilotManifest(value: unknown): OdooPilotManifest {
  if (!value || typeof value!=='object' || Object.keys(value).sort().join(',')!=='extractionId,mapping') throw new Error('Invalid pilot manifest');
  const manifest = value as OdooPilotManifest;
  const identityKeys = ['tenantId','sourceId','datasetId','mappingId','mappingVersion','businessOwner','reportingCurrency','timeZone'];
  if (!manifest.mapping || Object.keys(manifest.mapping).sort().join(',')!==identityKeys.sort().join(',')) throw new Error('Invalid pilot mapping identity');
  const mapping = odooComparisonCandidate(manifest.mapping);
  if (mapping.tenantId!=='el-dabboos-iq' || mapping.sourceId!=='el-dabboos-odoo18-pg' || mapping.reportingCurrency!=='IQD' || manifest.mapping.timeZone!=='Asia/Baghdad') throw new Error('Unapproved pilot identity');
  if (typeof manifest.extractionId!=='string' || !manifest.extractionId.trim() || manifest.extractionId.trim()!==manifest.extractionId || manifest.extractionId.length>160) throw new Error('Invalid pilot extraction identity');
  return manifest;
}
function required(environment: NodeJS.ProcessEnv,key: string): string {
  const value = environment[key];
  if (!value) throw new Error('Missing pilot mart configuration');
  return value;
}
/** Explicit offline composition; runtime credentials never write, and no command approves or binds. */
export async function executeOdooPilot(command: string,manifest: OdooPilotManifest,environment: NodeJS.ProcessEnv) {
  if (!['register','run','status'].includes(command)) throw new Error('Unknown pilot command; use retained run for extraction and DB controls');
  validateOdooPilotManifest(manifest);
  const mapping = odooComparisonCandidate(manifest.mapping);
  const mart = createMartPool(required(environment,command==='register' ? 'MART_MIGRATOR_URL' : 'MART_INGESTOR_URL'),1);
  try {
    if (command==='register') {
      await new PostgresMappingReleases(mart).registerCandidate(mapping);
      return { status: 'candidate',datasetId: mapping.datasetId,mappingVersion: mapping.mappingVersion };
    }
    if (command==='status') return (await new PostgresExtractionRuns(mart,{ [mapping.tenantId]: ['1'] }).resume(mapping.tenantId,manifest.extractionId)).checkpoint;
    return await executeRetainedRun(manifest,environment,mart);
  } finally { await mart.end(); }
}
async function executeRetainedRun(manifest: OdooPilotManifest,environment: NodeJS.ProcessEnv,mart: ReturnType<typeof createMartPool>) {
  const mapping = odooComparisonCandidate(manifest.mapping);
  const config = await resolveOdooSourceConfig(environment,{ tenantId: mapping.tenantId,sourceId: mapping.sourceId });
  if (config.companyIds.length!==1 || config.companyIds[0]!=='1') throw new Error('Unapproved pilot company configuration');
  const ownerPool = createOdooSourcePool(config);
  const sourcePool = createOdooSourcePool(config);
  let snapshot: OdooSnapshotLease | undefined;
  try {
    snapshot = await OdooSnapshotLease.open(ownerPool,config,config.snapshotMaxDurationMs);
    const run: ExtractionRun = { tenantId: mapping.tenantId,sourceId: mapping.sourceId,companyIds: ['1'],datasetId: mapping.datasetId,mappingId: mapping.mappingId,mappingVersion: mapping.mappingVersion,extractionId: manifest.extractionId,sourceObjects: ['sale_order','account_move'],from: '2026-09-01',to: '2026-09-30',sourceAsOf: snapshot.evidence.sourceAsOf,frozenRevision: snapshot.evidence.frozenRevision,freezeReference: snapshot.evidence.freezeReference,completeness: 'complete_scope' };
    const result = await ingestRetainedOdooPilot({ sourcePool,martPool: mart,sourceConfig: config,mapping,run,snapshot });
    return { ...result,evidenceKind: 'DB-only; Invoice Analysis sign-off still required' };
  } finally {
    await snapshot?.close();
    await Promise.all([ownerPool.end(),sourcePool.end()]);
  }
}
