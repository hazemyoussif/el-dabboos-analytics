import type { Pool } from 'pg';
import { categoricalDimensions, isCanonicalDecimal, reconciliationStatus, timeDimensions, validateSourceMapping } from '@el-dabboos/domain';
import type { ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import { tenantTransaction } from './session.ts';
import { dimensionSql } from './sql.ts';
import { periodKeys, periodRange } from '../calendar.ts';

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
      const m = (await client.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2 AND approval_status=\'approved\'',[first.tenantId,first.datasetId])).rows[0]?.specification as SourceMapping;
      validateSourceMapping(m);
      const measure = m.measures.find(m => m.measureId===first.measureId);
      if (m.approval.status!=='approved' || m.mappingVersion!==first.mappingVersion || m.reportingCurrency!==reportCurrency || !measure || first.grouping && categoricalDimensions.includes(first.grouping) && !Object.hasOwn(measure.dimensionMappings,first.grouping)) throw new Error('Uncertified reconciliation release/currency/group');
      const batches = (await client.query(`SELECT * FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=$2 AND batch_id=ANY($3::text[]) ORDER BY source_as_of,started_at,batch_id`,[first.tenantId,first.datasetId,first.batchIds])).rows;
      if (batches.length!==first.batchIds.length || batches.some(b => b.status!=='committed' || !b.pagination_complete || !b.source_objects.includes(measure.sourceObject))) throw new Error('Invalid frozen committed batch set');
      const baseline = batches.find(b => b.completeness==='complete_scope');
      const last = batches[batches.length-1]!;
      if (!baseline || last.frozen_revision!==first.frozenRevision || batches.some(b => JSON.stringify(b.company_ids)!==JSON.stringify(baseline.company_ids) || JSON.stringify(b.source_objects)!==JSON.stringify(baseline.source_objects))) throw new Error('Frozen baseline/scope required');
      // Completeness is frozen source-protocol evidence, never a census of today's mutable batch list.
      // Require a complete baseline and a continuous watermark chain within the supplied frozen set.
      if (batches[0] !== baseline) throw new Error('Frozen set must begin with its complete baseline');
      for (let i=1; i<batches.length; i++) {
        if (!batches[i-1].watermark_end || batches[i].watermark_start !== batches[i-1].watermark_end) throw new Error('Frozen batch set omits watermark continuity');
      }
      const isSnapshot = (await client.query('SELECT kind FROM mart.measure_definitions WHERE measure_id=$1',[first.measureId])).rows[0].kind==='snapshot';
      const group = first.grouping ? dimensionSql(first.grouping) : 'NULL::text';
      const frozen = `WITH frozen AS (SELECT DISTINCT ON (r.fact_key) r.* FROM mart.batch_facts b JOIN mart.fact_revisions r USING (tenant_id,dataset_id,fact_key,source_revision) WHERE b.tenant_id=$1 AND b.dataset_id=$2 AND b.batch_id=ANY($3::text[]) AND r.measure_id=$4 ORDER BY r.fact_key,r.source_revision DESC), active AS (SELECT * FROM frozen WHERE status='active')`;
      let actual: { key: string|null; value: string; count: string }[];
      if (isSnapshot && first.grouping && timeDimensions.includes(first.grouping)) {
        const keys = periodKeys({ from: first.from,to: first.to },first.grouping);
        if (keys.length>1000) throw new Error('Reconciliation group bound');
        actual = [];
        for (const key of keys) {
          const cutoff = periodRange(key,first.grouping).to;
          const row = (await client.query(`${frozen} SELECT coalesce(sum(value),0)::text value,count(*)::text count FROM (SELECT DISTINCT ON (entity_id) * FROM active WHERE business_date <= $5::date ORDER BY entity_id,business_date DESC) f`,[first.tenantId,first.datasetId,first.batchIds,first.measureId,cutoff<first.to ? cutoff : first.to])).rows[0];
          actual.push({ key,...row });
        }
      } else {
        const input = isSnapshot ? '(SELECT DISTINCT ON (entity_id) * FROM active WHERE business_date<=$6::date ORDER BY entity_id,business_date DESC)' : 'active';
        const range = isSnapshot ? '' : 'WHERE business_date BETWEEN $5::date AND $6::date';
        actual = (await client.query(`${frozen} SELECT ${group} key,coalesce(sum(value),0)::text value,count(*)::text count FROM ${input} f ${range} ${first.grouping ? `GROUP BY ${group}` : ''} LIMIT 1001`,[first.tenantId,first.datasetId,first.batchIds,first.measureId,first.from,first.to])).rows;
      }
      if (actual.length>1000 || actual.some(r => !isCanonicalDecimal(r.value))) throw new Error('Reconciliation numeric/group bounds');
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
