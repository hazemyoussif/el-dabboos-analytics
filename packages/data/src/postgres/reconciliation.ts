import type { Pool, PoolClient } from 'pg';
import { categoricalDimensions, reconciliationStatus, validateSourceMapping } from '@el-dabboos/domain';
import type { ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { validateFrozenExtractions } from './frozen-extractions.ts';
import { aggregateReconciliation } from './reconciliation-aggregate.ts';

export type ReconciliationResult = { cases: ReconciliationCase[]; status: 'reported'|'passed'|'failed'; missingGroups: string[]; unexpectedGroups: string[] };

export class PostgresReconciliation {
  constructor(private readonly pool: Pool) {}
  async record(expected: readonly ReconciliationCase[],reportCurrency: string): Promise<ReconciliationResult> {
    const first = expected[0];
    if (!first) throw new Error('Bounded complete expected control set required');
    return tenantTransaction(this.pool,first.tenantId,client => recordReconciliation(client,expected,reportCurrency));
  }
}

/** Shared frozen harness on the caller-owned mart transaction; no nested transaction. */
export async function recordReconciliation(client: PoolClient,expected: readonly ReconciliationCase[],reportCurrency: string): Promise<ReconciliationResult> {
  if (!expected.length || expected.length>1000) throw new Error('Bounded complete expected control set required');
  for (const control of expected) reconciliationStatus(control);
  const first = expected[0]!;
  const scope = (control: ReconciliationCase) => JSON.stringify([control.tenantId,control.datasetId,control.mappingVersion,control.measureId,control.sourceReportReference,control.frozenRevision,[...control.batchIds].sort(),control.from,control.to,control.grouping,control.tolerance]);
  if (expected.some(control => scope(control) !== scope(first)) || new Set(expected.map(control => control.caseId)).size !== expected.length || new Set(expected.map(control => control.groupKey)).size !== expected.length) throw new Error('Mixed/duplicate reconciliation scope');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([first.tenantId,first.datasetId])]);
  const sourceObject = await reconciliationSourceObject(client,first,reportCurrency);
  await validateFrozenExtractions(client,first,sourceObject);
  const actual = await aggregateReconciliation(client,first);
  const actualMap = new Map(actual.map(row => [row.key,row])); const expectedKeys = new Set(expected.map(control => control.groupKey));
  const missingGroups = expected.filter(control => control.groupKey!==null && !actualMap.has(control.groupKey)).map(control => control.groupKey!);
  const unexpectedGroups = actual.filter(row => row.key!==null && !expectedKeys.has(row.key)).map(row => row.key!);
  const complete = !missingGroups.length && !unexpectedGroups.length;
  const cases = expected.map(control => ({ ...control,actualValue: actualMap.get(control.groupKey)?.value ?? '0.000000',actualCount: actualMap.get(control.groupKey)?.count ?? '0' }));
  const statuses = cases.map(control => reconciliationStatus(control));
  const status = first.tolerance.status==='pending' ? 'reported' : !complete || statuses.includes('failed') ? 'failed' : 'passed';
  for (const control of cases) {
    await client.query('INSERT INTO mart.reconciliation_evidence(tenant_id,case_id,dataset_id,specification,status,group_completeness,missing_groups,unexpected_groups) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[control.tenantId,control.caseId,control.datasetId,JSON.stringify(control),status,complete,missingGroups,unexpectedGroups]);
    for (const batchId of control.batchIds) await client.query('INSERT INTO mart.reconciliation_batches VALUES ($1,$2,$3,$4)',[control.tenantId,control.caseId,control.datasetId,batchId]);
  }
  return { cases,status,missingGroups,unexpectedGroups };
}

async function reconciliationSourceObject(client: PoolClient,first: ReconciliationCase,reportCurrency: string): Promise<string> {
  const mapping = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[first.tenantId,first.datasetId])).rows[0]?.specification as SourceMapping;
  validateSourceMapping(mapping);
  const measure = mapping.measures.find(mapping => mapping.measureId===first.measureId);
  if (mapping.mappingVersion!==first.mappingVersion || mapping.reportingCurrency!==reportCurrency || !measure || first.grouping && categoricalDimensions.includes(first.grouping) && !Object.hasOwn(measure.dimensionMappings,first.grouping)) throw new Error('Uncertified reconciliation release/currency/group');
  return measure.sourceObject;
}
