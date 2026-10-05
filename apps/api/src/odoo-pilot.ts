import type { ExtractionRun } from '@el-dabboos/domain';
import { validateExtractionRun } from '@el-dabboos/domain';
import { createMartPool, createOdooSourcePool, ingestOdooExtraction, odooComparisonCandidate, odooSourceConfig, PostgresExtractionRuns, PostgresMappingReleases, readOdooControls, reconcileExtraction, verifyOdooSourceIdentity } from '@el-dabboos/data';
import type { OdooMappingIdentity } from '@el-dabboos/data';

export interface OdooPilotManifest { mapping: OdooMappingIdentity; run: ExtractionRun }
export function validateOdooPilotManifest(value: unknown): OdooPilotManifest {
  if (!value || typeof value!=='object' || Object.keys(value).sort().join(',')!=='mapping,run') throw new Error('Invalid pilot manifest');
  const manifest = value as OdooPilotManifest;
  const identityKeys = ['tenantId','sourceId','datasetId','mappingId','mappingVersion','businessOwner','reportingCurrency','timeZone'];
  if (!manifest.mapping || Object.keys(manifest.mapping).sort().join(',')!==identityKeys.sort().join(',')) throw new Error('Invalid pilot mapping identity');
  const mapping = odooComparisonCandidate(manifest.mapping);
  const { run } = manifest;
  validateExtractionRun(run);
  if (mapping.tenantId!=='el-dabboos-iq' || mapping.sourceId!=='el-dabboos-odoo18-pg' || run.companyIds.length!==1 || run.companyIds[0]!=='1') throw new Error('Unapproved pilot identity');
  for (const key of ['tenantId','sourceId','datasetId','mappingId','mappingVersion'] as const) {
    if (run[key]!==mapping[key]) throw new Error('Pilot mapping scope conflict');
  }
  validatePilotPeriod(run);
  return manifest;
}
function validatePilotPeriod(run: ExtractionRun): void {
  if (run.from!=='2026-09-01' || run.to!=='2026-09-30' || run.completeness!=='complete_scope' || run.sourceObjects.length!==1 || !['sale_order','account_move'].includes(run.sourceObjects[0]!)) throw new Error('Unapproved pilot extraction scope');
}
function required(environment: NodeJS.ProcessEnv,key: string): string {
  const value = environment[key];
  if (!value) throw new Error('Missing pilot mart configuration');
  return value;
}
/** Explicit offline composition: never part of serving startup, never approves or binds a release. */
export async function executeOdooPilot(command: string,manifest: OdooPilotManifest,environment: NodeJS.ProcessEnv) {
  if (!['register','ingest','reconcile-db','status'].includes(command)) throw new Error('Unknown pilot command');
  validateOdooPilotManifest(manifest);
  const mapping = odooComparisonCandidate(manifest.mapping);
  const { run } = manifest;
  const mart = createMartPool(required(environment,command==='register' ? 'MART_MIGRATOR_URL' : 'MART_INGESTOR_URL'),1);
  try {
    if (command==='register') {
      await new PostgresMappingReleases(mart).registerCandidate(mapping);
      return { status: 'candidate',datasetId: mapping.datasetId,mappingVersion: mapping.mappingVersion };
    }
    if (command==='status') return (await new PostgresExtractionRuns(mart,{ [run.tenantId]: ['1'] }).resume(run.tenantId,run.extractionId)).checkpoint;
    return await executeSourceStep(command,manifest,environment,mart);
  } finally { await mart.end(); }
}
async function executeSourceStep(command: string,manifest: OdooPilotManifest,environment: NodeJS.ProcessEnv,mart: ReturnType<typeof createMartPool>) {
  const { run } = manifest;
  const mapping = odooComparisonCandidate(manifest.mapping);
  const config = odooSourceConfig(environment,{ tenantId: run.tenantId,sourceId: run.sourceId });
  if (config.companyIds.length!==1 || config.companyIds[0]!=='1') throw new Error('Unapproved pilot company configuration');
  const sourcePool = createOdooSourcePool(config);
  const scope = { object: run.sourceObjects[0] as 'sale_order'|'account_move',from: run.from,to: run.to,timeZone: manifest.mapping.timeZone,sourceAsOf: run.sourceAsOf,frozenRevision: run.frozenRevision,freezeReference: run.freezeReference };
  try {
    if (command==='ingest') return await ingestOdooExtraction({ sourcePool,martPool: mart,sourceConfig: config,mapping,run,scope });
    const checkpoint = await new PostgresExtractionRuns(mart,{ [run.tenantId]: config.companyIds }).begin(run);
    if (checkpoint.status!=='complete') throw new Error('Completed pilot extraction required');
    await verifyOdooSourceIdentity(sourcePool);
    const controls = await readOdooControls(sourcePool,{ mapping,source: scope,companyIds: run.companyIds,tolerance: { status: 'approved',absoluteValue: '0.000000',absoluteCount: '0',approvalReference: 'Pilot handoff: exact DB control equality' },reportReference: `DB controls ${run.extractionId} ${run.frozenRevision}` });
    const evidence = [];
    for (const group of controls) evidence.push(await reconcileExtraction(mart,run.extractionId,group,mapping.reportingCurrency));
    return { extractionId: run.extractionId,cases: evidence.reduce((count,item) => count+item.cases.length,0),passed: evidence.length>0 && evidence.every(item => item.status==='passed'),evidenceKind: 'DB-only; Invoice Analysis sign-off still required' };
  } finally { await sourcePool.end(); }
}
