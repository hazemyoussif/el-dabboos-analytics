import type { PoolClient } from 'pg';
import { isCanonicalDecimal, timeDimensions } from '@el-dabboos/domain';
import type { ReconciliationCase } from '@el-dabboos/domain';
import { periodKeys, periodRange } from '../calendar.ts';
import { dimensionSql } from './sql.ts';
export interface ReconciledTotal { key: string|null; value: string; count: string }
const frozenSql = `WITH frozen AS (SELECT DISTINCT ON (revision.fact_key) revision.* FROM mart.batch_facts batch JOIN mart.fact_revisions revision USING (tenant_id,dataset_id,fact_key,source_revision) WHERE batch.tenant_id=$1 AND batch.dataset_id=$2 AND batch.batch_id=ANY($3::text[]) AND revision.measure_id=$4 ORDER BY revision.fact_key,revision.source_revision DESC), active AS (SELECT * FROM frozen WHERE status='active')`;
async function snapshotPeriods(client: PoolClient,control: ReconciliationCase): Promise<ReconciledTotal[]> {
  const keys = periodKeys({ from: control.from,to: control.to },control.grouping!);
  if (keys.length>1000) throw new Error('Reconciliation group bound');
  const actual: ReconciledTotal[] = [];
  for (const key of keys) {
    const cutoff = periodRange(key,control.grouping!).to;
    const row = (await client.query(`${frozenSql} SELECT coalesce(sum(value),0)::numeric(30,6)::text value,count(*)::text count FROM (SELECT DISTINCT ON (entity_id) * FROM active WHERE business_date <= $5::date ORDER BY entity_id,business_date DESC) fact`,[control.tenantId,control.datasetId,control.batchIds,control.measureId,cutoff<control.to ? cutoff : control.to])).rows[0];
    actual.push({ key,...row });
  }
  return actual;
}
export async function aggregateReconciliation(client: PoolClient,control: ReconciliationCase): Promise<ReconciledTotal[]> {
  const snapshot = (await client.query('SELECT kind FROM mart.measure_definitions WHERE measure_id=$1',[control.measureId])).rows[0].kind==='snapshot';
  let actual: ReconciledTotal[];
  if (snapshot && control.grouping && timeDimensions.includes(control.grouping)) actual = await snapshotPeriods(client,control);
  else {
    const group = control.grouping ? dimensionSql(control.grouping) : 'NULL::text';
    const input = snapshot ? '(SELECT DISTINCT ON (entity_id) * FROM active WHERE business_date<=$5::date ORDER BY entity_id,business_date DESC)' : 'active';
    const range = snapshot ? '' : 'WHERE business_date BETWEEN $5::date AND $6::date';
    const dates = snapshot ? [control.to] : [control.from,control.to];
    actual = (await client.query(`${frozenSql} SELECT ${group} key,coalesce(sum(value),0)::numeric(30,6)::text value,count(*)::text count FROM ${input} f ${range} ${control.grouping ? `GROUP BY ${group}` : ''} LIMIT 1001`,[control.tenantId,control.datasetId,control.batchIds,control.measureId,...dates])).rows;
  }
  if (actual.length>1000 || actual.some(row => !isCanonicalDecimal(row.value))) throw new Error('Reconciliation numeric/group bounds');
  return actual;
}
