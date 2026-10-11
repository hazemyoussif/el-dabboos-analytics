import { maxReconciliationGroups } from '@el-dabboos/domain';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { FactMeasureId, ReconciliationCase, SourceMapping } from '@el-dabboos/domain';
import type { OdooReadScope } from './reader.ts';
import type { OdooSnapshotLease } from './snapshot.ts';
export interface OdooControlScope {
  mapping: SourceMapping; source: OdooReadScope; companyIds: readonly string[];
  tolerance: ReconciliationCase['tolerance'];
  reportReference: string;
  groupings?: readonly ('business_line'|'salesperson'|'customer'|null)[];
}
interface ControlMeasure { measure: FactMeasureId; eligible: string; expression: string; negate?: boolean }
type ControlGrouping = 'business_line'|'salesperson'|'customer'|null;
function controlMeasures(object: OdooReadScope['object']): ControlMeasure[] {
  if (object==='sale_order') return [
    { measure: 'order_count',eligible: "state='sale'",expression: 'count(*)' },
    { measure: 'order_revenue',eligible: "state='sale'",expression: 'sum(amount_total)' },
    { measure: 'cancelled_orders',eligible: "state='cancel'",expression: 'count(*)' },
  ];
  return [
    { measure: 'invoiced_revenue',eligible: "state='posted' AND move_type='out_invoice'",expression: 'sum(amount_untaxed_signed)' },
    { measure: 'refund_value',eligible: "state='posted' AND move_type='out_refund'",expression: 'sum(amount_untaxed_signed)',negate: true },
    { measure: 'net_invoiced_revenue',eligible: "state='posted' AND move_type IN ('out_invoice','out_refund')",expression: 'sum(amount_untaxed_signed)' },
    { measure: 'invoice_count',eligible: "state='posted' AND move_type='out_invoice'",expression: 'count(*)' },
    { measure: 'refund_count',eligible: "state='posted' AND move_type='out_refund'",expression: 'count(*)' },
  ];
}
function controlGrouping(grouping: ControlGrouping,source: OdooReadScope): string {
  if (!grouping) return 'NULL::text';
  if (grouping==='business_line') return "CASE WHEN business_line_id IS NULL THEN 'unassigned' ELSE $4::text||':'||company_id::text||':'||business_line_id::text END";
  const field = grouping==='customer' ? 'partner_id' : source.object==='sale_order' ? 'user_id' : 'invoice_user_id';
  return `CASE WHEN ${field} IS NULL THEN 'unassigned' ELSE $4::text||':'||${field}::text END`;
}
function controlProjection(measures: readonly ControlMeasure[]): string {
  return measures.flatMap(measure => {
    const aggregate = `${measure.expression} FILTER (WHERE ${measure.eligible})`;
    const value = measure.negate ? `-(${aggregate})` : aggregate;
    return [
      `coalesce(${value},0)::numeric(30,6)::text "${measure.measure}_value"`,
      `count(*) FILTER (WHERE ${measure.eligible})::text "${measure.measure}_count"`,
    ];
  }).join(',');
}
/** Independent governed header SQL controls; these are DB evidence, never Invoice Analysis sign-off.
 * Each grouping scans the retained source snapshot once and projects every governed measure. */
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
    const groupings = scope.groupings ?? [null,'business_line','salesperson'];
    if (!groupings.length || new Set(groupings).size!==groupings.length || groupings.some(group => ![null,'business_line','salesperson','customer'].includes(group))) throw new Error('Explicit bounded control groupings required');
    const measures = controlMeasures(source.object);
    const rowsByGrouping = new Map<ControlGrouping,Record<string,string>[]>();
    const eligible = measures.map(measure => `(${measure.eligible})`).join(' OR ');
    for (const grouping of groupings) {
      const group = controlGrouping(grouping,source);
      const result = await client.query(`SELECT ${group} key,${controlProjection(measures)}
        FROM ${source.object} WHERE company_id=ANY($1::int[]) AND ${date} BETWEEN $2::date AND $3::date
        AND $4::text IS NOT NULL AND $5::text IS NOT NULL AND (${eligible}) ${grouping ? `GROUP BY ${group}` : ''} LIMIT ${maxReconciliationGroups+1}`,[scope.companyIds,source.from,source.to,mapping.sourceId,source.timeZone]);
      if (result.rows.length>maxReconciliationGroups) throw new Error('Source control group bound');
      rowsByGrouping.set(grouping,result.rows);
    }
    // Preserve the historical case/set ordering: measure first, then requested grouping.
    for (const measure of measures) for (const grouping of groupings) {
      const rows = (rowsByGrouping.get(grouping) ?? []).filter(row => grouping===null || row[`${measure.measure}_count`]!=='0');
      if (!rows.length) continue;
      sets.push(rows.map(row => ({ caseId: 'db-'+createHash('sha256').update(JSON.stringify([scope.reportReference,mapping.datasetId,source.object,measure.measure,grouping,row.key])).digest('hex'),
        tenantId: mapping.tenantId,datasetId: mapping.datasetId,mappingVersion: mapping.mappingVersion,measureId: measure.measure,sourceReportReference: scope.reportReference,frozenRevision: source.frozenRevision,
        from: source.from,to: source.to,grouping,groupKey: row.key,expectedValue: row[`${measure.measure}_value`]!,expectedCount: row[`${measure.measure}_count`]!,actualValue: '0.000000',actualCount: '0',tolerance: scope.tolerance })));
    }
    await snapshot.assertAlive();
    await client.query('COMMIT');
    return sets;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
