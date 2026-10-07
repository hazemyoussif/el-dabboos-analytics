# Odoo Aged Receivable export investigation

**Current status, October 7:** [Finance standing approval and exact signed-aging publication](finance-metric-definitions-delivery.md) supersede this document’s historical Finance-pending status for the eleven published metrics only. Receivables & Aging is a normal certified report at the fixed September 30 cutoff; final checks for all five reports have zero failed series (including quiet retries after concurrent-build timeouts), with substantial latency documented in delivery; nine Customer pairs are admitted, while Gross/Credits are summary-only. Alternative gross-positive buckets and unresolved accounting policies remain unpublished. The separate Customer Performance candidate remains pending; its certification was not restarted. Earlier evidence and publication history below are retained. Visual/browser QA remains Deferred in the [combined Luna handoff](../qa/local-management-pack-luna-handoff.md).

**Numeric reproduction complete; customer identity reconciliation and live report metadata blocked by source availability. No business certification or publication.** This investigation takes priority over publishing the earlier Wave 1 receivable proposals. The original [gross-component candidate](receivables-aging-v1.md) remains a separate, unchanged concept.

## External Finance reference

Actual supplied file: `aged_receivable.xlsx`, sheet `Aged Receivable`, cutoff **2026-09-30**, Company **1**, IQD. The attachment instructions refer to a differently suffixed filename; the actual supplied workbook was used without modification. Company label is recorded privately and matches the user-specified company label in the Filters sheet. Workbook SHA-256: `223c4325b81d49d4b013e28ea855e656b73744799c5c2ac948f518c9be895716`. Source range: `Aged Receivable!C2222:I2222`; customer rows `A5:I2221`; header control `C4:I4`; cutoff `B1`; company `Filters!B1`.

| Bucket | Excel IQD | Preserved PostgreSQL reconstruction IQD | Delta IQD |
| --- | ---: | ---: | ---: |
| At Date | 759,020,481.15 | 759,020,481.15 | 0.00 |
| 1–30 | 218,464,001.82 | 218,464,001.82 | 0.00 |
| 31–60 | 69,135,500.55 | 69,135,500.55 | 0.00 |
| 61–90 | 25,871,000.18 | 25,871,000.18 | 0.00 |
| 91–120 | 33,782,500.14 | 33,782,500.14 | 0.00 |
| Older (>120) | 253,187,608.77 | 253,187,608.77 | 0.00 |
| **Total** | **1,359,461,092.61** | **1,359,461,092.61** | **0.00** |

All seven customer column sums equal both heading and terminal controls; all customer rows sum correctly. There are **2,217** customer rows: **1,596** positive totals, **203** negative totals and **418** zero totals. **156** zero-total customers have offsetting nonzero buckets; **460** bucket cells are negative. No duplicate whitespace-normalized Excel labels were found. Raw labels are preserved privately; they are never canonical identities.

The complete multiset of seven-value customer vectors reconstructed by stable partner ID from the earlier source extract matches the workbook exactly, including multiplicities: **zero differing vectors**. This is stronger supporting numeric evidence than grand totals, but **does not prove label-to-partner matching**. Amount matching is never used to assign identities.

Required identity cases: **13,302 customer × bucket** plus **2,217 customer totals** = **15,519**. Identity cases checked: **0**. Exact identity cases: **0**. Mismatch/missing/unexpected identity cases: **not evaluated**, not zero. The source tunnel was unavailable (`ECONNREFUSED`, no local listener), so no fresh extraction or partner-label/report-metadata probe completed. The user was asked to restore the existing externally managed tunnel; connection/authentication settings were not changed.

## Independently reconstructed behavior

Control version: `odoo-aged-report-reconstruction-v1`. This is an Odoo source/control proposal, separate from runtime semantic metrics, production mart mapping, ingestion and serving. The source CTE reuses only the earlier **independent** control extraction, never a production receivable implementation. The following rules reproduce every numeric customer vector of this export; full report acceptance remains pending identity and metadata checks.

- Grain: individual posted receivable journal items/maturity components, including invoice, credit-note and journal/payment balances. `account_move_line` joined to `account_move`/`account_account`; both line and move company 1; move posted; account type `asset_receivable`; line accounting date at or before cutoff. No invoice-header-only filter.
- Historical balance: original `line.balance` minus debit-side/add credit-side `account_partial_reconcile.amount` for links with `max_date <= cutoff`. Validate link company, posted sides, positive amount and `max_date = greatest(debit.date, credit.date)`. Current `amount_residual` is validation evidence only. Later payments do not erase historical residuals. This reconstructs the available source snapshot, not an immutable history of deleted/edited reconciliation records.
- Aging date: `coalesce(line.date_maturity, line.date)`; missing maturity falls back to the **journal-item accounting date**. Invoice date/header due date and cutoff-date substitutions are not used.
- At Date: aging date **on or after** the cutoff, including due today. Overdue boundaries: 1–30, 31–60, 61–90, 91–120 and >120 days.
- Credits: preserve every negative open residual in its own date bucket. Applied payments/credit notes reduce the reconciled component; remaining credit/advance balances contribute signed negatives. No allocation to arbitrary invoices or buckets.
- Customer grouping: `line.partner_id` is the stable identity. Preserve customer rows whose net total or all bucket sums are zero when they have nonzero open components. Do not filter on positive customer totals. Live reconciliation requires unique whitespace-normalized `res_partner.name` → Excel label matching; duplicate, missing and unexpected labels fail explicitly. Commercial-partner lineage is exposed for investigation, not substituted automatically.
- Currency: company-currency recognized balances, observed IQD rounding **0.001**. Round each reconstructed component to currency precision, then sum exact six-decimal integers. Decimal parsing removes Excel binary serialization noise (observed maximum 10⁻⁹); meaningful extra precision is rejected. No nonzero financial acceptance tolerance and no whole-IQD internal rounding.

## Quantified gross-to-net bridge

**1,532,751,636.39 gross positive components − 173,290,543.78 signed credit balances = 1,359,461,092.61 net aged-report balance.** The full grand-total difference is explained by 1,378 negative components. There is no unexplained adjustment. Prior source classification: journal/payment/advance entries −172,487,293.81; credit notes −803,249.97. A more specific advance or write-off reason is not inferred from journal type.

Missing maturity reclassifies **1,319 positive components / 210,912,546.21 IQD** without changing the grand total. The following accounting-date allocation explains exactly where that amount goes:

| Report bucket | Explicit-maturity positive IQD | Missing-maturity positive IQD | All signed negatives IQD | Report net IQD |
| --- | ---: | ---: | ---: | ---: |
| At Date | 760,615,731.13 | 52,000.00 | −1,647,249.98 | 759,020,481.15 |
| 1–30 | 239,405,751.70 | 7,736,000.00 | −28,677,749.88 | 218,464,001.82 |
| 31–60 | 68,235,750.50 | 14,319,500.00 | −13,419,749.95 | 69,135,500.55 |
| 61–90 | 26,079,250.16 | 6,153,250.00 | −6,361,499.98 | 25,871,000.18 |
| 91–120 | 37,701,500.07 | 1,343,500.00 | −5,262,499.93 | 33,782,500.14 |
| Older | 189,801,106.62 | 181,308,296.21 | −117,921,794.06 | 253,187,608.77 |
| **Total** | **1,321,839,090.18** | **210,912,546.21** | **−173,290,543.78** | **1,359,461,092.61** |

Source replay covers all **5,242** nonzero signed components. SourceAsOf: **2026-10-06T12:53:16.128Z**. Original source-control SHA-256: `a8f6a00eab4fef2b1b9ff8924ba1a4dd89847c3c86ed83a57aa651d799751848`; the replay requires that fingerprint and leaves it unchanged. Original zero-current-residual-mismatch/zero-ambiguous-component evidence and later settlement links are preserved. It is not a new source snapshot.

## Definitions prepared for Finance review

These are proposals, not registered runtime metric IDs. All are company/currency/as-of-date/definition-version **snapshots**, never additive across dates. Organizational filters require independently certified attribution.

| Proposed business output | Definition | September reference |
| --- | --- | ---: |
| Aged Receivable Total | Signed net balance of eligible open receivable components at the covered cutoff | 1,359,461,092.61 IQD |
| At-Date Receivable | Signed components due on/after cutoff under accepted missing-maturity policy | 759,020,481.15 IQD |
| Five overdue buckets | Signed residuals with 1–30 / 31–60 / 61–90 / 91–120 / >120 overdue days | Table above |
| Total Overdue Receivable | Sum of the five signed overdue buckets at the same snapshot | 600,440,611.46 IQD |
| Overdue Receivable % | Signed overdue / signed total ×100; null for zero denominator; ratio of aggregates, never average of customer ratios | Approximately 44.17% |
| Customers with Positive Receivable Balance | Distinct stable partners with net customer balance >0 at cutoff | 1,596 |
| Customers with Credit Balance | Distinct stable partners with net customer balance <0 at cutoff | 203 |
| Receivable by Customer | Same signed buckets and total grouped by approved stable customer identity | 2,217 reference rows |

Retain the earlier gross-positive/missing-date concept separately until Finance decides its purpose. Do not silently rename or rewrite `outstanding_amount`/`overdue_amount` or previous certifications. After full reconciliation, Finance must record owner, approval date, accepted definition/version, confirmed totals, exceptions and historical correction policy. No Finance approval is implied merely by receiving the workbook.

## Repeatable control preparation and remaining work

Run the parser on the unchanged supplied workbook into a **new private** reference file. The scripts use exclusive creation, preserving original evidence:

```bash
python3 scripts/integration/parse-odoo-aged-excel.py /absolute/path/aged_receivable.xlsx /tmp/new-reference.json
node --experimental-transform-types --disable-warning=ExperimentalWarning scripts/integration/odoo-aged-report-reconcile.mjs /approved/operator.env /tmp/new-reference.json /absolute/path/aged_receivable.xlsx /tmp/new-live-review
node scripts/integration/render-odoo-aged-review.mjs /tmp/new-live-review/reconciliation.json /tmp/new-live-review/finance-review.html
```

The live runner is fixed to approved localhost `accounting`/company 1, repeatable-read **READ ONLY**, 15s statements, 1s locks, bounded 5,000 customer groups, independent population counts, EXPLAIN without ANALYZE and rollback. It records transaction sourceAsOf/snapshot descriptor, all expected/actual/delta cases, unresolved labels, unexpected partners, quality controls and full bridge. Metadata probes use savepoints and report unavailable tables explicitly. No source DDL or Odoo write-capable methods exist.

Models/fields used: original source control fields in [mapping](receivables-aging-v1.md); plus `res_partner.id/name/commercial_partner_id`. Prepared metadata probes cover `res_company.id/name/currency_id`, `res_currency.name/rounding/decimal_places`, `account_journal.id/company_id`, `account_move_line.journal_id/full_reconcile_id`, `account_move.reversed_entry_id`, `account_full_reconcile.id`, `ir_model.model/state/modules`, `ir_model_data.module/name`, installed `ir_module_module` names/versions, and `account_report`/`account_report_line`/`account_report_expression` handler/groupby/engine/formula evidence.

The earlier discovery observed `account.aged.receivable.report.handler`; executable installed/custom report source is not locally accessible. Do not claim this installation is unmodified or equivalence for untested options. Restore the existing source tunnel, run the prepared live reconciliation and inspect metadata/custom module ownership. Any unresolved identity, material delta, history or customization ambiguity remains a stop condition for certification.

Private review artifacts are stored outside Git with directory mode 0700/files 0600. The JSON includes technical-ID customer matrices; the HTML deliberately omits names/phone/address PII. Raw Excel labels remain in the private parsed reference. Original gross control retains every missing-due-date exception; no extract or workbook is committed.

## Preservation and verification

Odoo mutated: **no**. Excel modified: **no**. Gross control overwritten: **no**. Unexplained difference hidden: **no**. Receivable metrics prematurely certified: **no**. Old certification rewritten: **no**. Authentication changed: **no**. Sync implemented: **no**. External deployment: **no**. Push: **no**. Merge: **no**.

Only independent control scripts, synthetic tests and safe documentation change. Unrelated Odoo edits and `.archify/` remain intact. Live database state fingerprint comparison is unavailable while its external source/mart endpoints are down; this task contains no publication or database writes. Only the existing disposable synthetic PostgreSQL container was restarted for tests.

Verification results and exact final commit are recorded in the delivery response; no CI run or browser rendering pass is implied.

Local gates: frozen offline install, lint, architecture (zero diagnostics), baseline-aware quality (zero diagnostics), full monorepo typecheck, API/web build and diff gate passed. Unit/API suite: **621 passed, 0 failed, 0 skipped**. Disposable PostgreSQL 18.6 suite: **113 passed, 0 failed, 0 skipped**. Standalone synthetic Excel-parser suite: **4 passed**. Final focused decimal/identity suite after the type-safety correction: **4 passed**. Standalone runner/replay/renderer syntax checks passed; live SQL execution remains blocked as stated above. Existing nonblocking Vite chunk-size warning remains. No customer source or developer environment is loaded by automated tests.
