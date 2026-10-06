import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { controlComponentSql,controlQualitySql } from './receivables-control-query.ts';
const { Pool }=createRequire(new URL('../../packages/data/package.json',import.meta.url))('pg');
const [environmentFile,requestedDirectory]=process.argv.slice(2);
if (!environmentFile || !requestedDirectory) throw new Error('Usage: node --experimental-transform-types odoo-receivables-control.mjs operator-env private-output-directory');
const outputDirectory=resolve(requestedDirectory);
if (!outputDirectory.startsWith('/tmp/')) throw new Error('Private control artifacts must be outside Git under /tmp');
const environment=parseEnv(await readFile(environmentFile,'utf8'));
if (environment.ODOO_SOURCE_DATABASE!=='accounting' || environment.ODOO_SOURCE_COMPANY_IDS!=='1' || !['localhost','127.0.0.1','::1'].includes(environment.ODOO_SOURCE_HOST)) throw new Error('Only authorized tunneled accounting/company-1 scope allowed');
const pool=new Pool({host:environment.ODOO_SOURCE_HOST,port:Number(environment.ODOO_SOURCE_PORT),database:'accounting',user:environment.ODOO_SOURCE_USER,password:environment.ODOO_SOURCE_PASSWORD,max:1,connectionTimeoutMillis:5000});
const cutoff='2026-09-30';
const bound=10000;
const decimalUnits=value=>BigInt(value.replace('.',''));
function decimalText(units) {
 const magnitude=units<0n ? -units : units;
 return `${units<0n ? '-' : ''}${magnitude/1000000n}.${String(magnitude%1000000n).padStart(6,'0')}`;
}
function total(rows,field='residual') { return decimalText(rows.reduce((sum,row)=>sum+decimalUnits(row[field]),0n)); }
function summarize(rows) {
 const positive=rows.filter(row=>decimalUnits(row.residual)>0n);
 const credits=rows.filter(row=>decimalUnits(row.residual)<0n);
 const buckets=['current','1_30','31_90','over_90','missing_due_date'].map(bucket=>{
  const population=positive.filter(row=>row.bucket===bucket);
  return {bucket,amount:total(population),components:population.length};
 });
 const customerIds=[...new Set(positive.map(row=>row.customer_id))].sort();
 const customers=customerIds.map(customer_id=>{
  const population=positive.filter(row=>row.customer_id===customer_id);
  return {customerReference:customer_id===null ? 'Unassigned' : `odoo:1:partner:${customer_id}`,gross:total(population),components:population.length,
   buckets:Object.fromEntries(buckets.map(({bucket})=>[bucket,total(population.filter(row=>row.bucket===bucket))]))};
 });
 const partial=positive.filter(row=>decimalUnits(row.reconciled_at_cutoff)>0n);
 const paymentLinkedPartial=partial.filter(row=>decimalUnits(row.payment_applied)>0n);
 const appliedCredit=positive.filter(row=>decimalUnits(row.credit_note_applied)>0n);
 const gross=total(positive);
 if (decimalUnits(gross)!==buckets.reduce((sum,bucket)=>sum+decimalUnits(bucket.amount),0n) || decimalUnits(gross)!==customers.reduce((sum,customer)=>sum+decimalUnits(customer.gross),0n)) throw new Error('Independent control completeness failed');
 return {gross,buckets,customers,positiveComponents:positive.length,knownCustomers:customerIds.filter(identity=>identity!==null).length,
  unassignedCustomerComponents:positive.filter(row=>row.customer_id===null).length,
  partiallySettledComponents:partial.length,partiallySettledOriginal:decimalText(partial.reduce((sum,row)=>sum+decimalUnits(row.residual)+decimalUnits(row.reconciled_at_cutoff),0n)),
  partiallySettledResidual:total(partial),reconciledValueOnPartiallySettledComponents:total(partial,'reconciled_at_cutoff'),
  paymentLinkedPartiallySettledComponents:paymentLinkedPartial.length,paymentAppliedOnPartiallySettledComponents:total(paymentLinkedPartial,'payment_applied'),paymentLinkedPartialResidual:total(paymentLinkedPartial),
  positiveComponentsWithAppliedCreditNotes:appliedCredit.length,creditNoteAppliedOnPositiveOpenComponents:total(appliedCredit,'credit_note_applied'),
  unappliedCreditOrAdvanceComponents:credits.length,unappliedCreditOrAdvanceSignedValue:total(credits)};
}
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
function table(rows,columns) {
 return `<table><thead><tr>${columns.map(column=>`<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(column=>`<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function htmlReview(control) {
 const {summary}=control;
 const customerRows=summary.customers.map(customer=>({...customer,...customer.buckets}));
 const labels={gross:'Gross Open Receivables (IQD)',positiveComponents:'Open receivable components',knownCustomers:'Customers represented',unassignedCustomerComponents:'Open components without customer identity',partiallySettledComponents:'Partially reconciled open components',partiallySettledOriginal:'Original balance of partially reconciled components (IQD)',partiallySettledResidual:'Remaining balance of partially reconciled components (IQD)',reconciledValueOnPartiallySettledComponents:'Reconciled value on partially settled components (IQD)',paymentLinkedPartiallySettledComponents:'Payment-linked partially settled components',paymentAppliedOnPartiallySettledComponents:'Applied payments on partially settled components (IQD)',paymentLinkedPartialResidual:'Remaining balance of payment-linked partials (IQD)',positiveComponentsWithAppliedCreditNotes:'Open components with applied credit notes',creditNoteAppliedOnPositiveOpenComponents:'Applied credit notes on positive open components (IQD)',unappliedCreditOrAdvanceComponents:'Separate open credit / advance components',unappliedCreditOrAdvanceSignedValue:'Separate open credit / advance signed balance (IQD)'};
 const metricRows=Object.entries(summary).filter(([,value])=>!Array.isArray(value)).map(([measure,value])=>({measure:labels[measure]??measure,value}));
 return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Receivables Aging v1 — candidate control</title>
 <style>body{font:15px system-ui;color:#172033;background:#f6f8fb;margin:40px auto;max-width:1200px;padding:0 24px}h1{font-size:26px}.status{padding:16px;background:#fff2ca;border:1px solid #d9b74c;font-weight:700}table{border-collapse:collapse;width:100%;background:white;margin:20px 0;font-variant-numeric:tabular-nums}td,th{padding:9px 12px;border:1px solid #d8dee8;text-align:left}th{background:#eaf0f8;position:sticky;top:0}p{line-height:1.6}.scroll{overflow:auto}code{overflow-wrap:anywhere}@media print{body{margin:0;padding:0}th{position:static}tr{break-inside:avoid}}</style>
 <h1>Company 1 · Receivables Aging v1</h1><p class="status">CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION</p>
 <p>Accounting position at end of ${cutoff} (Asia/Baghdad). Reporting currency IQD. Extraction: ${escapeHtml(control.sourceAsOf)}.
 Independent read-only SQL control; no mart, runtime metric, dashboard or planner calculation is used.</p>
 <h2>Summary</h2>${table(metricRows,['measure','value'])}<h2>Exclusive aging buckets</h2>${table(summary.buckets,['bucket','amount','components'])}
 <h2>Review decisions</h2><ul>${control.ambiguities.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>
 <h2>Source and reconstruction</h2><p>${escapeHtml(control.method)}</p><p>${escapeHtml(control.mapping)}</p>
 <details><summary>Customer totals · ${summary.knownCustomers} customers</summary><p>Technical customer references only; no names, addresses, phone numbers or invoice narrative. Unassigned remains a separate group.</p><div class="scroll">${table(customerRows,['customerReference','gross','components','current','1_30','31_90','over_90','missing_due_date'])}</div></details>
 <h2>Representative components</h2>${table(control.samples,['component_id','move_id','customer_id','accounting_date','due_date','bucket','original_balance','residual','reconciled_at_cutoff','later_links'])}
 <details><summary>All missing-due-date exceptions · ${control.missingDueDate.length} components</summary><p>Each row remains in gross receivables. No invoice/accounting-date fallback.</p>${table(control.missingDueDate,['component_id','move_id','customer_id','accounting_date','original_balance','residual'])}</details>
 <h2>Finance confirmation record (unrecorded)</h2><p>Finance owner: pending · Approval date: pending · Definition: receivables-aging-v1 · Confirmed totals: pending · Accepted exceptions: pending.</p>
 </html>`;
}
let client;
try {
 client=await pool.connect();
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SELECT set_config('statement_timeout','15000',true),set_config('lock_timeout','1000',true),set_config('idle_in_transaction_session_timeout','30000',true),set_config('TimeZone','UTC',true)");
 const snapshot=(await client.query("SELECT current_database() database,current_setting('transaction_read_only') read_only,transaction_timestamp() source_as_of,pg_current_snapshot()::text descriptor")).rows[0];
 if (snapshot.database!=='accounting' || snapshot.read_only!=='on') throw new Error('Read-only source required');
 const parameters=[1,cutoff];
 const plans={};
 for (const [name,sql,args] of [['quality',controlQualitySql,parameters],['open',controlComponentSql('open'),[...parameters,bound+1]],['settled',controlComponentSql('settled'),[...parameters,12]]]) {
  plans[name]=(await client.query('EXPLAIN (FORMAT JSON) '+sql,args)).rows[0]['QUERY PLAN'][0].Plan;
 }
 const quality=(await client.query(controlQualitySql,parameters)).rows[0];
 const components=(await client.query(controlComponentSql('open'),[...parameters,bound+1])).rows;
 const settledSamples=(await client.query(controlComponentSql('settled'),[...parameters,12])).rows;
 if (components.length>bound || components.length!==Number(quality.positive_components)+Number(quality.credit_components)) throw new Error('Control extraction completeness/bound failed');
 if (['current_residual_mismatches','ambiguous_components','missing_transaction_currency','invalid_company_currency'].some(field=>quality[field]!=='0')) throw new Error('Control source ambiguity blocks totals');
 const summary=summarize(components);
 const samples=[...summary.buckets.flatMap(({bucket})=>components.filter(row=>row.bucket===bucket).slice(0,2)),
  ...components.filter(row=>decimalUnits(row.residual)>0n && decimalUnits(row.reconciled_at_cutoff)>0n).slice(0,2),
  ...components.filter(row=>Number(row.later_links)>0).slice(0,2),...components.filter(row=>row.bucket==='unapplied_credit_or_advance').slice(0,2),...settledSamples.slice(0,2)];
 const control={status:'CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION',definitionVersion:'receivables-aging-v1',companyId:1,tenantId:'el-dabboos-iq',reportingCutoff:cutoff,reportingCurrency:'IQD',sourceAsOf:snapshot.source_as_of,snapshotDescriptor:snapshot.descriptor,
  method:'Posted asset_receivable ledger lines with accounting date <= cutoff. Historical residual = original company balance − debit-side partial amounts + credit-side partial amounts effective at max_date <= cutoff. max_date equals the later accounting date of the matched lines. Round each component at company currency precision (observed IQD 0.001); aggregate positive components only. Negative residual components remain separate. Due date is line.date_maturity exclusively; due today is current. Current stored residual is a validation control only, never the historical input.',
  mapping:'Standard Odoo account_move_line: id, move_id, partner_id, account_id, company_id, date, date_maturity, balance, amount_residual, amount_currency, currency_id; account_move: id, company_id, state, move_type, date; account_account: id, account_type; account_partial_reconcile: id, company_id, debit_move_id, credit_move_id, amount, max_date; res_company: id, currency_id; res_currency: id, name, rounding. Independent derived values: historical residual, settlement counts, buckets and totals. Standard metadata does not prove absence of custom overrides.',
  quality,summary,samples,missingDueDate:components.filter(row=>row.bucket==='missing_due_date'),components,plans,
  ambiguities:['Finance confirmation and reconciliation tolerance are unrecorded; no business certification or publication.',
   'Partially settled components include payments, applied credits, offsets and write-offs. The narrower payment-linked count uses inbound/customer account_payment records whose posted move is the reconciliation counterpart; this is accounting linkage, not a separate cash-receipt certification.',
   'Negative open components are observable unapplied credits/advances together. Do not infer a separate advance classification or allocate these balances to invoices.',
   'Gross positive posted receivable ledger scope includes opening/journal activity; it differs from Wave 1 invoice-only current observations. Finance must confirm this scope.',
   'Missing customer identities stay in Unassigned; customer-group publication needs separate completeness certification.',
   'No multiple invoice maturity components occur in this bounded sample. Foreign-currency lineage exists in source but no USD positive open component exists at cutoff.',
   'Standard aged-receivable handler metadata exists; its executable report/output is not available through the SQL replica. No standard-report equality is claimed.',
   'Current reconciliation links reproduce stored residuals at source precision. Deleted/revised historic reconciliations and custom FIFO overrides require Finance/source-owner confirmation; technical creation timestamps are not used.'],
  financeConfirmation:{owner:null,approvalDate:null,definitionVersion:'receivables-aging-v1',confirmedTotals:null,acceptedExceptions:null}};
 await client.query('ROLLBACK');
 await mkdir(outputDirectory,{mode:0o700});
 await writeFile(`${outputDirectory}/control.json`,JSON.stringify(control,null,2)+'\n',{mode:0o600,flag:'wx'});
 await writeFile(`${outputDirectory}/finance-review.html`,htmlReview(control),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({status:control.status,outputDirectory,positiveComponents:summary.positiveComponents,creditComponents:summary.unappliedCreditOrAdvanceComponents,readOnly:true}));
} catch(error) {
 await client?.query('ROLLBACK').catch(()=>{});
 console.error(JSON.stringify({failed:true,code:error.code??'receivables_control',position:error.position??null}));process.exitCode=1;
} finally {client?.release();await pool.end();}
