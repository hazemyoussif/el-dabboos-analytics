import { readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const { Pool }=createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [sourceEnvironment,martEnvironment,outputFile]=process.argv.slice(2);
if (!sourceEnvironment || !martEnvironment || !outputFile) throw new Error('Source env, mart env and protected output required');
const sourceConfig=parseEnv(await readFile(sourceEnvironment,'utf8'));
const martConfig=parseEnv(await readFile(martEnvironment,'utf8'));
if (sourceConfig.ODOO_SOURCE_DATABASE!=='accounting' || sourceConfig.ODOO_SOURCE_COMPANY_IDS!=='1') throw new Error('Approved company-1 source required');
const sourcePool=new Pool({ host: sourceConfig.ODOO_SOURCE_HOST,port: Number(sourceConfig.ODOO_SOURCE_PORT),database: 'accounting',user: sourceConfig.ODOO_SOURCE_USER,password: sourceConfig.ODOO_SOURCE_PASSWORD,max: 1,connectionTimeoutMillis: 5000 });
const martPool=new Pool({ connectionString: martConfig.MART_MIGRATOR_URL,max: 1,connectionTimeoutMillis: 5000 });
const source=await sourcePool.connect();const mart=await martPool.connect();
const report={ tenantId: 'el-dabboos-iq',datasetId: 'el-dabboos-staging-comparison-202609-v1',period: { from: '2026-09-01',to: '2026-09-30',timeZone: 'Asia/Baghdad' },controls: [],receivables: {},failures: [] };
const recipes=[
 ['order_revenue','sale_order',"state='sale'",'sum(amount_total)'],['order_count','sale_order',"state='sale'",'count(*)'],
 ['order_margin','sale_order',"state='sale'",'sum(margin)'],['order_untaxed_revenue','sale_order',"state='sale'",'sum(amount_untaxed)'],
 ['invoiced_revenue','account_move',"state='posted' AND move_type='out_invoice'",'sum(amount_untaxed_signed)'],
 ['refund_value','account_move',"state='posted' AND move_type='out_refund'",'-sum(amount_untaxed_signed)'],
 ['net_invoiced_revenue','account_move',"state='posted' AND move_type IN ('out_invoice','out_refund')",'sum(amount_untaxed_signed)'],
 ['invoice_count','account_move',"state='posted' AND move_type='out_invoice'",'count(*)'],
 ['refund_count','account_move',"state='posted' AND move_type='out_refund'",'count(*)']
];
async function read(client,sql,parameters=[]) {
 await client.query('EXPLAIN (FORMAT JSON) '+sql,parameters);
 return (await client.query(sql,parameters)).rows;
}
function groupExpression(grouping,object) {
 if (!grouping) return 'NULL::text';
 if (grouping==='month') return object==='sale_order' ? "to_char(date_order+interval '3 hours','YYYY-MM')" : "to_char(invoice_date,'YYYY-MM')";
 const field=grouping==='customer' ? 'partner_id' : grouping==='business_line' ? 'business_line_id' : object==='sale_order' ? 'user_id' : 'invoice_user_id';
 const prefix=grouping==='business_line' ? 'el-dabboos-odoo18-pg:1:' : 'el-dabboos-odoo18-pg:';
 return `CASE WHEN ${field} IS NULL THEN 'unassigned' ELSE '${prefix}'||${field}::text END`;
}
try {
 for (const client of [source,mart]) { await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true)"); }
 await mart.query("SELECT set_config('mart.tenant_id',$1,true)",[report.tenantId]);
 report.sourceSnapshot=(await source.query("SELECT transaction_timestamp() observed_at,current_setting('transaction_read_only') read_only,pg_current_snapshot()::text descriptor,(transaction_timestamp() AT TIME ZONE 'Asia/Baghdad')::date::text snapshot_date")).rows[0];
 report.martSnapshot=(await mart.query("SELECT transaction_timestamp() observed_at,current_setting('transaction_read_only') read_only,current_database() database")).rows[0];
 const mapped=(await mart.query('SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2',[report.tenantId,report.datasetId])).rows[0]?.specification;
 if (!mapped || report.sourceSnapshot.read_only!=='on' || report.martSnapshot.read_only!=='on') throw new Error('Approved read-only source/mart scope required');
 for (const [metric,object,eligible,expression] of recipes) for (const grouping of [null,'month','customer','salesperson','business_line']) {
  const group=groupExpression(grouping,object);
  const dates=object==='sale_order' ? "date_order>='2026-08-31 21:00:00' AND date_order<'2026-09-30 21:00:00'" : "invoice_date>='2026-09-01' AND invoice_date<'2026-10-01'";
  const sourceRows=await read(source,`SELECT ${group} key,coalesce(${expression},0)::numeric(30,6)::text value,count(*)::text population FROM ${object} WHERE company_id=1 AND ${eligible} AND ${dates} ${grouping ? `GROUP BY ${group}` : ''} ORDER BY key LIMIT 5001`);
  if (sourceRows.length>5000) throw new Error('Source group bound');
  const hasFacts=mapped.measures.some(measure=>measure.measureId===metric);
  const martGroup=grouping==='month' ? "to_char(business_date,'YYYY-MM')" : grouping ? `"${grouping}"` : 'NULL::text';
  const martRows=hasFacts ? await read(mart,`SELECT ${martGroup} key,coalesce(sum(value),0)::numeric(30,6)::text value,count(*)::text population FROM mart.canonical_facts WHERE tenant_id=$1 AND dataset_id=$2 AND measure_id=$3 AND business_date BETWEEN $4::date AND $5::date ${grouping ? `GROUP BY ${martGroup}` : ''} ORDER BY key LIMIT 5001`,[report.tenantId,report.datasetId,metric,report.period.from,report.period.to]) : [];
  const martGroups=new Map(martRows.map(row=>[row.key,row]));const sourceGroups=new Set(sourceRows.map(row=>row.key));
  const missing=sourceRows.filter(row=>!martGroups.has(row.key)).map(row=>row.key);const unexpected=martRows.filter(row=>!sourceGroups.has(row.key)).map(row=>row.key);
  const cases=sourceRows.map(expected=>({ groupKey: expected.key,expectedValue: expected.value,expectedCount: expected.population,actualValue: martGroups.get(expected.key)?.value ?? null,actualCount: martGroups.get(expected.key)?.population ?? null }));
  const exact=hasFacts && !missing.length && !unexpected.length && cases.every(control=>control.expectedValue===control.actualValue && control.expectedCount===control.actualCount);
  report.controls.push({ metric,grouping,sourceObject: object,sourceExpression: expression,eligible,sourceCases: cases,missingGroups: missing,unexpectedGroups: unexpected,status: exact ? 'exact' : hasFacts ? 'failed' : 'requires_new_bounded_extraction' });
 }
 report.marginQuality=await read(source,"WITH eligible AS (SELECT id,margin,margin_percent,amount_untaxed FROM sale_order WHERE company_id=1 AND state='sale' AND date_order>='2026-08-31 21:00:00' AND date_order<'2026-09-30 21:00:00'), lines AS (SELECT l.order_id,sum(l.margin) line_margin FROM sale_order_line l JOIN eligible o ON o.id=l.order_id GROUP BY l.order_id) SELECT count(*)::text orders,count(*) FILTER(WHERE o.margin IS DISTINCT FROM l.line_margin)::text header_line_margin_mismatches,count(*) FILTER(WHERE o.margin IS NULL)::text missing_margin,count(*) FILTER(WHERE abs(o.margin_percent-coalesce(o.margin/nullif(o.amount_untaxed,0),0))>0.000000001)::text standard_percentage_mismatches FROM eligible o JOIN lines l ON l.order_id=o.id");
 report.receivables.population=await read(source,"SELECT move_type,count(*)::text documents,count(*) FILTER(WHERE amount_residual_signed>0)::text positive_residuals,count(*) FILTER(WHERE invoice_date_due IS NULL)::text missing_due,sum(amount_residual_signed)::numeric(30,6)::text current_residual FROM account_move WHERE company_id=1 AND state='posted' AND move_type IN('out_invoice','out_refund') GROUP BY move_type");
 report.receivables.buckets=await read(source,"SELECT CASE WHEN invoice_date_due IS NULL THEN 'unknown' WHEN invoice_date_due<(transaction_timestamp() AT TIME ZONE 'Asia/Baghdad')::date THEN 'overdue' ELSE 'not_yet_due' END bucket,count(*)::text invoice_count,sum(amount_residual_signed)::numeric(30,6)::text residual FROM account_move WHERE company_id=1 AND state='posted' AND move_type='out_invoice' AND amount_residual_signed>0 GROUP BY 1");
 report.receivables.ledgerCheck=await read(source,"WITH receivable AS (SELECT l.move_id,sum(l.amount_residual) residual FROM account_move_line l JOIN account_account a ON a.id=l.account_id WHERE l.company_id=1 AND a.account_type='asset_receivable' GROUP BY l.move_id) SELECT m.move_type,count(*)::text documents,count(*) FILTER(WHERE r.move_id IS NULL)::text missing_ledger,count(*) FILTER(WHERE r.residual IS DISTINCT FROM m.amount_residual_signed)::text residual_mismatches FROM account_move m LEFT JOIN receivable r ON r.move_id=m.id WHERE m.company_id=1 AND m.state='posted' AND m.move_type IN('out_invoice','out_refund') GROUP BY 1");
 for (const client of [source,mart]) await client.query('ROLLBACK');
 await writeFile(outputFile,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({ output: outputFile,controls: report.controls.length,cases: report.controls.reduce((count,control)=>count+control.sourceCases.length,0),statuses: report.controls.reduce((counts,control)=>({ ...counts,[control.status]: (counts[control.status]??0)+1 }),{}),snapshotDate: report.sourceSnapshot.snapshot_date }));
} catch(error) { for (const client of [source,mart]) await client.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({ failed: true,code: error.code??'wave_one_controls' }));process.exitCode=1; }
finally { source.release();mart.release();await sourcePool.end();await martPool.end(); }
