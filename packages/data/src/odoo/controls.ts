import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { FactMeasureId, ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import type { OdooReadScope } from './reader.ts';
import type { OdooSnapshotLease } from './snapshot.ts';
export interface OdooControlScope {
  mapping: SourceMapping; source: OdooReadScope; companyIds: readonly string[];
  tolerance: ReconciliationCase['tolerance'];
  reportReference: string;
}
interface ControlMeasure { measure: FactMeasureId; eligible: string; expression: string }
function controlMeasures(object: OdooReadScope['object']): ControlMeasure[] {
  if (object==='sale_order') return [
    { measure: 'order_count',eligible: "state='sale'",expression: 'count(*)' },
    { measure: 'order_revenue',eligible: "state='sale'",expression: 'sum(amount_total)' },
    { measure: 'cancelled_orders',eligible: "state='cancel'",expression: 'count(*)' },
  ];
  return [
    { measure: 'invoiced_revenue',eligible: "state='posted' AND move_type='out_invoice'",expression: 'sum(amount_untaxed_signed)' },
    { measure: 'refund_value',eligible: "state='posted' AND move_type='out_refund'",expression: '-sum(amount_untaxed_signed)' },
    { measure: 'net_invoiced_revenue',eligible: "state='posted' AND move_type IN ('out_invoice','out_refund')",expression: 'sum(amount_untaxed_signed)' },
    { measure: 'invoice_count',eligible: "state='posted' AND move_type='out_invoice'",expression: 'count(*)' },
    { measure: 'refund_count',eligible: "state='posted' AND move_type='out_refund'",expression: 'count(*)' },
  ];
}
function controlGrouping(grouping: 'business_line'|'salesperson'|null,source: OdooReadScope): string {
  if (!grouping) return 'NULL::text';
  if (grouping==='business_line') return "CASE WHEN business_line_id IS NULL THEN 'unassigned' ELSE $4::text||':'||company_id::text||':'||business_line_id::text END";
  const field = source.object==='sale_order' ? 'user_id' : 'invoice_user_id';
  return `CASE WHEN ${field} IS NULL THEN 'unassigned' ELSE $4::text||':'||${field}::text END`;
}
/** Independent governed header SQL controls; these are DB evidence, never Invoice Analysis sign-off. */
export async function readOdooControls(pool: Pool,scope: OdooControlScope,snapshot: OdooSnapshotLease): Promise<Omit<ReconciliationCase,'batchIds'>[][]> {
  const { source,mapping } = scope;
  snapshot.assertScope(source,mapping);
  const date = source.object==='sale_order' ? "((date_order AT TIME ZONE 'UTC') AT TIME ZONE $5)::date" : 'invoice_date';
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await snapshot.importInto(client);
    await client.query("SELECT set_config('statement_timeout','15000',true)");
    const sets: Omit<ReconciliationCase,'batchIds'>[][] = [];
    for (const measure of controlMeasures(source.object)) for (const grouping of [null,'business_line','salesperson'] as const) {
      const group = controlGrouping(grouping,source);
      const result = await client.query(`SELECT ${group} key,coalesce(${measure.expression},0)::numeric(30,6)::text value,count(*)::text count
        FROM ${source.object} WHERE company_id=ANY($1::int[]) AND ${date} BETWEEN $2::date AND $3::date AND ${measure.eligible}
        AND $4::text IS NOT NULL AND $5::text IS NOT NULL ${grouping ? `GROUP BY ${group}` : ''} LIMIT 1001`,[scope.companyIds,source.from,source.to,mapping.sourceId,source.timeZone]);
      if (result.rows.length>1000) throw new Error('Source control group bound');
      if (!result.rows.length) continue; // No new-division history is a valid empty grouping, not a fabricated control.
      sets.push(result.rows.map(row => ({ caseId: 'db-'+createHash('sha256').update(JSON.stringify([scope.reportReference,mapping.datasetId,source.object,measure.measure,grouping,row.key])).digest('hex'),
        tenantId: mapping.tenantId,datasetId: mapping.datasetId,mappingVersion: mapping.mappingVersion,measureId: measure.measure,sourceReportReference: scope.reportReference,frozenRevision: source.frozenRevision,
        from: source.from,to: source.to,grouping,groupKey: row.key,expectedValue: row.value,expectedCount: row.count,actualValue: '0.000000',actualCount: '0',tolerance: scope.tolerance })));
    }
    await snapshot.assertAlive();
    await client.query('COMMIT');
    return sets;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
