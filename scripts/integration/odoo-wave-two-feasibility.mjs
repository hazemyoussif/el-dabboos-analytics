import { readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const { Pool }=createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [environmentFile,outputFile]=process.argv.slice(2);
if (!environmentFile || !outputFile) throw new Error('Usage: odoo-wave-two-feasibility.mjs operator-env output-json');
const environment=parseEnv(await readFile(environmentFile,'utf8'));
if (environment.ODOO_SOURCE_DATABASE!=='accounting' || environment.ODOO_SOURCE_COMPANY_IDS!=='1') throw new Error('Only authorized accounting/company-1 scope allowed');
const pool=new Pool({host:environment.ODOO_SOURCE_HOST,port:Number(environment.ODOO_SOURCE_PORT ?? 5432),database:environment.ODOO_SOURCE_DATABASE,user:environment.ODOO_SOURCE_USER,password:environment.ODOO_SOURCE_PASSWORD,max:1,connectionTimeoutMillis:5000});
const queries={
 classification_metadata:`SELECT model,name,ttype,relation,state FROM ir_model_fields WHERE model IN ('res.partner','product.template','product.brand','stock.move','stock.picking','account.report.budget','account.report.budget.item') AND (name ~ '(agency|supplier_type|return_reason|damage|brand|category)' OR model LIKE 'account.report.budget%') ORDER BY model,name LIMIT 250`,
 agency_bridge:`WITH scoped_brands AS (SELECT DISTINCT template.product_brand_id id FROM product_template template JOIN product_product product ON product.product_tmpl_id=template.id JOIN sale_order_line line ON line.product_id=product.id JOIN sale_order orders ON orders.id=line.order_id WHERE orders.company_id=1 AND orders.state='sale' AND orders.date_order>='2026-08-31 21:00:00' AND orders.date_order<'2026-09-30 21:00:00') SELECT count(*)::text brands,count(*) FILTER(WHERE brand.partner_id IS NULL)::text no_partner,count(DISTINCT brand.partner_id)::text partners,count(*) FILTER(WHERE partner.company_id NOT IN (1))::text other_company FROM scoped_brands JOIN product_brand brand USING(id) LEFT JOIN res_partner partner ON partner.id=brand.partner_id`,
 partner_category_coverage:`WITH scoped AS (SELECT partner_id FROM account_move WHERE company_id=1 AND state='posted' AND move_type IN ('out_invoice','out_refund','in_invoice','in_refund') AND invoice_date>='2026-09-01' AND invoice_date<'2026-10-01' GROUP BY partner_id), counts AS (SELECT scoped.partner_id,count(DISTINCT relation.category_id) categories FROM scoped LEFT JOIN res_partner_res_partner_category_rel relation ON relation.partner_id=scoped.partner_id GROUP BY scoped.partner_id) SELECT count(*)::text partners,count(*) FILTER(WHERE categories=0)::text unclassified,count(*) FILTER(WHERE categories>1)::text multiple_categories FROM counts`,
 budgets:`SELECT count(DISTINCT budget.id)::text budgets,count(item.id)::text items,min(item.date)::text earliest,max(item.date)::text latest FROM account_report_budget budget LEFT JOIN account_report_budget_item item ON item.budget_id=budget.id WHERE budget.company_id=1`,
 landed_costs:`SELECT state,count(*)::text documents,count(*) FILTER(WHERE vendor_bill_id IS NOT NULL)::text with_vendor_bill,count(*) FILTER(WHERE account_move_id IS NOT NULL)::text with_journal_move FROM stock_landed_cost WHERE company_id=1 AND date>='2026-09-01' AND date<'2026-10-01' GROUP BY state ORDER BY state`,
 supplier_ledger:`SELECT account.account_type,count(*)::text lines,count(DISTINCT line.partner_id)::text partners,count(*) FILTER(WHERE line.date_maturity IS NULL)::text missing_due FROM account_move_line line JOIN account_account account ON account.id=line.account_id JOIN account_move move ON move.id=line.move_id WHERE line.company_id=1 AND move.company_id=1 AND move.state='posted' AND account.account_type='liability_payable' AND line.date>='2026-09-01' AND line.date<'2026-10-01' GROUP BY account.account_type`
};
let client;
try {
 client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','30000',true),set_config('TimeZone','UTC',true)");
 const transaction=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,transaction_timestamp() source_as_of")).rows[0];
 if (transaction.database!=='accounting' || transaction.read_only!=='on') throw new Error('Read-only source required');
 const result={scope:{companyId:1,sourceAsOf:transaction.source_as_of,readOnly:true,samplePeriod:{from:'2026-09-01',to:'2026-09-30',timeZone:'Asia/Baghdad'}},queries:{},plans:{}};
 for (const [name,sql] of Object.entries(queries)) {
  result.plans[name]=(await client.query('EXPLAIN (FORMAT JSON) '+sql)).rows[0]['QUERY PLAN'][0].Plan;
  result.queries[name]=(await client.query(sql)).rows;
  if (name==='classification_metadata' && result.queries[name].length>=250) throw new Error('Metadata inspection bound reached; absence conclusions unavailable');
 }
 await client.query('ROLLBACK');
 await writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({completed:Object.keys(result.queries),readOnly:true,output:outputFile}));
} catch(error) {
 await client?.query('ROLLBACK').catch(()=>{});
 console.error(JSON.stringify({failed:true,code:error.code ?? 'feasibility'}));process.exitCode=1;
} finally {client?.release();await pool.end();}
