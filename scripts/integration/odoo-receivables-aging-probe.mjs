import { readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const { Pool }=createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [environmentFile,outputFile]=process.argv.slice(2);
if (!environmentFile || !outputFile) throw new Error('Usage: odoo-receivables-aging-probe.mjs operator-env private-output-json');
const environment=parseEnv(await readFile(environmentFile,'utf8'));
if (environment.ODOO_SOURCE_DATABASE!=='accounting' || environment.ODOO_SOURCE_COMPANY_IDS!=='1' || !['localhost','127.0.0.1','::1'].includes(environment.ODOO_SOURCE_HOST)) throw new Error('Only authorized tunneled accounting/company-1 scope allowed');
const pool=new Pool({host:environment.ODOO_SOURCE_HOST,port:Number(environment.ODOO_SOURCE_PORT),database:'accounting',user:environment.ODOO_SOURCE_USER,password:environment.ODOO_SOURCE_PASSWORD,max:1,connectionTimeoutMillis:5000});
const cutoff='2026-09-30';
// All receivable opening activity through the cutoff is necessary, including settled
// components. Filtering today's open residual would lose later payments/write-offs.
const eligible=`SELECT line.id,line.move_id,line.partner_id,line.date,line.date_maturity,line.balance,line.amount_residual,line.currency_id,line.amount_currency,move.move_type
 FROM account_move_line line JOIN account_move move ON move.id=line.move_id JOIN account_account account ON account.id=line.account_id
 WHERE line.company_id=1 AND move.company_id=1 AND move.state='posted' AND account.account_type='asset_receivable' AND line.date<=$1::date`;
const reconstructed=`WITH eligible AS (${eligible}), debits AS (
 SELECT partial.debit_move_id,sum(partial.amount) settled,sum(partial.amount) FILTER(WHERE partial.max_date<=$1::date) settled_at_cutoff
 FROM account_partial_reconcile partial JOIN eligible ON eligible.id=partial.debit_move_id WHERE partial.company_id=1 GROUP BY partial.debit_move_id
), credits AS (
 SELECT partial.credit_move_id,sum(partial.amount) settled,sum(partial.amount) FILTER(WHERE partial.max_date<=$1::date) settled_at_cutoff
 FROM account_partial_reconcile partial JOIN eligible ON eligible.id=partial.credit_move_id WHERE partial.company_id=1 GROUP BY partial.credit_move_id
), residuals AS (
 SELECT eligible.*,balance-coalesce(debits.settled,0)+coalesce(credits.settled,0) reconstructed_current,
 balance-coalesce(debits.settled_at_cutoff,0)+coalesce(credits.settled_at_cutoff,0) historical_residual
 FROM eligible LEFT JOIN debits ON debits.debit_move_id=eligible.id LEFT JOIN credits ON credits.credit_move_id=eligible.id
)`;
const queries={
 fields:{parameters:[],sql:`SELECT model,name,ttype,state,store,compute FROM ir_model_fields WHERE
 (model='account.move.line' AND name IN ('id','company_id','move_id','partner_id','account_id','date','date_maturity','balance','amount_residual','currency_id','amount_currency')) OR
 (model='account.partial.reconcile' AND name IN ('id','company_id','debit_move_id','credit_move_id','amount','max_date','debit_amount_currency','credit_amount_currency','create_date')) OR
 (model='account.move' AND name IN ('id','company_id','state','move_type','date','reversed_entry_id')) ORDER BY model,name LIMIT 100`},
 company:{parameters:[],sql:`SELECT company.id::text company_id,currency.name reporting_currency,currency.rounding::text rounding FROM res_company company JOIN res_currency currency ON currency.id=company.currency_id WHERE company.id=1`},
 report_metadata:{parameters:[],sql:`SELECT model FROM ir_model WHERE model LIKE '%aged%receivable%' OR model LIKE '%fifo%reconcile%' ORDER BY model LIMIT 100`},
 partial_effective_dates:{parameters:[cutoff],sql:`WITH eligible AS (${eligible}), scoped AS (
 SELECT DISTINCT partial.id,partial.company_id,partial.amount,partial.max_date,debit.date debit_date,credit.date credit_date,debit.company_id debit_company,credit.company_id credit_company,debit_move.state debit_state,credit_move.state credit_state
 FROM account_partial_reconcile partial JOIN account_move_line debit ON debit.id=partial.debit_move_id JOIN account_move_line credit ON credit.id=partial.credit_move_id
 JOIN account_move debit_move ON debit_move.id=debit.move_id JOIN account_move credit_move ON credit_move.id=credit.move_id
 WHERE partial.debit_move_id IN (SELECT id FROM eligible) OR partial.credit_move_id IN (SELECT id FROM eligible))
 SELECT count(*)::text partials,count(*) FILTER(WHERE max_date IS DISTINCT FROM greatest(debit_date,credit_date))::text effective_date_mismatches,
 count(*) FILTER(WHERE company_id<>1 OR debit_company<>1 OR credit_company<>1)::text company_mismatches,
 count(*) FILTER(WHERE debit_state<>'posted' OR credit_state<>'posted')::text unposted_sides,
 count(*) FILTER(WHERE amount<=0 OR max_date IS NULL)::text invalid_partials,
 count(*) FILTER(WHERE max_date>$1::date)::text after_cutoff FROM scoped`},
 residual_quality:{parameters:[cutoff],sql:reconstructed+` SELECT count(*)::text components,count(DISTINCT move_id)::text moves,
 count(*) FILTER(WHERE reconstructed_current IS DISTINCT FROM amount_residual)::text raw_current_residual_mismatches,
 count(*) FILTER(WHERE round(reconstructed_current,3) IS DISTINCT FROM round(amount_residual,3))::text company_precision_current_residual_mismatches,
 max(abs(reconstructed_current-amount_residual))::text largest_current_residual_difference,
 count(*) FILTER(WHERE historical_residual IS DISTINCT FROM amount_residual)::text historical_differs_from_today,
 count(*) FILTER(WHERE partner_id IS NULL)::text missing_customer,
 count(*) FILTER(WHERE balance>0 AND round(historical_residual,3)<0)::text negative_debit_residuals,
 count(*) FILTER(WHERE round(historical_residual,3)>0 AND balance<=0)::text positive_credit_residuals FROM residuals`},
 installments:{parameters:[cutoff],sql:`WITH eligible AS (${eligible}), invoices AS (SELECT move_id,count(*) components,count(DISTINCT date_maturity) maturities FROM eligible WHERE move_type='out_invoice' GROUP BY move_id) SELECT count(*) FILTER(WHERE components>1)::text multiple_components,count(*) FILTER(WHERE maturities>1)::text multiple_maturities FROM invoices`},
 candidate_buckets:{parameters:[cutoff],sql:reconstructed+` SELECT CASE WHEN date_maturity IS NULL THEN 'missing_due_date' WHEN date_maturity>=$1::date THEN 'current' WHEN $1::date-date_maturity<=30 THEN '1_30' WHEN $1::date-date_maturity<=90 THEN '31_90' ELSE 'over_90' END bucket,
 count(*)::text components,count(DISTINCT move_id)::text moves,sum(round(historical_residual,3))::numeric(30,6)::text amount FROM residuals WHERE round(historical_residual,3)>0 GROUP BY 1 ORDER BY 1`},
 separate_credits:{parameters:[cutoff],sql:reconstructed+` SELECT move_type,count(*)::text components,sum(round(historical_residual,3))::numeric(30,6)::text amount FROM residuals WHERE round(historical_residual,3)<0 GROUP BY move_type ORDER BY move_type`},
 currency:{parameters:[cutoff],sql:reconstructed+` SELECT currency.name transaction_currency,count(*)::text components,count(*) FILTER(WHERE round(historical_residual,3)>0)::text positive_open_components FROM residuals JOIN res_currency currency ON currency.id=residuals.currency_id GROUP BY currency.name ORDER BY currency.name`}
};
let client;
try {
 client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','30000',true),set_config('TimeZone','UTC',true)");
 const snapshot=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,transaction_timestamp() source_as_of,pg_current_snapshot()::text descriptor")).rows[0];
 if (snapshot.database!=='accounting' || snapshot.read_only!=='on') throw new Error('Read-only source required');
 const result={definitionVersion:'receivables-aging-v1',reportingCutoff:cutoff,companyId:1,snapshot,queries:{},plans:{},status:'SOURCE_PROBE_ONLY_NOT_AUTHORITATIVE_REPORT_OR_CERTIFICATION'};
 for (const [name,query] of Object.entries(queries)) {
  result.plans[name]=(await client.query('EXPLAIN (FORMAT JSON) '+query.sql,query.parameters)).rows[0]['QUERY PLAN'][0].Plan;
  result.queries[name]=(await client.query(query.sql,query.parameters)).rows;
  if (result.queries[name].length>=100) throw new Error('Probe output bound reached');
  if (name==='company' && (result.queries[name].length!==1 || result.queries[name][0].reporting_currency!=='IQD' || Number(result.queries[name][0].rounding)!==0.001)) throw new Error('Observed company precision required for this scoped diagnostic');
 }
 await client.query('ROLLBACK');
 await writeFile(outputFile,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({completed:Object.keys(result.queries),readOnly:true,output:outputFile}));
} catch(error) {
 await client?.query('ROLLBACK').catch(()=>{});
 console.error(JSON.stringify({failed:true,code:error.code??'receivables_probe'}));process.exitCode=1;
} finally {client?.release();await pool.end();}
