import type { Pool } from 'pg';
import { categoricalDimensions, reconciliationStatus, validateSourceMapping } from '@el-dabboos/domain';
import type { ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { validateFrozenExtractions } from './frozen-extractions.ts';
import { aggregateReconciliation } from './reconciliation-aggregate.ts';

export class PostgresReconciliation {
  constructor(private readonly pool: Pool) {}
  async record(expected: readonly ReconciliationCase[], reportCurrency: string): Promise<{ cases: ReconciliationCase[]; status: 'reported'|'passed'|'failed'; missingGroups: string[]; unexpectedGroups: string[] }> {
    if (!expected.length || expected.length>1000) throw new Error('Bounded complete expected control set required');
    for (const c of expected) reconciliationStatus(c);
    const first = expected[0]!;
    const scope = (c: ReconciliationCase) => JSON.stringify([c.tenantId,c.datasetId,c.mappingVersion,c.measureId,c.sourceReportReference,c.frozenRevision,[...c.batchIds].sort(),c.from,c.to,c.grouping,c.tolerance]);
    if (expected.some(c => scope(c) !== scope(first)) || new Set(expected.map(c => c.caseId)).size !== expected.length || new Set(expected.map(c => c.groupKey)).size !== expected.length) throw new Error('Mixed/duplicate reconciliation scope');
    return tenantTransaction(this.pool,first.tenantId,async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([first.tenantId,first.datasetId])]);
      const m = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[first.tenantId,first.datasetId])).rows[0]?.specification as SourceMapping;
      validateSourceMapping(m);
      const measure = m.measures.find(m => m.measureId===first.measureId);
      if (m.mappingVersion!==first.mappingVersion || m.reportingCurrency!==reportCurrency || !measure || first.grouping && categoricalDimensions.includes(first.grouping) && !Object.hasOwn(measure.dimensionMappings,first.grouping)) throw new Error('Uncertified reconciliation release/currency/group');
      await validateFrozenExtractions(client,first,measure.sourceObject);
      const actual = await aggregateReconciliation(client,first);
      const actualMap = new Map(actual.map(r => [r.key,r])); const expectedKeys = new Set(expected.map(c => c.groupKey));
      const missingGroups = expected.filter(c => c.groupKey!==null && !actualMap.has(c.groupKey)).map(c => c.groupKey!);
      const unexpectedGroups = actual.filter(r => r.key!==null && !expectedKeys.has(r.key)).map(r => r.key!);
      const complete = !missingGroups.length && !unexpectedGroups.length;
      const cases = expected.map(c => ({ ...c,actualValue: actualMap.get(c.groupKey)?.value ?? '0.000000',actualCount: actualMap.get(c.groupKey)?.count ?? '0' }));
      const statuses = cases.map(c => reconciliationStatus(c));
      const status = first.tolerance.status==='pending' ? 'reported' : !complete || statuses.includes('failed') ? 'failed' : 'passed';
      for (const c of cases) {
        await client.query('INSERT INTO mart.reconciliation_evidence(tenant_id,case_id,dataset_id,specification,status,group_completeness,missing_groups,unexpected_groups) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[c.tenantId,c.caseId,c.datasetId,JSON.stringify(c),status,complete,missingGroups,unexpectedGroups]);
        for (const batchId of c.batchIds) await client.query('INSERT INTO mart.reconciliation_batches VALUES ($1,$2,$3,$4)',[c.tenantId,c.caseId,c.datasetId,batchId]);
      }
      return { cases,status,missingGroups,unexpectedGroups };
    });
  }
}
