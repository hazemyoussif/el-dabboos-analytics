/** Finance summary deliberately omits display labels and unnecessary customer PII. */
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [evidencePath,outputPath]=process.argv.slice(2);
if(!evidencePath || !outputPath || !resolve(outputPath).startsWith('/tmp/'))throw new Error('Private evidence input and new temporary HTML output required');
const evidence=JSON.parse(await readFile(evidencePath,'utf8'));
const labels={current:'At Date','1_30':'1–30','31_60':'31–60','61_90':'61–90','91_120':'91–120',older:'Older (>120)',total:'Total'};
const escape=value=>String(value).replace(/[&<>"']/gu,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const amounts=evidence.sourceTotals??evidence.comparison.totals;
const deltas=evidence.deltas??evidence.comparison.deltas;
const expected=evidence.excelTotals??evidence.excel.totals;
const rows=Object.entries(labels).map(([bucket,label])=>`<tr><th>${label}</th><td>${escape(expected[bucket])}</td><td>${escape(amounts[bucket])}</td><td>${escape(deltas[bucket])}</td></tr>`).join('');
const bridge=evidence.bridge.map(entry=>`<tr><td>${escape(labels[entry.bucket])}</td><td>${escape(entry.maturityPolicy??entry.maturity_policy)}</td><td>${escape(entry.sign)}</td><td>${escape(entry.components)}</td><td>${escape(entry.amount)}</td></tr>`).join('');
const exact=evidence.comparison?.passed===true;
const review=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Odoo Aged Receivable — Finance review</title>
<style>body{font:16px/1.5 system-ui,sans-serif;color:#172033;background:#f3f5f8;margin:0;padding:32px}main{max-width:1150px;margin:auto;background:white;padding:32px;border-radius:12px}h1{font-size:28px;margin-top:0}h2{font-size:20px;margin-top:32px}.status{padding:16px;background:#fff4d8;border-left:4px solid #956617}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:14px}th,td{text-align:left;padding:9px;border-bottom:1px solid #dce1e8}td:last-child{text-align:right}code{overflow-wrap:anywhere}details{margin:24px 0}@media(max-width:700px){body,main{padding:16px}.scroll{overflow:auto}table{min-width:650px}}</style><main>
<h1>Odoo Aged Receivable — September 30, 2026</h1><p>Company 1 · IQD · Independent source control · Definition candidate <code>odoo-aged-report-reconstruction-v1</code></p>
<p class="status"><strong>CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION</strong><br>${exact ? 'All customer identity/bucket cases passed for this export. Definitions still require Finance approval.' : 'Numeric replay matches the export. Customer identities and live/custom report metadata remain unverified; full report acceptance is pending.'}</p>
<p>Source as of: ${escape(evidence.sourceAsOf??evidence.snapshot.source_as_of)}<br>Workbook SHA-256: <code>${escape(evidence.workbookSha256)}</code></p>
<h2>Excel and independent source comparison</h2><div class="scroll"><table><thead><tr><th>Bucket</th><th>Excel IQD</th><th>Source IQD</th><th>Delta IQD</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>${exact ? `${evidence.comparison.exactCases} exact cases; ${evidence.comparison.mismatchedCases} mismatches; ${evidence.comparison.missingCases} missing; ${evidence.comparison.unexpectedCases} unexpected.` : '2,217 Excel customer rows; 15,519 identity/bucket/total cases required. Identity cases checked: 0. The complete numeric vector multiset matches, but amount matching cannot establish partner identity.'}</p>
<h2>Gross-to-net bridge</h2><p>Gross positive open components <strong>1,532,751,636.39</strong> − signed negative components <strong>173,290,543.78</strong> = Odoo export total <strong>1,359,461,092.61 IQD</strong>. Missing maturity does not change the total; its positive <strong>210,912,546.21 IQD</strong> is classified using each journal item’s accounting date.</p>
<div class="scroll"><table><thead><tr><th>Bucket</th><th>Maturity treatment</th><th>Sign</th><th>Components</th><th>IQD</th></tr></thead><tbody>${bridge}</tbody></table></div>
<h2>Observed reconstruction</h2><p>Posted receivable journal items with company-1 accounting dates through September 30. Original company-currency balance less debit-side/add credit-side partial reconciliation amounts whose max_date is on or before the cutoff. Aging date: maturity date, otherwise accounting date. Due today and future dates enter At Date. Negative residuals retain their own dates and signs. Group by stable partner ID; preserve zero customer totals and offsetting buckets. No arbitrary credit allocation.</p>
<p>Exact currency precision: 0.001 IQD. Workbook serialized noise up to 10⁻⁹ is removed with decimal arithmetic; meaningful additional precision is rejected. Source sums use exact six-decimal integers. No nonzero financial acceptance tolerance.</p>
<h2>Finance decisions and definition proposals</h2><p>Review separate gross-component and signed aged-report meanings. Candidate snapshot outputs: Aged Receivable Total, At Date, each of five overdue buckets, Total Overdue (600,440,611.46 IQD), Overdue % (signed overdue / signed total), positive-net customers (1,596), credit-net customers (203), and customer aging. Retain 418 zero-net customers, including 156 with offsetting nonzero buckets. Definitions are proposals; snapshot values must never sum across dates.</p>
<p>Approval record pending: Finance owner, approval date, accepted definition version, confirmed totals, exceptions and history/reconciliation rules. No metric is certified or published.</p>
<h2>Limitations and traceability</h2><p>${exact ? escape(evidence.implementationLimit) : escape(evidence.blockers.join(' · '))}</p><p>Raw Excel labels are retained only in the private parsed reference; no names, phone numbers or addresses appear in this summary. Technical partner matrices and full bridge are available in the adjacent private JSON. The original gross control and all missing-due-date exceptions remain unchanged.</p>
</main></html>`;
await writeFile(outputPath,review,{mode:0o600,flag:'wx'});
console.log(JSON.stringify({outputPath,identityReconciled:exact,certified:false}));
