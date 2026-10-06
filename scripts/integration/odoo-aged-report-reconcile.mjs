import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { compareAgedCustomers } from './odoo-aged-comparison.ts';
import { controlQualitySql } from './receivables-control-query.ts';
import { odooAgedCustomerSql,odooAgedBridgeSql,odooAgedPopulationSql } from './odoo-aged-report-query.ts';
const { Pool }=createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [environmentPath,referencePath,workbookPath,requestedDirectory]=process.argv.slice(2);
if (!environmentPath || !referencePath || !workbookPath || !requestedDirectory) throw new Error('Operator env, parsed workbook reference, unchanged workbook and new private output directory required');
const outputDirectory=resolve(requestedDirectory);
if (!outputDirectory.startsWith('/tmp/')) throw new Error('Customer-level Finance evidence must remain private outside Git');
const reference=JSON.parse(await readFile(referencePath,'utf8'));
const workbookHash=createHash('sha256').update(await readFile(workbookPath)).digest('hex');
if (!reference.integrity.passed || reference.reportDate!=='2026-09-30' || reference.reportingCurrency!=='IQD' || workbookHash!==reference.workbookSha256) throw new Error('Unchanged, internally reconciled September Excel control required');
const environment=parseEnv(await readFile(environmentPath,'utf8'));
if (environment.ODOO_SOURCE_DATABASE!=='accounting' || environment.ODOO_SOURCE_COMPANY_IDS!=='1' || !['127.0.0.1','localhost','::1'].includes(environment.ODOO_SOURCE_HOST)) throw new Error('Authorized accounting/company-1 tunnel required');
const pool=new Pool({host:environment.ODOO_SOURCE_HOST,port:Number(environment.ODOO_SOURCE_PORT),database:'accounting',user:environment.ODOO_SOURCE_USER,password:environment.ODOO_SOURCE_PASSWORD,max:1,connectionTimeoutMillis:5000});
const metadataQueries={
 company:`SELECT company.id::text company_id,company.name company_name,currency.name currency,currency.rounding::text rounding,currency.decimal_places FROM res_company company JOIN res_currency currency ON currency.id=company.currency_id WHERE company.id=1`,
 models:`SELECT model,state,to_jsonb(model)->>'modules' modules FROM ir_model model WHERE model IN ('account.aged.receivable.report.handler','account.aged.partner.balance.report.handler','account.move.line','account.partial.reconcile','account.full.reconcile') ORDER BY model`,
 reports:`SELECT report.id::text id,report.name::text name,to_jsonb(report)->>'custom_handler_model_id' handler_id,to_jsonb(report)->>'filter_date_range' filter_date_range,to_jsonb(report)->>'filter_account_type' filter_account_type FROM account_report report WHERE report.name::text ~* '(aged|receivable)' ORDER BY report.id LIMIT 100`,
 report_expressions:`SELECT report.id::text report_id,line.id::text line_id,line.groupby,expression.label,expression.engine,expression.formula,expression.subformula FROM account_report_expression expression JOIN account_report_line line ON line.id=expression.report_line_id JOIN account_report report ON report.id=line.report_id WHERE report.name::text ~* '(aged|receivable)' ORDER BY report.id,line.id,expression.id LIMIT 100`,
 installed_modules:`SELECT name,latest_version FROM ir_module_module WHERE state='installed' AND name ~ '(account_reports|accounting|fifo|reconcile|business_line_account|customer.*payment)' ORDER BY name LIMIT 100`,
 report_field_ownership:`SELECT model.model,metadata.module,metadata.name FROM ir_model model JOIN ir_model_data metadata ON metadata.model='ir.model' AND metadata.res_id=model.id WHERE model.model LIKE 'account.aged.%' ORDER BY model.model,metadata.module LIMIT 100`,
 accounting_evidence:`SELECT count(*)::text components,count(DISTINCT line.journal_id)::text journals,count(*) FILTER(WHERE line.full_reconcile_id IS NOT NULL)::text full_reconciled_components,count(*) FILTER(WHERE move.reversed_entry_id IS NOT NULL)::text reversal_components FROM account_move_line line JOIN account_move move ON move.id=line.move_id JOIN account_account account ON account.id=line.account_id JOIN account_journal journal ON journal.id=line.journal_id LEFT JOIN account_full_reconcile full_reconcile ON full_reconcile.id=line.full_reconcile_id WHERE line.company_id=1 AND move.company_id=1 AND journal.company_id=1 AND move.state='posted' AND account.account_type='asset_receivable' AND line.date<='2026-09-30'::date`
};
let client;
try{
 client=await pool.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','30000',true),set_config('TimeZone','UTC',true)");
 const snapshot=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,transaction_timestamp() source_as_of,pg_current_snapshot()::text descriptor")).rows[0];
 if(snapshot.database!=='accounting' || snapshot.read_only!=='on')throw new Error('Read-only source required');
 const parameters=[1,reference.reportDate];const metadata={};const metadataFailures=[];
 for(const[name,sql]of Object.entries(metadataQueries)){
  await client.query('SAVEPOINT metadata_probe');
  try{metadata[name]=(await client.query(sql)).rows;if(metadata[name].length>=100)throw new Error('Metadata bound');await client.query('RELEASE SAVEPOINT metadata_probe');}
  catch(error){await client.query('ROLLBACK TO SAVEPOINT metadata_probe');await client.query('RELEASE SAVEPOINT metadata_probe');metadataFailures.push({name,code:error.code??'metadata_bound'});}
 }
 const company=metadata.company?.[0];
 if(!company || company.currency!=='IQD' || Number(company.rounding)!==0.001 || company.company_name.trim()!==reference.companyLabel.trim())throw new Error('Observed company identity and IQD precision must agree with the workbook reference');
 const plans={};for(const[name,sql,args]of [['customers',odooAgedCustomerSql,[...parameters,5001]],['bridge',odooAgedBridgeSql,parameters],['population',odooAgedPopulationSql,parameters],['quality',controlQualitySql,parameters]])plans[name]=(await client.query('EXPLAIN (FORMAT JSON) '+sql,args)).rows[0]['QUERY PLAN'][0].Plan;
 const customers=(await client.query(odooAgedCustomerSql,[...parameters,5001])).rows;
 const bridge=(await client.query(odooAgedBridgeSql,parameters)).rows;
 const population=(await client.query(odooAgedPopulationSql,parameters)).rows[0];
 const quality=(await client.query(controlQualitySql,parameters)).rows[0];
 if(customers.length>5000 || customers.length!==Number(population.customers) || population.missing_partners!=='0' || ['current_residual_mismatches','ambiguous_components','missing_transaction_currency','invalid_company_currency'].some(field=>quality[field]!=='0'))throw new Error('Incomplete or ambiguous source population');
 const comparison=compareAgedCustomers(reference,customers);
 const evidence={controlVersion:'odoo-aged-report-reconstruction-v1',status:comparison.passed ? 'EXACT_EXCEL_REPRODUCTION_DEFINITIONS_PENDING_FINANCE_APPROVAL' : 'RECONCILIATION_FAILED_DO_NOT_CERTIFY',workbookSha256:workbookHash,reportDate:reference.reportDate,companyId:1,companyLabel:reference.companyLabel,reportingCurrency:'IQD',snapshot,excel:{totals:reference.totals,integrity:reference.integrity,characteristics:reference.characteristics},metadata,metadataFailures,quality,population,bridge,comparison,customers,plans,
  algorithm:{grain:'posted receivable journal item',effectiveDate:'line.date <= cutoff',agingDate:'coalesce(line.date_maturity,line.date)',atDate:'agingDate >= cutoff; due today included',historicalResidual:'original company balance minus debit partial amounts plus credit partial amounts with max_date <= cutoff',credits:'negative residuals stay signed in their own aging-date buckets; no discretionary allocation',partner:'line.partner_id; exact whitespace-normalized label mapping must be unique',precision:'component residual rounded at observed company-currency rounding, Decimal workbook normalization, integer six-decimal reconciliation; no nonzero tolerance'},
  implementationLimit:'Installed report Python/custom module source is not locally available. The recorded metadata requires review; every customer/bucket comparison is specific to this supplied export; no equivalence for untested reports/options or immutable ERP event history is claimed.',financeApproval:{owner:null,date:null,canonicalDefinition:null},certified:false,published:false};
 await client.query('ROLLBACK');
 const finalHash=createHash('sha256').update(await readFile(workbookPath)).digest('hex');if(finalHash!==workbookHash)throw new Error('Workbook changed during investigation');
 await mkdir(outputDirectory,{mode:0o700});await writeFile(`${outputDirectory}/reconciliation.json`,JSON.stringify(evidence,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({outputDirectory,status:evidence.status,totals:comparison.totals,deltas:comparison.deltas,customerRows:customers.length,exactCases:comparison.exactCases,mismatchedCases:comparison.mismatchedCases,missingCases:comparison.missingCases,unexpectedCases:comparison.unexpectedCases,metadataFailures}));
}catch(error){await client?.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({failed:true,code:error.code??'aged_reconciliation',position:error.position??null}));process.exitCode=1;}
finally{client?.release();await pool.end();}
