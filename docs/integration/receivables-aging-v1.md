# Receivables Aging v1 — working policy and independent Finance control

**Current status, October 7:** [Finance standing approval and exact signed-aging publication](finance-metric-definitions-delivery.md) supersede this document’s historical Finance-pending status for the eleven published metrics only. Receivables & Aging is a normal certified report at the fixed September 30 cutoff; final checks for all five reports have zero failed series (including quiet retries after concurrent-build timeouts), with substantial latency documented in delivery; nine Customer pairs are admitted, while Gross/Credits are summary-only. Alternative gross-positive buckets and unresolved accounting policies remain unpublished. The separate Customer Performance candidate remains pending; its certification was not restarted. Earlier evidence and publication history below are retained. Visual/browser QA remains Deferred in the [combined Luna handoff](../qa/local-management-pack-luna-handoff.md).

Definition version: **receivables-aging-v1**. Working implementation authority: the user's Receivables Aging handoff and subsequent independent-control workflow correction, 6 October 2026. Status: **IMPLEMENTATION_APPROVED_V1** for this slice only. Formal Finance owner, approval date, confirmed totals, accepted exceptions and reconciliation tolerance are **unrecorded**. Neither source feasibility nor a passing synthetic test is Finance sign-off.

Discovery was preserved separately in commit `0ebbe20`, starting from branch `codex/production-pilot-lifecycle`, HEAD `167e3d9962290c1ff8a07c7f54dae511b58ee2d6`. [Wave 1](odoo-certification-wave-one.md) and its immutable evidence are unchanged. [Wave 2 register](finance-product-wave-two-catalog.json) retains the original broader pending decisions and records this narrow working-policy resolution separately.

## Exact working definition

Gross open receivables are **positive remaining company-currency residuals of posted receivable accounting components**, including accounting-valid opening/journal balances, effective on or before the reporting cutoff. Tax remains included where it forms part of the legal receivable. No draft or cancelled documents contribute. A receivable component, rather than the invoice header, owns its maturity; installments age separately.

| Classification | Exclusive rule |
| --- | --- |
| Current / Not Yet Overdue | `date_maturity >= reportingCutoff` |
| 1–30 Days Overdue | `1 <= reportingCutoff - date_maturity <= 30` days |
| 31–90 Days Overdue | `31 <= reportingCutoff - date_maturity <= 90` days |
| >90 Days Overdue | `reportingCutoff - date_maturity > 90` days |
| Missing Due Date | `date_maturity IS NULL`; no fallback |

Overdue starts on the day after the due date. Due today is current, even if product wording later uses “Not Yet Due.” Missing due dates remain in gross, outside current/overdue, and contribute to a visible amount and **component count**, never an inferred invoice count.

Partial settlement uses the residual, never original invoice value; there is no 70% rule. Unpaid means no qualifying accounting settlement and positive residual; partially paid means some qualifying settlement and remaining residual; paid means zero residual at accounting precision. Payment-linked settlement can be distinguished from broader accounting reconciliation when source linkage supports it; cash collection is a different metric.

Applied credit notes reduce residual through accounting reconciliation. Unapplied credits and customer advances stay separate negative open components; they are never allocated by age, invoice or application code. Net customer position is outside this slice. Dispute does not settle a receivable; no dispute status or exclusion is invented. Posted/reconciled write-offs effective by cutoff remove the written-off portion; later write-offs leave the earlier balance open. No application blacklist is used.

Reporting is the inclusive end-of-day accounting position, `accounting date <= reportingCutoff`, for the selected company (Asia/Baghdad). `reportingCutoff`, `sourceAsOf` and `dataThrough` remain distinct. Company 1 reports IQD recognized in its ledger, with transaction currency/amount lineage retained. The reusable domain must not hard-code IQD or calculate independent FX. Changing any age basis/boundary, missing-date, settlement, credit/advance, history or currency rule requires a new definition and reconciliation version.

For identical tenant/company, authorization, cutoff, currency and mapping release:

```text
Gross Open Receivables
= Current + 1–30 + 31–90 + >90 + Missing Due Date Amount
```

## Existing metric characterization and representation decision

`outstanding_amount` and `overdue_amount` are generic stored snapshot measures. The engine selects the latest entity/measure row at or before cutoff, then applies customer/policy filters and sums entities once; it accepts signed stored values and does not itself establish positive-ledger scope or calculate aging from maturity. Existing PostgreSQL serving additionally requires an approved binding and certified metric/dimension pairing. Focused characterization tests cover inclusive cutoff, zero closure, null before coverage, grouping, moved attribution, unsupported dimensions and second-tenant isolation.

Wave 1's `classifyInvoiceResidual` is a **proposed current invoice-only** helper. It excludes other journal/opening components and uses a supplied current residual, not reconstructed historic balances. Its source total of 1,364,778,432.06 IQD is an October observation, not this September control. Neither that helper nor the generic snapshot recipe proves the exact new gross definition. Preserve them; no aliases or semantic rewrites are made.

The smallest planned production representation is governed bucket-specific snapshot measures at stable company/receivable-line identity, with one exclusive positive bucket per component and an independently governed total. Every component must receive explicit zeros in other buckets at the same cutoff, including settlement to zero; omitted/tombstoned components could otherwise resurrect older balances through carry-forward. Never sum total and bucket measures together. Missing-date counts are component snapshots; distinct overdue invoice counts need a separate invoice-grain reduction and must not count installments twice. No shared snapshot behavior is changed in this delivery.

Planned precise identities: `receivables_gross_outstanding_amount`, `receivables_current_amount`, `receivables_overdue_amount`, `receivables_overdue_1_30_amount`, `receivables_overdue_31_90_amount`, `receivables_overdue_over_90_amount`, `receivables_missing_due_date_amount`, `receivables_missing_due_date_count`. These are documentation candidates, **not runtime IDs**. Generic existing IDs remain unchanged until equivalence is governed. No new chart, planner vocabulary, dimension, migration, mart release or ingestion/certification system is introduced.

## Observed Odoo mapping and history

All source probes use the authorized tunneled **Odoo 18 `accounting` staging replica**, company 1. Required opening activity through 2026-09-30 is bounded by company, posted state, receivable account and inclusive cutoff; settled lines must be considered because October settlements can make today's residual zero. No unrelated transaction families/history are extracted. Fixed parameterized SELECTs run in repeatable-read READ ONLY transactions, EXPLAIN without ANALYZE, 15s statement/1s lock limits, and rollback. Raw detail stays in mode-0600 files in a mode-0700 private `/tmp` directory.

| Source model / table | Fields and responsibility | Classification |
| --- | --- | --- |
| `account.move.line` / `account_move_line` | `id`, `move_id`, `partner_id`, `company_id`, `account_id`, `date`, `date_maturity`, `balance`, `amount_residual`, `amount_currency`, `currency_id` | Standard Odoo fields; observed base metadata |
| `account.move` / `account_move` | `id`, `company_id`, `state`, `move_type`, `date`; `reversed_entry_id` observed for reversal lineage | Standard; current posted-state eligibility |
| `account.account` / `account_account` | `id`, `account_type='asset_receivable'` | Standard account eligibility; line and move company checked |
| `account.partial.reconcile` / `account_partial_reconcile` | `id`, `company_id`, `debit_move_id`, `credit_move_id`, `amount`, `max_date`; transaction-side amounts observed in metadata | Standard; company-currency settlement and stable link identity |
| `account.payment` / `account_payment` | `move_id`, `company_id`, `payment_type`, `partner_type` | Standard payment linkage; inbound/customer counterpart evidence, no workflow invocation |
| `res.company`, `res.currency` / `res_company`, `res_currency` | company `id`, `currency_id`; currency `id`, `name`, `rounding` | Standard; company 1 IQD precision `0.001` |
| Independent control derivation | residual-at-cutoff, bucket, grouping, component settlement counts | Derived SQL; no production metric implementation used |

Historical reconstruction starts from original company balance and subtracts debit-side/adds credit-side matched amounts with **`max_date <= cutoff`**. Odoo 18 computes `max_date` as the later accounting date of the matched ledger sides and explicitly uses it for aged receivable/payable reports; technical `create_date` is not used. [Official Odoo implementation](https://github.com/odoo/odoo/blob/18.0/addons/account/models/account_partial_reconcile.py). This upstream rule is checked against staging, rather than presumed to establish custom behavior.

The 12:36:17.295 UTC source probe observes **146,197** relevant partial links: zero effective-date mismatches, cross-company links, unposted sides or invalid amounts; **25** links are after cutoff. Across **188,713** eligible components, all reconstructed current balances equal stored current residual at observed company precision. There are 3,234 raw decimal differences, maximum `0.000000001 IQD`, and **zero accounting-precision differences**. These are precision artifacts, not an approved reconciliation tolerance. Each reconstructed component is rounded using observed company currency rounding before aggregation. No arbitrary tolerance is introduced.

Original balance/current reconciliation history can be changed or deleted in Odoo, and standard field metadata does not prove absence of custom FIFO overrides. Finance/source owner must confirm the reconstructed historical position and accepted exceptions; this control does not claim immutable ERP event history. Corrected/reversed source activity requires a new frozen candidate release and append-only reconciliation; do not revise existing September evidence.

## Independent candidate control

The user's corrected workflow makes engineering responsible for preparing expected control data. Finance confirms that artifact; it is not required to prepare the extraction manually. [`odoo-receivables-control.mjs`](../../scripts/integration/odoo-receivables-control.mjs) and its separate [SQL](../../scripts/integration/receivables-control-query.ts) use only source tables and never import mart/runtime/semantic implementations. This independent control is not a parallel ingestion system. Synthetic PostgreSQL fixtures exercise the query directly, independently of developer environments and customer data.

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning \
  scripts/integration/odoo-receivables-control.mjs operator-env /tmp/private-new-review-directory
```

Label: **CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION**. Company 1; cutoff **2026-09-30**; sourceAsOf **2026-10-06T12:53:16.128Z**. No Finance owner/date or authoritative confirmed total is fabricated.

| Candidate output | IQD amount | Open components |
| --- | ---: | ---: |
| Gross Open Receivables | 1,532,751,636.390000 | 3,864 |
| Current / Not Yet Overdue | 760,615,731.130000 | 1,458 |
| 1–30 Days Overdue | 239,405,751.700000 | 471 |
| 31–90 Days Overdue | 94,315,000.660000 | 236 |
| >90 Days Overdue | 227,502,606.690000 | 380 |
| Missing Due Date Amount / Count | 210,912,546.210000 | 1,319 |
| Overdue total (three overdue buckets) | 561,223,359.050000 | 1,087 |

Bucket and customer sums equal gross exactly using integer six-decimal arithmetic. **2,039** stable technical customer references are represented; **zero** positive open components have a missing customer. The broader eligible history has 124 missing customer identities, which cannot be silently turned into a new customer/group mapping.

**1,324** partially reconciled positive components have original balance **1,110,784,750.180000 IQD**, reconciled value **487,540,409.800000 IQD**, and remaining residual **623,244,340.380000 IQD**. Of those, **929** have inbound/customer payment linkage, with **384,988,016.310000 IQD** applied payments and **287,094,234.100000 IQD** remaining residual. **155** positive open components include applied credit notes totaling **19,327,749.940000 IQD**. These populations overlap; they must not be added as exclusive counts. This does not assert that every accounting offset is a cash payment. **1,378** separate negative open components total **−173,290,543.780000 IQD**: journal/payment/advance components **−172,487,293.810000**, credit-note components **−803,249.970000**. Separate advance versus credit classification and write-off reasons are not inferred.

The private review includes summary, buckets, all 2,039 customer totals, limited representative and fully settled samples, all 1,319 missing-maturity exceptions, source lineage/quality/plans and blank Finance confirmation fields. No customer names, phone numbers, addresses or invoice narratives are included. No record was rejected or excluded as ambiguous in the completed control: zero current-residual discrepancies, invalid reconciliation/date components, missing transaction currencies or company-currency failures. Extraction output is bounded at 10,000 nonzero components and completeness checked against independent full population counts. Material ambiguity fails the control instead of silently dropping records.

No invoice with multiple maturity components is observed in this cutoff population; synthetic tests cover it. Three source components have USD transaction lineage, with **zero** positive USD open components at cutoff. The report handler model `account.aged.receivable.report.handler` exists in metadata, but the SQL replica exposes neither its executable code nor a report export. No equality with the standard report is claimed. Missing maturity fallback or customer netting in an external report must be explicitly reconciled to v1 rather than copied silently.

## Certification and remaining delivery

| Output set | Source mapping | Extracted | Reconciled | Certified / published | Supported production dimensions |
| --- | --- | --- | --- | --- | --- |
| Gross/current/three overdue buckets/missing amount and count/overdue total | Candidate source method validated at source precision | Independent control only; no mart facts | Exact internal bucket/customer invariants and current source residual check; Finance control pending | No / No | None |
| Overdue invoice/receivable counts | Components available; invoice-grain business reduction not certified | Independent component counts only | Pending exact distinct-invoice controls | No / No | None |

After Finance confirms, record owner, actual approval date, `receivables-aging-v1`, confirmed totals, exceptions, source/control reference and tolerance. Then use the existing mapping-release/writer/reconciliation/certification/serving lifecycle for production canonical extraction and technical comparison against this independent confirmed control. Production facts, canonical metric registration, mart reconciliation, certification, publication and authenticated dashboard QA remain pending. Customer publication requires its own reconciled membership/group controls. Month, branch, region and other dimensions remain unpublished; no source-column existence grants availability.

No push/merge, source mutation, legacy system change, global timeout weakening, authentication/dashboard persistence/planner contract change, old mapping/certification rewrite or unrelated serving binding change is authorized or performed. The delivery report records final commits and verification separately. Browser dashboard verification is not applicable until availability changes; viewing the Finance artifact is distinct evidence.
