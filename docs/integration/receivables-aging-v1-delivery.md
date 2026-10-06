# Receivables Aging v1 — delivery and Finance-review handoff

**Control preparation complete; production metric delivery pending Finance confirmation.** The user's workflow correction authorizes engineering to prepare an independent candidate source control. Finance need not manually prepare the data. The candidate is not an authoritative confirmed control, and no production metric is business-certified or published.

## Repository state

Starting branch: `codex/production-pilot-lifecycle`. Starting HEAD: `167e3d9962290c1ff8a07c7f54dae511b58ee2d6`.

Created commits:

- `0ebbe20`: only the three original Wave 2 discovery artifacts.
- `847e0c0`: Receivables Aging v1 working definition and scoped decision updates.
- `e63a6ad`: existing engine/PostgreSQL receivable characterization tests.
- Following commit: independent source-control query, runner/probe, synthetic contract tests, final control fingerprint and this report. Exact final HEAD is reported in the delivery response.

Unrelated original edits to `.env.example`, Odoo API/data source files/tests and `docs/integration/odoo-postgres-pilot.md`, plus `.archify/`, are preserved. No environment credentials or component/customer extracts enter Git. Push: **No**. Merge: **No**. CI: not run; nothing pushed.

## Business definition

[Exact policy and observed mapping](receivables-aging-v1.md) records `IMPLEMENTATION_APPROVED_V1`, **not** Finance Manager sign-off. The independent control uses due-date aging, due-today current, exclusive 1–30/31–90/>90 buckets, residual-based partial settlement, individual receivable/maturity components, applied-credit reductions, separate unapplied credits/advances, explicit missing-date amount/component count, inclusive accounting-date cutoff, reconstructed historical residual and IQD recognized company amounts. It excludes draft/cancelled/nonreceivable activity, includes legal receivable tax, does not exclude disputes, and follows posted accounting settlement for write-offs. No 70% rule, maturity fallback, discretionary credit allocation, invented dispute flag or dashboard FX is implemented.

Existing generic `outstanding_amount`/`overdue_amount` recipes and the current invoice-only Wave 1 helper are unchanged. Characterization demonstrates why neither can silently stand for the new historical gross-ledger meaning. Future precise snapshot candidates are documented; **no new canonical/runtime metric IDs or planner contracts are registered**. Shared carry-forward semantics remain unchanged; production snapshots must include explicit zero closure/bucket complements and exact covered cutoff authorization.

## Independent control and source evidence

Source: approved read-only Odoo 18 `accounting` staging replica, **Company 1**. Accounting cutoff: **2026-09-30**, end-of-date Asia/Baghdad. Final sourceAsOf: **2026-10-06T12:53:16.128Z**. Definition: **receivables-aging-v1**. No production mapping release exists for this control; the September event release is unchanged.

Historical residual is original `account_move_line.balance` minus debit-side/add credit-side `account_partial_reconcile.amount` where `max_date <= cutoff`. `max_date` is independently checked against the later accounting date of both posted ledger sides. Technical row creation timestamps and today's residual are never historical inputs. Current residual is used only as a validation control. Round each component using `res_currency.rounding` (observed IQD 0.001), then sum exactly with six-decimal integers. This is source accounting precision, not an invented reconciliation tolerance.

Source fields/models and standard/custom/derived distinctions are tabulated in the owning policy document. The independent script imports only its own control SQL and Node/pg facilities; it does not call the mart, semantic engine, production mapper, dashboard or AI planner. Fixed queries are company/cutoff/posted/account scoped, RR READ ONLY, EXPLAIN without ANALYZE, 15s statement/1s lock limits, rollback. Nonzero detail bound 10,000; independent population counts prevent truncation. Negative residuals remain separate.

**CANDIDATE CONTROL — PENDING FINANCE CONFIRMATION**:

| Output | Candidate IQD amount | Open components |
| --- | ---: | ---: |
| Gross Open Receivables | 1,532,751,636.390000 | 3,864 |
| Current / Not Yet Overdue | 760,615,731.130000 | 1,458 |
| 1–30 Days Overdue | 239,405,751.700000 | 471 |
| 31–90 Days Overdue | 94,315,000.660000 | 236 |
| >90 Days Overdue | 227,502,606.690000 | 380 |
| Missing Due Date Amount / Count | 210,912,546.210000 | 1,319 |
| Overdue total | 561,223,359.050000 | 1,087 |

There are 2,039 customers, zero unknown customers among positive open components. All 2,039 customer totals and all 1,319 missing-date exceptions are in the private HTML/JSON artifact, with 18 representative sample rows and no names, addresses, phone numbers or narratives. Component/source IDs provide technical lineage only. Artifact JSON SHA-256: `a8f6a00eab4fef2b1b9ff8924ba1a4dd89847c3c86ed83a57aa651d799751848`.

Partial settlement: 1,324 partially reconciled open components; original **1,110,784,750.180000**, reconciled **487,540,409.800000**, remaining **623,244,340.380000 IQD**. Of these, 929 are linked to inbound customer payments; applied payment value **384,988,016.310000**, remaining residual **287,094,234.100000 IQD**. Applied credit notes affect 155 positive open components, value **19,327,749.940000 IQD**. These settlement populations overlap.

Unapplied negative credit/advance components: **1,378**, signed total **−173,290,543.780000 IQD**. Journal/payment/advance components total **−172,487,293.810000**; credit-note components total **−803,249.970000**. Separate advance classification and write-off reason require trusted accounting evidence; no guessed categories are supplied.

Current-source accounting-precision discrepancies: **0**. Ambiguous/rejected components: **0**. Missing transaction currencies/company currency failures: **0**. Twenty-one positive open components have later settlement links. Multiple invoice maturity components: no live examples in this bounded population; synthetic tests cover them. USD lineage: three source components, no positive USD open component at cutoff.

## Reconciliation, certification and metrics

Bucket sum and customer sum equal candidate gross exactly. Expected authoritative confirmed total: **pending**. Production mart actual total: **not extracted**. Finance reconciliation tolerance: **pending**, not guessed. Independent current-source residual validation passes at currency precision; this does not certify the business cutoff/control.

The standard `account.aged.receivable.report.handler` model is observed in metadata. Its executable report/output is unavailable through this SQL replica, so no standard-report equality is claimed. Finance/source owner must confirm gross positive opening/journal scope, missing-date exceptions, history/reconciliation corrections and any custom allocation behavior. Current links can be changed/deleted; upstream Odoo code and source agreement are not proof of immutable historical event history.

| Metric candidate | Source validated | Extracted into mart | Reconciled to confirmed control | Certified | Published | Production dimensions |
| --- | --- | --- | --- | --- | --- | --- |
| Gross outstanding | Candidate mapping/control | No | Pending | No | No | None |
| Current receivables | Candidate mapping/control | No | Pending | No | No | None |
| 1–30 overdue | Candidate mapping/control | No | Pending | No | No | None |
| 31–90 overdue | Candidate mapping/control | No | Pending | No | No | None |
| >90 overdue | Candidate mapping/control | No | Pending | No | No | None |
| Missing due-date amount | Candidate mapping/control | No | Pending | No | No | None |
| Missing due-date component count | Candidate mapping/control | No | Pending | No | No | None |
| Overdue amount | Candidate aggregate/control | No | Pending | No | No | None |
| Overdue invoice/receivable count | Component counts available; distinct invoice semantics not certified | No | Pending | No | No | None |

After Finance confirms, record actual Finance owner/date, definition version, confirmed totals/control reference, accepted exceptions and tolerance. Use this independent confirmed artifact as expected values for the existing immutable mapping/writer/reconciliation/certification lifecycle. Then complete production extraction, metric registration, source-to-mart reconciliation, separately certified dimensions, publication and authenticated UI verification. Customer/month/branch/region are not exposed by this delivery.

## Verification

All required gates passed locally:

- Frozen install: pass after sandbox DNS restrictions required registry access; no lockfile changes.
- Lint: pass.
- Architecture: pass, zero diagnostics.
- Quality: pass, zero diagnostics; no baseline/threshold changes.
- Full monorepo typecheck: pass (`tsc --noEmit` plus web project typecheck).
- Complete unit/API suite: **617 pass, 0 fail, 0 skipped**.
- Complete PostgreSQL 18.6 suite: **112 pass, 0 fail, 0 skipped**, disposable synthetic `foundation_test` only.
- Final independent-control PostgreSQL test rerun: **1 pass, 0 fail, 0 skipped** after the last SQL validity changes.
- API/web build: pass; existing nonblocking Vite large-chunk warning remains.
- Diff gate: pass, zero diagnostics.

Coverage includes every aging boundary (tomorrow/today/1/30/31/90/91/missing), partial/full/unpaid balances, installment identities, applied/unapplied credits, payments/write-offs before/on/after cutoff, foreign transaction lineage/company amount, company/tenant isolation, unsupported grouping and unknown tenant denial. These tests use synthetic PostgreSQL fixtures and never load developer/source env files. Live source probing is reported separately.

Private artifact content/authority label, 5,242 nonzero component details, 2,039 customer groups, all 1,319 missing-date exceptions and exact bucket/customer sums were independently checked. Files are mode 0600 in a mode 0700 directory outside Git. Manual dashboard browser verification: **not run/not applicable**, no publication or web behavior changed. Attempted artifact browser preview timed out; no visual-rendering pass is claimed. The saved HTML remains available for review.

Read-only before/after preservation check exactly matches existing pilot/staging mapping metadata, all eight September lifecycle-table fingerprints, original 308 reconciliation rows and serving bindings. Full regression suites retain invoice/refund/average controls, identity, persistence and planner behavior.

## Explicit regression answers

| Question | Answer |
| --- | --- |
| Order Revenue changed? | No |
| Net Invoiced Revenue changed? | No |
| Order Margin conflated with Accounting Gross Profit? | No |
| Existing certifications rewritten? | No |
| Unsupported customer/month/branch capability exposed? | No |
| Odoo mutated? | No |
| Legacy production system changed? | No |
| Authentication changed? | No |
| Historical certification fingerprints changed? | No |
| Global statement timeout weakened? | No |
| Push performed? | No |
| Merge performed? | No |
